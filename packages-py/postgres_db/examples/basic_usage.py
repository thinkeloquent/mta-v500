"""Basic usage example for postgres_db package."""

from fastapi import FastAPI, Depends
from sqlalchemy import select, Column, Integer, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import declarative_base

from postgres_db.fastapi import create_db_lifespan_handler, get_db_session

# Define a simple model
Base = declarative_base()


class User(Base):
    """Example User model."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    email = Column(String(100))


# Create FastAPI app with database lifespan
# This will load database config from env_secrets namespace "app_db"
lifespan = create_db_lifespan_handler(
    namespaces=["app_db"],  # Load from env_secrets
    auto_initialize=True,  # Initialize connections at startup
)

app = FastAPI(
    title="PostgresDB Example",
    description="Example FastAPI application using postgres_db package",
    lifespan=lifespan,
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "PostgresDB example is running"}


@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db_session)):
    """
    Get all users from the database.

    Uses the default namespace "app_db" (or DB_DEFAULT_NAMESPACE env var).
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    return {"users": [{"id": u.id, "name": u.name, "email": u.email} for u in users]}


@app.post("/users")
async def create_user(name: str, email: str, db: AsyncSession = Depends(get_db_session)):
    """Create a new user."""
    user = User(name=name, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email}


@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db_session)):
    """Get a specific user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"error": "User not found"}, 404
    return {"id": user.id, "name": user.name, "email": user.email}


# Include debug routes
from app.routes import debug_postgres

app.include_router(debug_postgres.router)


if __name__ == "__main__":
    import uvicorn

    # Before running, ensure you have:
    # 1. Set up env_secrets with "app_db" namespace containing:
    #    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    # 2. Created the users table in your database
    #
    # Run with:
    # uvicorn basic_usage:app --reload

    uvicorn.run(app, host="0.0.0.0", port=8000)
