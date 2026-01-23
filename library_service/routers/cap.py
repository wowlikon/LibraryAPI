import asyncio
import hashlib
import secrets

from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from library_service.services.captcha import (
    limiter,
    get_ip,
    active_challenges,
    challenges_by_ip,
    MAX_CHALLENGES_PER_IP,
    MAX_TOTAL_CHALLENGES,
    CHALLENGE_TTL,
    REDEEM_TTL,
    prng,
    now_ms,
    redeem_tokens,
)

router = APIRouter(prefix="/cap", tags=["captcha"])


@router.post("/challenge")
@limiter.limit("15/minute")
async def challenge(request: Request, ip: str = Depends(get_ip)):
    if challenges_by_ip[ip] >= MAX_CHALLENGES_PER_IP:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many challenges"
        )
    if len(active_challenges) >= MAX_TOTAL_CHALLENGES:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Server busy"
        )

    token = secrets.token_hex(25)
    redeem = secrets.token_hex(25)
    expires = now_ms() + CHALLENGE_TTL

    active_challenges[token] = {
        "c": 50,
        "s": 32,
        "d": 4,
        "expires": expires,
        "redeem_token": redeem,
        "ip": ip,
    }
    challenges_by_ip[ip] += 1

    return {"challenge": {"c": 50, "s": 32, "d": 4}, "token": token, "expires": expires}


@router.post("/redeem")
@limiter.limit("30/minute")
async def redeem(request: Request, payload: dict, ip: str = Depends(get_ip)):
    token = payload.get("token")
    solutions = payload.get("solutions", [])

    if token not in active_challenges:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Invalid challenge"
        )

    ch = active_challenges.pop(token)
    challenges_by_ip[ch["ip"]] -= 1

    if now_ms() > ch["expires"]:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Expired")
    if len(solutions) < ch["c"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Bad solutions"
        )

    def verify(i: int) -> bool:
        salt = prng(f"{token}{i+1}", ch["s"])
        target = prng(f"{token}{i+1}d", ch["d"])
        h = hashlib.sha256((salt + str(solutions[i])).encode()).hexdigest()
        return h.startswith(target)

    results = await asyncio.gather(
        *(asyncio.to_thread(verify, i) for i in range(ch["c"]))
    )
    if not all(results):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid solution"
        )

    r_token = ch["redeem_token"]
    redeem_tokens[r_token] = now_ms() + REDEEM_TTL

    resp = JSONResponse(
        {"success": True, "token": r_token, "expires": redeem_tokens[r_token]}
    )
    resp.set_cookie(
        key="capjs_token",
        value=r_token,
        httponly=True,
        samesite="lax",
        max_age=REDEEM_TTL // 1000,
    )
    return resp
