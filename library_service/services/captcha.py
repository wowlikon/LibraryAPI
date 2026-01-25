"""Модуль создания и проверки capjs"""

import os
import asyncio
import hashlib
import secrets
import time
from collections import defaultdict

from fastapi import Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

CLEANUP_INTERVAL = int(os.getenv("CAP_CLEANUP_INTERVAL", "10"))
REDEEM_TTL = int(os.getenv("CAP_REDEEM_TTL_SECONDS", "180")) * 1000
CHALLENGE_TTL = int(os.getenv("CAP_CHALLENGE_TTL_SECONDS", "120")) * 1000
MAX_CHALLENGES_PER_IP = int(os.getenv("CAP_MAX_CHALLENGES_PER_IP", "12"))
MAX_TOTAL_CHALLENGES = int(os.getenv("CAP_MAX_TOTAL_CHALLENGES", "1000"))

active_challenges: dict[str, dict] = {}
redeem_tokens: dict[str, int] = {}
challenges_by_ip: defaultdict[str, int] = defaultdict(int)
limiter = Limiter(key_func=get_remote_address)


def now_ms() -> int:
    return int(time.time() * 1000)


def fnv1a_utf16(seed: str) -> int:
    h = 2166136261
    data = seed.encode("utf-16le")
    i = 0
    while i < len(data):
        unit = data[i] + (data[i + 1] << 8)
        h ^= unit
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) & 0xFFFFFFFF
        i += 2
    return h


def prng(seed: str, length: int) -> str:
    state = fnv1a_utf16(seed)
    out = ""
    while len(out) < length:
        state ^= (state << 13) & 0xFFFFFFFF
        state ^= state >> 17
        state ^= (state << 5) & 0xFFFFFFFF
        out += f"{state & 0xFFFFFFFF:08x}"
    return out[:length]


async def cleanup_task():
    while True:
        now = now_ms()
        for token, data in list(active_challenges.items()):
            if data["expires"] < now:
                challenges_by_ip[data["ip"]] -= 1
                del active_challenges[token]
        for token, exp in list(redeem_tokens.items()):
            if exp < now:
                del redeem_tokens[token]
        await asyncio.sleep(CLEANUP_INTERVAL)


def get_ip(request: Request) -> str:
    return get_remote_address(request)


async def require_captcha(request: Request):
    token = request.cookies.get("capjs_token")
    if not token or token not in redeem_tokens or redeem_tokens[token] < now_ms():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail={"error": "captcha_required"}
        )
    del redeem_tokens[token]
