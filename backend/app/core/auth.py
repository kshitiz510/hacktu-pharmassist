"""Clerk JWT verification and user authentication for FastAPI.

Verifies Clerk-issued JWTs using the JWKS endpoint derived from
the publishable key. Provides a FastAPI dependency (`get_current_user`)
that protects routes and upserts user records on first access.
"""

import base64
import time
from typing import Optional

import jwt
import requests
from fastapi import Depends, HTTPException, Request
from jwt import PyJWKClient, PyJWKClientError

from app.core.config import CLERK_PUBLISHABLE_KEY
from app.core.db import DatabaseManager, get_db


# ---------------------------------------------------------------------------
# Clerk JWKS client (caches keys automatically via PyJWT's built-in cache)
# ---------------------------------------------------------------------------

def _derive_frontend_api(publishable_key: str) -> str:
    """Derive Clerk Frontend API URL from the publishable key.

    The key format is ``pk_{env}_{base64(frontendApi$)}``.
    """
    parts = publishable_key.split("_", 2)
    if len(parts) < 3:
        raise ValueError("Invalid CLERK_PUBLISHABLE_KEY format")
    decoded = base64.b64decode(parts[2] + "==").decode("utf-8").rstrip("$")
    return decoded


def _build_jwks_url() -> str:
    if not CLERK_PUBLISHABLE_KEY:
        raise RuntimeError(
            "CLERK_PUBLISHABLE_KEY is not set. "
            "Add it to backend/.env (copy from Clerk dashboard → API Keys)."
        )
    frontend_api = _derive_frontend_api(CLERK_PUBLISHABLE_KEY)
    return f"https://{frontend_api}/.well-known/jwks.json"


# Lazy-initialised so the module can be imported even when the key is absent
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(_build_jwks_url(), cache_keys=True, lifespan=3600)
    return _jwks_client


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk session JWT and return its payload.

    Raises ``ValueError`` on any verification failure.
    """
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={
                "verify_aud": False,  # Clerk session tokens may not set aud
                "verify_exp": True,
                "verify_iss": False,  # We trust the JWKS source
            },
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as exc:
        raise ValueError(f"Invalid token: {exc}")
    except PyJWKClientError as exc:
        raise ValueError(f"JWKS key resolution failed: {exc}")


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    db: DatabaseManager = Depends(get_db),
) -> dict:
    """FastAPI dependency that enforces Clerk authentication.

    Returns a dict with at least ``{"userId": "user_xxx", ...}``.

    Usage::

        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            ...
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.split(" ", 1)[1]

    try:
        payload = verify_clerk_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    # Lightweight upsert – creates a user record on first access
    db.upsert_user(user_id)

    return {"userId": user_id, **payload}
