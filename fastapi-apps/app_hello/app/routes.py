"""Hello app routes."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def hello_root():
    """Root hello endpoint."""
    return {"message": "Hello World!"}


@router.get("/hello")
async def hello():
    """Hello endpoint."""
    return {"message": "Hello from FastAPI!"}


@router.get("/hello/{name}")
async def hello_name(name: str):
    """Personalized hello endpoint."""
    return {"message": f"Hello {name}!"}
