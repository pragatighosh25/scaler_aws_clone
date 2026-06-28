import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import HostedZone, DNSRecord, DNSChange, User
from ..schemas import HostedZoneCreate, HostedZoneResponse, DNSRecordCreate, DNSRecordResponse, DNSChangeResponse
from .auth import get_current_user
from .zones import create_zone, get_zones, get_zone, delete_zone
from .records import create_record, get_records

router = APIRouter(prefix="/2013-04-01/hostedzone", tags=["aws-compatibility"])

@router.get("", response_model=List[HostedZoneResponse])
def aws_get_zones(
    search: Optional[str] = Query(None),
    private_zone: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_zones(search, private_zone, skip, limit, db, current_user)

@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def aws_create_zone(
    zone_in: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_zone(zone_in, db, current_user)

@router.get("/{zone_id}", response_model=HostedZoneResponse)
def aws_get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_zone(zone_id, db, current_user)

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def aws_delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return delete_zone(zone_id, db, current_user)

# --- Resource Record Sets (rrset) ---
@router.get("/{zone_id}/rrset", response_model=List[DNSRecordResponse])
def aws_get_records(
    zone_id: str,
    search: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_records(zone_id, search, type, skip, limit, db, current_user)

@router.post("/{zone_id}/rrset", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
def aws_create_record(
    zone_id: str,
    record_in: DNSRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_record(zone_id, record_in, db, current_user)


change_router = APIRouter(prefix="/2013-04-01/change", tags=["aws-compatibility-changes"])

@change_router.get("/{change_id}", response_model=DNSChangeResponse)
def aws_get_change(
    change_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    change = db.query(DNSChange).filter(DNSChange.id == change_id).first()
    
    # If not found in the DB, dynamically create a mock change record so that visiting any change ID works
    if not change:
        change = DNSChange(
            id=change_id,
            hosted_zone_id="ZUNKNOWN",
            status="PENDING",
            submitted_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=5),
            comment="Mock change"
        )
        db.add(change)
        db.commit()
        db.refresh(change)
        
    # If status is PENDING and submitted more than 15 seconds ago, automatically transition to INSYNC
    if change.status == "PENDING":
        time_elapsed = (datetime.datetime.utcnow() - change.submitted_at).total_seconds()
        if time_elapsed > 15:
            change.status = "INSYNC"
            db.commit()
            db.refresh(change)
            
    return change
