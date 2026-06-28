import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import HostedZone, DNSRecord, DNSChange, User
from ..schemas import DNSRecordCreate, DNSRecordUpdate, DNSRecordResponse
from .auth import get_current_user

router = APIRouter(prefix="/api/zones/{zone_id}/records", tags=["records"])

import random
import string

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

def format_record_name(name: str, zone_name: str) -> str:
    name = name.strip()
    zone_name = zone_name.strip()
    if not name or name == "@":
        return zone_name
    
    # If the name already ends with the zone name, ensure it has a trailing dot
    if name.endswith(zone_name):
        if not name.endswith("."):
            return name + "."
        return name
    
    # Append zone name
    full_name = f"{name}.{zone_name}"
    if not full_name.endswith("."):
        full_name += "."
    return full_name

@router.get("", response_model=List[DNSRecordResponse])
def get_records(
    zone_id: str,
    search: Optional[str] = Query(None, description="Search record name or value"),
    type: Optional[str] = Query(None, description="Filter by type (e.g. A, TXT)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    query = db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone_id)
    
    if type:
        query = query.filter(DNSRecord.type == type.upper())
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (DNSRecord.name.like(search_term)) | (DNSRecord.values.like(search_term))
        )

    records = query.offset(skip).limit(limit).all()
    return records

@router.post("", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: str,
    record_in: DNSRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    full_name = format_record_name(record_in.name, zone.name)
    
    # Check if a record with the same name and type already exists
    # (Route53 allows duplicate names for routing policies, but Simple routing should be unique per type)
    if record_in.routing_policy == "Simple":
        existing = db.query(DNSRecord).filter(
            DNSRecord.hosted_zone_id == zone_id,
            DNSRecord.name == full_name,
            DNSRecord.type == record_in.type
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"A record with name '{full_name}' and type '{record_in.type}' already exists."
            )

    new_record = DNSRecord(
        hosted_zone_id=zone_id,
        name=full_name,
        type=record_in.type,
        ttl=record_in.ttl,
        values="\n".join([v.strip() for v in record_in.values if v.strip()]),
        routing_policy=record_in.routing_policy,
        weight=record_in.weight
    )
    db.add(new_record)
    db.commit()
    change_id = log_dns_change(db, zone_id, comment=f"Create record: {new_record.name} ({new_record.type})")
    new_record.change_id = change_id
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put("/{record_id}", response_model=DNSRecordResponse)
def update_record(
    zone_id: str,
    record_id: str,
    record_in: DNSRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify zone and record exist
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    record = db.query(DNSRecord).filter(
        DNSRecord.id == record_id,
        DNSRecord.hosted_zone_id == zone_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if record_in.ttl is not None:
        record.ttl = record_in.ttl
    if record_in.values is not None:
        record.values = "\n".join([v.strip() for v in record_in.values if v.strip()])
    if record_in.routing_policy is not None:
        record.routing_policy = record_in.routing_policy
    if record_in.weight is not None:
        record.weight = record_in.weight

    db.commit()
    change_id = log_dns_change(db, zone_id, comment=f"Update record: {record.name} ({record.type})")
    record.change_id = change_id
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    record = db.query(DNSRecord).filter(
        DNSRecord.id == record_id,
        DNSRecord.hosted_zone_id == zone_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Protection: Do not allow deletion of default NS and SOA records matching the zone name
    if record.name == zone.name and record.type in ["NS", "SOA"]:
        raise HTTPException(
            status_code=400,
            detail=f"Deletion of default {record.type} records for the zone domain is not permitted."
        )

    log_dns_change(db, zone_id, comment=f"Delete record: {record.name} ({record.type})")
    db.delete(record)
    db.commit()
    return None

# --- BIND Import ---
@router.post("/import", response_model=List[DNSRecordResponse])
async def import_bind_file(
    zone_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    content = await file.read()
    lines = content.decode("utf-8").splitlines()

    origin = zone.name
    default_ttl = 300
    records_to_create = []

    # Keep track of the last seen name for records that inherit the name (i.e. start with whitespace)
    last_name = zone.name

    # Basic BIND parsing regex
    # Match: [name] [ttl] [class] <type> <rdata>
    # Note that name, ttl, class are optional and can appear in different combinations.
    # Class is usually IN. Type is A, AAAA, CNAME, MX, TXT, NS, PTR, SRV, CAA.
    record_types = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]
    type_regex = r"\b(" + "|".join(record_types) + r")\b"

    # Multi-line record handling (e.g. text enclosed in parentheses)
    # For now, let's process line-by-line, joining rows where parenthesis opens.
    buffer = ""
    in_parenthesis = False

    processed_lines = []
    for line in lines:
        line_clean = line.split(";")[0].strip() # strip comments
        if not line_clean:
            continue
        
        if "(" in line_clean:
            in_parenthesis = True
            buffer += " " + line_clean.replace("(", "")
            continue
        if ")" in line_clean and in_parenthesis:
            in_parenthesis = False
            buffer += " " + line_clean.replace(")", "")
            processed_lines.append(buffer.strip())
            buffer = ""
            continue
        if in_parenthesis:
            buffer += " " + line_clean
            continue
        
        processed_lines.append(line_clean)

    for line in processed_lines:
        # Check for directives
        if line.startswith("$ORIGIN"):
            parts = line.split()
            if len(parts) >= 2:
                origin = parts[1]
                if not origin.endswith("."):
                    origin += "."
            continue
        if line.startswith("$TTL"):
            parts = line.split()
            if len(parts) >= 2:
                try:
                    # Strip comments or non-digits from TTL (e.g. 1d, 1h, 3600)
                    ttl_str = parts[1]
                    # Simple conversion: if ends with 'd', multiply by 86400, 'h' by 3600, 'm' by 60
                    if ttl_str.endswith("d"):
                        default_ttl = int(ttl_str[:-1]) * 86400
                    elif ttl_str.endswith("h"):
                        default_ttl = int(ttl_str[:-1]) * 3600
                    elif ttl_str.endswith("m"):
                        default_ttl = int(ttl_str[:-1]) * 60
                    else:
                        default_ttl = int(ttl_str)
                except ValueError:
                    pass
            continue

        # Split fields by whitespace
        parts = line.split()
        if not parts:
            continue

        # Check if the first character is whitespace (inheriting the name)
        # Wait, line.split() removes leading whitespace information.
        # Let's inspect the original line string structure to see if it starts with space/tab
        starts_with_whitespace = line.startswith(" ") or line.startswith("\t") or parts[0] in record_types

        # Let's locate the DNS Record Type in the tokens
        type_idx = -1
        for i, token in enumerate(parts):
            if token.upper() in record_types:
                type_idx = i
                break
        
        if type_idx == -1:
            # Not a recognized resource record, skip (like SOA which we initialize ourselves anyway)
            continue

        # Extract record type
        rec_type = parts[type_idx].upper()

        # Rdata (the value) is everything after the type
        rdata = " ".join(parts[type_idx + 1:]).strip()
        # Clean double quotes around TXT records
        if rec_type == "TXT" and rdata.startswith('"') and rdata.endswith('"'):
            rdata = rdata[1:-1]

        # Extract name, ttl
        rec_name = last_name
        rec_ttl = default_ttl

        # If it doesn't start with whitespace and parts[0] is not the type itself
        if not starts_with_whitespace and type_idx > 0:
            name_token = parts[0]
            if name_token == "@":
                rec_name = origin
            else:
                # Format relative/absolute name
                if name_token.endswith("."):
                    rec_name = name_token
                else:
                    rec_name = f"{name_token}.{origin}"
            last_name = rec_name

        # Parse TTL if it exists before the type
        for i in range(type_idx):
            token = parts[i]
            if token.isdigit():
                rec_ttl = int(token)
                break

        # Accumulate records (ignoring default SOA and NS at root if they match zone defaults)
        if rec_name == zone.name and rec_type in ["NS", "SOA"]:
            continue

        records_to_create.append({
            "name": rec_name,
            "type": rec_type,
            "ttl": rec_ttl,
            "value": rdata
        })

    # Group values by (name, type, ttl) to support multi-value records (e.g. multiple A records for www)
    grouped_records = {}
    for r in records_to_create:
        key = (r["name"], r["type"], r["ttl"])
        if key not in grouped_records:
            grouped_records[key] = []
        grouped_records[key].append(r["value"])

    created_records = []
    for (name, rtype, rttl), val_list in grouped_records.items():
        # Check if record already exists to avoid duplication
        existing = db.query(DNSRecord).filter(
            DNSRecord.hosted_zone_id == zone_id,
            DNSRecord.name == name,
            DNSRecord.type == rtype
        ).first()

        if existing:
            # Append new values to existing record
            existing_vals = [v.strip() for v in existing.values.split("\n") if v.strip()]
            for v in val_list:
                if v not in existing_vals:
                    existing_vals.append(v)
            existing.values = "\n".join(existing_vals)
            created_records.append(existing)
        else:
            new_rec = DNSRecord(
                hosted_zone_id=zone_id,
                name=name,
                type=rtype,
                ttl=rttl,
                values="\n".join(val_list),
                routing_policy="Simple"
            )
            db.add(new_rec)
            created_records.append(new_rec)

    db.commit()
    for rec in created_records:
        db.refresh(rec)

    return created_records

# --- BIND/JSON Export ---
@router.get("/export")
def export_records(
    zone_id: str,
    format: str = Query("bind", description="Export format: 'bind' or 'json'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    records = db.query(DNSRecord).filter(DNSRecord.hosted_zone_id == zone_id).all()

    if format.lower() == "json":
        # Return serialized list
        return [DNSRecordResponse.from_orm(r).dict() for r in records]
    
    # Otherwise format as BIND zone file
    bind_lines = []
    bind_lines.append(f"; Zone file exported from AWS Route53 Clone")
    bind_lines.append(f"; Hosted Zone ID: {zone.id}")
    bind_lines.append(f"$ORIGIN {zone.name}")
    bind_lines.append(f"$TTL 300\n")

    # Order records: SOA first, then NS, then others
    records_sorted = sorted(
        records,
        key=lambda r: (0 if r.type == "SOA" else 1 if r.type == "NS" else 2, r.name, r.type)
    )

    for r in records_sorted:
        # Resolve record name relative to origin if possible
        name_str = r.name
        if name_str == zone.name:
            name_str = "@"
        elif name_str.endswith("." + zone.name):
            name_str = name_str[:-len("." + zone.name)]

        values_list = [v.strip() for v in r.values.split("\n") if v.strip()]
        
        for val in values_list:
            # Wrap TXT record values in quotes if they are not already
            if r.type == "TXT" and not (val.startswith('"') and val.endswith('"')):
                val_formatted = f'"{val}"'
            else:
                val_formatted = val

            # Align columns nicely
            bind_lines.append(f"{name_str:<24} {r.ttl:<8} IN  {r.type:<8} {val_formatted}")

    return {"bind_content": "\n".join(bind_lines)}

@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_records(
    zone_id: str,
    record_ids: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, or_(HostedZone.user_id == current_user.id, HostedZone.user_id == None)).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hosted zone not found")

    for rec_id in record_ids:
        record = db.query(DNSRecord).filter(
            DNSRecord.id == rec_id,
            DNSRecord.hosted_zone_id == zone_id
        ).first()
        if record:
            # Protection: Do not allow deletion of default NS and SOA records matching the zone name
            if record.name == zone.name and record.type in ["NS", "SOA"]:
                continue
            log_dns_change(db, zone_id, comment=f"Bulk delete record: {record.name} ({record.type})")
            db.delete(record)
    db.commit()
    return None

