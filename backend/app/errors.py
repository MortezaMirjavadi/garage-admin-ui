"""Normalized API errors returned to the frontend."""


class ApiError(Exception):
    """An error that should be returned to the client as JSON."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message