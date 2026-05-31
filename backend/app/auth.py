"""Supabase JWT verification.

The browser authenticates with Supabase (anon key) and sends the resulting access
token as `Authorization: Bearer <jwt>`. We validate it by calling Supabase's
`/auth/v1/user` endpoint (no local JWT secret needed) and return the user.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException

from .config import get_settings


@dataclass
class User:
    id: str
    email: str | None


async def get_current_user(authorization: str = Header(default="")) -> User:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    s = get_settings()
    if not s.supabase_url or not s.supabase_anon_key:
        raise HTTPException(500, "Supabase not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{s.supabase_url}/auth/v1/user",
            headers={"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(401, "Invalid or expired token")
    data = resp.json()
    return User(id=data["id"], email=data.get("email"))


CurrentUser = Depends(get_current_user)
