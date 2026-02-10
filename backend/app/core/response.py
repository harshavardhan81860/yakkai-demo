# core/response.py

from typing import Any, Dict, Optional
from pydantic import BaseModel


class ApiResponse(BaseModel):
    status: str                  # "success" or "error"
    status_code: int
    message: str
    data: Optional[Dict[str, Any]] = None
    dropdown: Optional[Dict[str, Any]] = None

    # ----------------------
    # SUCCESS METHOD
    # ----------------------
    @classmethod
    def success(
        cls,
        message: str = "Success",
        data: Optional[Dict[str, Any]] = None,
        dropdown: Optional[Dict[str, Any]] = None,
        status_code: int = 200,
    ):
        return {
            "status": "success",
            "status_code": status_code,
            "message": message,
            "data": data or {},          # default empty dict
            "dropdown": dropdown,        # default None
        }

    # ----------------------
    # ERROR METHOD
    # ----------------------
    @classmethod
    def error(
        cls,
        message: str = "Error",
        status_code: int = 400,
        data: Optional[Dict[str, Any]] = None,
        dropdown: Optional[Dict[str, Any]] = None,
    ):
        return {
            "status": "error",
            "status_code": status_code,
            "message": message,
            "data": data,                # default None
            "dropdown": dropdown,        # default None
        }


# Backward compatibility (if old imports exist)
success_response = ApiResponse.success
error_response = ApiResponse.error
