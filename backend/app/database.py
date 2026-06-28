import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Let's place the database file in the parent backend directory
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(DATABASE_DIR, '..', 'route53.db')}")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
