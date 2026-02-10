from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from config import settings
from routers import auth, providers, cloud_accounts, requests, approvals, admin, statistics, terraform
from seed_data import seed

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="YakkAI - Multi-Cloud Infrastructure Platform",
    description="Self-service platform for provisioning cloud infrastructure across AWS, Azure, GCP, OCI, and VMware",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(providers.router)
app.include_router(cloud_accounts.router)
app.include_router(requests.router)
app.include_router(approvals.router)
app.include_router(admin.router)
app.include_router(statistics.router)
app.include_router(terraform.router)


@app.get("/")
def root():
    return {"name": "YakkAI API", "version": "1.0.0", "status": "running"}


@app.on_event("startup")
def startup_event():
    seed()
