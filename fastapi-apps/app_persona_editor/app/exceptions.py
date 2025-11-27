"""
Custom exception classes for the application.
"""

from typing import Any, Optional


class PersonaEditorException(Exception):
    """Base exception for all application errors"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Any] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)


class ResourceNotFoundError(PersonaEditorException):
    """Raised when a requested resource is not found"""

    def __init__(self, resource_type: str, resource_id: str):
        message = f"{resource_type} with id '{resource_id}' not found"
        super().__init__(message=message, status_code=404)
        self.resource_type = resource_type
        self.resource_id = resource_id


class ValidationError(PersonaEditorException):
    """Raised when input validation fails"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, status_code=422, details=details)


class DatabaseError(PersonaEditorException):
    """Raised when a database operation fails"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=message, status_code=500, details=details)


class DuplicateResourceError(PersonaEditorException):
    """Raised when attempting to create a duplicate resource"""

    def __init__(self, resource_type: str, field: str, value: str):
        message = f"{resource_type} with {field}='{value}' already exists"
        super().__init__(message=message, status_code=409)
        self.resource_type = resource_type
        self.field = field
        self.value = value


class UnauthorizedError(PersonaEditorException):
    """Raised when authentication fails"""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=401)


class ForbiddenError(PersonaEditorException):
    """Raised when authorization fails"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=403)


class ServiceUnavailableError(PersonaEditorException):
    """Raised when an external service is unavailable"""

    def __init__(self, service: str, details: Optional[Any] = None):
        message = f"Service '{service}' is unavailable"
        super().__init__(message=message, status_code=503, details=details)
        self.service = service
