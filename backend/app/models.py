import datetime
import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    aws_account_id = Column(String, unique=True, nullable=False)

class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, index=True) # e.g. Z0123456789ABC
    name = Column(String, index=True, nullable=False)   # e.g. example.com.
    comment = Column(String, nullable=True)
    private_zone = Column(Boolean, default=False, nullable=False)
    vpc_id = Column(String, nullable=True)
    vpc_region = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # Relationships
    records = relationship("DNSRecord", back_populates="zone", cascade="all, delete-orphan")

class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hosted_zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)   # e.g. www.example.com.
    type = Column(String, nullable=False)               # A, AAAA, CNAME, TXT, MX, etc.
    ttl = Column(Integer, default=300, nullable=False)
    values = Column(String, nullable=False)             # Newline-separated values
    routing_policy = Column(String, default="Simple", nullable=False) # Simple, Weighted
    weight = Column(Integer, nullable=True)             # Optional weight for routing

    # Relationships
    zone = relationship("HostedZone", back_populates="records")


class DNSChange(Base):
    __tablename__ = "dns_changes"

    id = Column(String, primary_key=True, index=True) # e.g. C10072181C0MN66O1UM4I
    hosted_zone_id = Column(String, nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    comment = Column(String, nullable=True)
