"""
ESM (ECMAScript Module) serving routes.
Serves code files as ES modules with proper MIME types.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.file import FileRepository

router = APIRouter()


# MIME type mapping for different file types
MIME_TYPES = {
    "javascript": "text/javascript",
    "javascriptreact": "text/javascript",
    "jsx": "text/javascript",
    "js": "text/javascript",
    "typescript": "text/javascript",  # Serve TS as JS (assumes it's transpiled or browser understands it)
    "typescriptreact": "text/javascript",
    "tsx": "text/javascript",
    "ts": "text/javascript",
    "json": "application/json",
    "css": "text/css",
    "html": "text/html",
    "xml": "application/xml",
    "txt": "text/plain",
}


@router.get("/{project_id}/{file_id}")
async def serve_esm_module(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve a file as an ESM module with proper MIME type and CORS headers.

    This endpoint allows dynamic imports in the browser:
    ```javascript
    const module = await import('/api/esm/{project_id}/{file_id}');
    ```
    """
    repo = FileRepository(db)

    # Get file
    file = await repo.get_by_id(str(file_id))

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found"
        )

    # Verify file belongs to the specified project
    if str(file.project_id) != str(project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found in project {project_id}"
        )

    # Determine MIME type based on language
    mime_type = MIME_TYPES.get(file.language.lower(), "text/plain")

    # Return file content with proper headers
    return Response(
        content=file.content,
        media_type=mime_type,
        headers={
            "Content-Type": mime_type,
            "Access-Control-Allow-Origin": "*",  # Allow cross-origin imports
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",  # Don't cache during development
            "X-Content-Type-Options": "nosniff",
        }
    )


@router.get("/{project_id}/path/{file_path:path}")
async def serve_esm_module_by_path(
    project_id: UUID,
    file_path: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve a file by its path within a project.

    Example:
    ```javascript
    const module = await import('/api/esm/{project_id}/path/src/components/Button.js');
    ```
    """
    repo = FileRepository(db)

    # Split path into folder and filename
    path_parts = file_path.rsplit("/", 1)
    if len(path_parts) == 2:
        folder_path, file_name = path_parts
    else:
        folder_path = None
        file_name = path_parts[0]

    # Get file by name and path
    file = await repo.get_file_by_name_and_project(
        str(project_id),
        file_name,
        folder_path
    )

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_path} not found in project {project_id}"
        )

    # Determine MIME type
    mime_type = MIME_TYPES.get(file.language.lower(), "text/plain")

    # Return file content with proper headers
    return Response(
        content=file.content,
        media_type=mime_type,
        headers={
            "Content-Type": mime_type,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
        }
    )
