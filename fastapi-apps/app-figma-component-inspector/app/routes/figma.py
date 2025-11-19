"""
Figma Routes

API endpoints for Figma file and component operations.
"""

from fastapi import APIRouter, HTTPException, Query

from app.logging_config import logger
from app.services.figma_service import get_figma_service

router = APIRouter()


@router.get("/files/{file_id}")
async def get_file(file_id: str):
    """
    Get Figma file structure and metadata.

    Args:
        file_id: Figma file ID

    Returns:
        Figma file data with document tree
    """
    try:
        figma_service = get_figma_service()
        file_data = await figma_service.get_figma_file(file_id)
        return {"success": True, "data": file_data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching Figma file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch Figma file")


@router.get("/images/{file_id}")
async def get_images(
    file_id: str,
    nodeIds: str = Query(..., description="Comma-separated node IDs"),
    scale: float = Query(2.0, ge=0.01, le=4.0, description="Image scale"),
    format: str = Query("png", pattern="^(jpg|png|svg|pdf)$", description="Image format"),
):
    """
    Get rendered component images.

    Args:
        file_id: Figma file ID
        nodeIds: Comma-separated node IDs
        scale: Image scale (0.01-4.0)
        format: Image format (jpg, png, svg, pdf)

    Returns:
        Map of node IDs to image URLs
    """
    try:
        # Parse comma-separated node IDs
        node_ids_list = [nid.strip() for nid in nodeIds.split(",") if nid.strip()]
        
        if not node_ids_list:
            raise HTTPException(status_code=400, detail="nodeIds parameter cannot be empty")

        figma_service = get_figma_service()
        images_data = await figma_service.get_component_images(
            file_id, node_ids_list, scale, format
        )
        return {"success": True, "data": images_data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching component images for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch component images")


@router.get("/variables/{file_id}")
async def get_variables(file_id: str):
    """
    Get design tokens/variables from file.

    Args:
        file_id: Figma file ID

    Returns:
        Array of design variables
    """
    try:
        figma_service = get_figma_service()
        variables = await figma_service.get_file_variables(file_id)
        return {"success": True, "data": variables}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching variables for {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch variables")


@router.get("/node/{file_id}/{node_id}")
async def get_node(file_id: str, node_id: str):
    """
    Get specific node details with extracted properties.

    Args:
        file_id: Figma file ID
        node_id: Node ID

    Returns:
        Node data with extracted CSS-like properties
    """
    try:
        figma_service = get_figma_service()
        
        # Get file to access document tree
        file_data = await figma_service.get_figma_file(file_id)
        
        # Find the specific node
        node = figma_service.find_node_by_id(file_data.document, node_id)
        
        if not node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found in file {file_id}")
        
        # Extract properties
        properties = figma_service.extract_component_properties(node)
        
        return {
            "success": True,
            "data": {
                "node": node,
                "properties": properties,
            },
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching node {node_id} from file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch node")


@router.get("/components/{file_id}")
async def get_components(file_id: str):
    """
    Get all component nodes from file.

    Args:
        file_id: Figma file ID

    Returns:
        Array of all component nodes
    """
    try:
        figma_service = get_figma_service()
        
        # Get file to access document tree
        file_data = await figma_service.get_figma_file(file_id)
        
        # Extract all component nodes
        components = figma_service.get_all_component_nodes(file_data.document)
        
        return {
            "success": True,
            "data": components,
            "count": len(components),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching components from file {file_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch components")
