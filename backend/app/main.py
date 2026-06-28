from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, zones, records, aws_compat

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Programmatically add user_id column if missing (SQLite compatible)
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("PRAGMA table_info(hosted_zones)")).fetchall()
    cols = [r[1] for r in res]
    if "user_id" not in cols:
        conn.execute(text("ALTER TABLE hosted_zones ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
        conn.commit()

app = FastAPI(
    title="AWS Route53 Clone API",
    description="Backend API for managing Hosted Zones and DNS Records in SQLite",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend origin (e.g. http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(records.router)
app.include_router(aws_compat.router)
app.include_router(aws_compat.change_router)


@app.get("/")
def read_root():
    return {
        "message": "Welcome to the AWS Route53 Clone API!",
        "status": "healthy"
    }
