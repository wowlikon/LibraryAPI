"""Модуль обработки запросов к llm"""

import asyncio, json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from ollama import AsyncClient

from library_service.settings import get_logger, OLLAMA_URL, ASSISTANT_LLM
from library_service.auth import RequireStaffWS


logger = get_logger()
router = APIRouter(prefix="/llm")
client = AsyncClient(host=OLLAMA_URL)


SYSTEM_PROMPT = """
Ты — ассистент библиотекаря. Помогаешь заполнять карточку книги.

Доступные поля:
- title (строка) — название книги
- description (строка) — описание книги
- page_count (целое число ≥ 1 или null) — количество страниц
- status — ТОЛЬКО ДЛЯ ЧТЕНИЯ, изменять ЗАПРЕЩЕНО

Правила:
1. Используй инструменты для изменения полей книги.
2. Можешь вызывать несколько инструментов за раз.
3. Если пользователь просит изменить status — вежливо откажи.
4. Если page_count задаётся — только целое число ≥ 1.
5. Для очистки поля передавай null.
6. Отвечай кратко и по делу."""


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "set_title",
            "description": "Установить или очистить название книги",
            "parameters": {
                "type": "object",
                "properties": {
                    "value": {
                        "type": ["string", "null"],
                        "description": "Новое название или null для очистки",
                    }
                },
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_description",
            "description": "Установить или очистить описание книги",
            "parameters": {
                "type": "object",
                "properties": {
                    "value": {
                        "type": ["string", "null"],
                        "description": "Новое описание или null для очистки",
                    }
                },
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_page_count",
            "description": "Установить или очистить количество страниц",
            "parameters": {
                "type": "object",
                "properties": {
                    "value": {
                        "type": ["integer", "null"],
                        "minimum": 1,
                        "description": "Количество страниц (≥1) или null для очистки",
                    }
                },
                "required": ["value"],
            },
        },
    },
]


TOOL_TO_TYPE = {
    "set_title": "title",
    "set_description": "description",
    "set_page_count": "page_count",
}


@router.websocket("/book")
async def assist_book(websocket: WebSocket, current_user: RequireStaffWS):
    """WebSocket-ассистент для заполнения карточки книги.

    IN (от клиента):
    {
        "prompt": "текст запроса",
        "fields": {
            "title": "...",
            "description": "...",
            "page_count": 1,
            "status": "..."
        }
    }

    OUT (от сервера, потоково, много сообщений):
    {
        "type": "info" | "thinking" | "title" | "description" | "page_count" | "end",
        "value": "..." | int | null
    }
    """
    await websocket.accept()

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    try:
        if not ASSISTANT_LLM:
            await websocket.close(status.WS_1011_INTERNAL_ERROR, "LLM not available")
            return

        while True:
            request = await websocket.receive_json()
            prompt: str = request["prompt"]
            fields: dict = request.get("fields", {})

            user_content = (
                f"Текущие поля книги:\n"
                f"- title: {fields.get('title', '')!r}\n"
                f"- description: {fields.get('description', '')!r}\n"
                f"- page_count: {fields.get('page_count')!r}\n"
                f"- status: {fields.get('status', '-')!r} (read-only)\n\n"
                f"Запрос: {prompt}"
            )
            messages.append({"role": "user", "content": user_content})

            await _process_llm_loop(websocket, messages)

    except WebSocketDisconnect:
        pass


async def _process_llm_loop(websocket: WebSocket, messages: list[dict]):
    while True:
        assistant_text, tool_calls = await _stream_response(websocket, messages)

        assistant_msg: dict = {"role": "assistant", "content": assistant_text or ""}
        if tool_calls:
            assistant_msg["tool_calls"] = tool_calls
        messages.append(assistant_msg)

        if not tool_calls:
            await websocket.send_json({
                "type": "end",
                "value": "",
            })
            break

        for call in tool_calls:
            func_name = call["function"]["name"]

            raw_args = call["function"].get("arguments", {})
            if isinstance(raw_args, str):
                try:
                    args = json.loads(raw_args)
                except (json.JSONDecodeError, KeyError):
                    args = {}
            elif isinstance(raw_args, dict):
                args = raw_args
            else:
                args = {}

            value = args.get("value")
            msg_type = TOOL_TO_TYPE.get(func_name)

            if msg_type:
                if msg_type == "page_count" and value is not None:
                    if not isinstance(value, int) or value < 1:
                        value = None

                await websocket.send_json({
                    "type": msg_type,
                    "value": value,
                })

                messages.append({
                    "role": "tool",
                    "content": json.dumps({
                        "status": "ok",
                        "field": msg_type,
                        "value": value,
                    }),
                })
            else:
                messages.append({
                    "role": "tool",
                    "content": json.dumps({
                        "status": "error",
                        "message": f"Unknown tool: {func_name}",
                    }),
                })


async def _stream_response(
    websocket: WebSocket,
    messages: list[dict],
) -> tuple[str, list[dict]]:
    """Стримит ответ модели в WebSocket."""
    full_text = ""
    full_thinking = ""
    tool_calls: list[dict] = []
    in_thinking = False

    stream = await client.chat(
        model=ASSISTANT_LLM,
        messages=messages,
        tools=TOOLS,
        stream=True,
    )

    async for chunk in stream:
        message = chunk.get("message", {})

        thinking_content = message.get("thinking", "")
        if thinking_content:
            in_thinking = True
            full_thinking += thinking_content
            await websocket.send_json({
                "type": "thinking",
                "value": thinking_content,
            })

        content = message.get("content", "")
        if content:
            if in_thinking:
                in_thinking = False
            full_text += content
            await websocket.send_json({
                "type": "info",
                "value": content,
            })

        if message.get("tool_calls"):
            tool_calls.extend(message["tool_calls"])

    return full_text, tool_calls
