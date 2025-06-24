from fastapi import APIRouter
import asyncpg

router = APIRouter(
    prefix='/devices'
)
