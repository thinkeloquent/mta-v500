"""Models for Variables API."""
from typing import Dict, List, Any
from pydantic import Field

from ..models import FigmaBaseModel, Variable as BaseVariable, VariableCollection


class LocalVariablesResponse(FigmaBaseModel):
    """Response from local variables endpoint."""

    status: int
    error: bool
    meta: Dict[str, Any]


class PublishedVariablesResponse(FigmaBaseModel):
    """Response from published variables endpoint."""

    status: int
    error: bool
    meta: Dict[str, Any]
    variable_collections: Dict[str, VariableCollection] = Field(alias="variableCollections")
    variables: Dict[str, BaseVariable]
