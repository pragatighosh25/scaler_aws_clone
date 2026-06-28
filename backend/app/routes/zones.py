import random
import string
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import HostedZone, DNSRecord, DNSChange, User
from ..schemas import HostedZoneCreate, HostedZoneUpdate, HostedZoneResponse
from .auth import get_current_user

router = APIRouter(prefix="/api/zones", tags=["zones"])

def log_dns_change(db: Session, zone_id: str, comment: Optional[str] = None) -> str:
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=19))
    change_id = f"C{suffix}"
    
    change = DNSChange(
        id=change_id,
        hosted_zone_id=zone_id,
        status="PENDING",
        comment=comment
    )
    db.add(change)
    db.commit()
    return change_id

def generate_hosted_zone_id() -> str:
    # Route53 Zone IDs start with Z followed by 12-14 alphanumeric chars
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=13))
    return f"Z{suffix}"

def get_mock_ns_servers() -> List[str]:
    # Mock AWS Route53 nameservers
    num = random.randint(10, 2000)
    return [
        f"ns-{num}.awsdns-{random.randint(10, 99)}.com.",
        f"ns-{num + 1}.awsdns-{random.randint(10, 99)}.net.",
        f"ns-{num + 2}.awsdns-{random.randint(10, 99)}.org.",
        f"ns-{num + 3}.awsdns-{random.randint(10, 99)}.co.uk."
    ]

@router.get("", response_model=List[HostedZoneResponse])
def get_zones(
    search: Optional[str] = Query(None, description="Search domain names"),
    private_zone: Optional[bool] = Query(None, description="Filter private/public"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    query = db.query(HostedZone).filter(or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None))
    if search:
        query = query.filter(HostedZone.name.contains(search))
    if private_zone is not None:
        query = query.filter(HostedZone.private_zone == private_zone)
    
    zones = query.offset(skip).limit(limit).all()
    
    # Calculate record counts on the fly and populate response
    response_zones = []
    for zone in zones:
        record_count = db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone.id).count()
        hz_resp = HostedZoneResponse.from_orm(zone)
        hz_resp.record_count = record_count
        response_zones.append(hz_resp)
        
    return response_zones

@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
    
    record_count = db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone.id).count()
    hz_resp = HostedZoneResponse.from_orm(zone)
    hz_resp.record_count = record_count
    return hz_resp

@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone_in: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if zone name already exists
    existing = db.query(HostedZone).filter(HostedZone.name == zone_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Hosted Zone '{zone_in.name}' already exists.")

    zone_id = generate_hosted_zone_id()
    while db.query(HostedZone).filter(HostedZone.id == zone_id).first():
        zone_id = generate_hosted_zone_id()

    new_zone = HostedZone(
        id=zone_id,
        name=zone_in.name,
        comment=zone_in.comment,
        private_zone=zone_in.private_zone,
        vpc_id=zone_in.vpc_id if zone_in.private_zone else None,
        vpc_region=zone_in.vpc_region if zone_in.private_zone else None,
        user_id=current_user.id
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)

    # Initialize default DNS Records: NS and SOA
    ns_servers = get_mock_ns_servers()
    ns_record = DNSRecord(
        hosted_zone_id=zone_id,
        name=zone_in.name,
        type="NS",
        ttl=172800, # Default AWS TTL for NS
        values="\n".join(ns_servers),
        routing_policy="Simple"
    )
    
    soa_value = f"{ns_servers[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    soa_record = DNSRecord(
        hosted_zone_id=zone_id,
        name=zone_in.name,
        type="SOA",
        ttl=900, # Default AWS TTL for SOA
        values=soa_value,
        routing_policy="Simple"
    )

    db.add(ns_record)
    db.add(soa_record)
    db.commit()

    hz_resp = HostedZoneResponse.from_orm(new_zone)
    change_id = log_dns_change(db, zone_id, comment="Create hosted zone")
    hz_resp.record_count = 2
    hz_resp.change_id = change_id
    return hz_resp

@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_zone(
    zone_id: str,
    zone_in: HostedZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
    
    if zone_in.comment is not None:
        zone.comment = zone_in.comment
        
    db.commit()
    db.refresh(zone)
    
    change_id = log_dns_change(db, zone_id, comment="Update hosted zone details")
    record_count = db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone.id).count()
    hz_resp = HostedZoneResponse.from_orm(zone)
    hz_resp.record_count = record_count
    hz_resp.change_id = change_id
    return hz_resp

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")
    
    log_dns_change(db, zone_id, comment="Delete hosted zone")
    db.delete(zone)
    db.commit()
    return None

@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_zones(
    zone_ids: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    for z_id in zone_ids:
        zone = db.query(HostedZone).filter(HostedZone.id == z_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
        if zone:
            log_dns_change(db, z_id, comment="Bulk delete hosted zone")
            db.delete(zone)
    db.commit()
    return None

