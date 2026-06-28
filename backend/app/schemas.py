from pydantic import BaseModel, Field, validator
from typing import List, Optional, Any
from datetime import datetime

# --- Auth Schemas ---
class UserSignup(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    aws_account_id: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    aws_account_id: str
    username: str

# --- DNS Record Schemas ---
class DNSRecordBase(BaseModel):
    name: str # e.g. "www.example.com." or "@"
    type: str # A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA
    ttl: int = Field(300, ge=0)
    values: List[str] # Will be joined with newlines when saving
    routing_policy: str = "Simple"
    weight: Optional[int] = None

    @validator('type')
    def validate_type(cls, v):
        allowed = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Record type must be one of {allowed}")
        return v_upper

class DNSRecordCreate(DNSRecordBase):
    pass

class DNSRecordUpdate(BaseModel):
    ttl: Optional[int] = Field(None, ge=0)
    values: Optional[List[str]] = None
    routing_policy: Optional[str] = None
    weight: Optional[int] = None

class DNSRecordResponse(BaseModel):
    id: str
    hosted_zone_id: str
    name: str
    type: str
    ttl: int
    values: List[str]
    routing_policy: str
    weight: Optional[int] = None
    change_id: Optional[str] = None

    @validator('values', pre=True)
    def parse_values(cls, v):
        if isinstance(v, str):
            return [line.strip() for line in v.split("\n") if line.strip()]
        return v

    class Config:
        from_attributes = True

# --- Hosted Zone Schemas ---
class HostedZoneCreate(BaseModel):
    name: str # e.g. "example.com." or "example.com"
    comment: Optional[str] = ""
    private_zone: bool = False
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

    @validator('name')
    def ensure_trailing_dot(cls, v):
        v = v.strip()
        if not v.endswith('.'):
            return v + '.'
        return v

class HostedZoneUpdate(BaseModel):
    comment: Optional[str] = None

class HostedZoneResponse(BaseModel):
    id: str
    name: str
    comment: Optional[str]
    private_zone: bool
    vpc_id: Optional[str]
    vpc_region: Optional[str]
    created_at: datetime
    record_count: int = 2 # Default is usually NS + SOA
    change_id: Optional[str] = None
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


# --- DNS Change Schemas ---
class DNSChangeResponse(BaseModel):
    id: str
    hosted_zone_id: str
    status: str
    submitted_at: datetime
    comment: Optional[str] = None

    class Config:
        from_attributes = True
