"""Модуль TOTP 2FA"""

import base64
import os

import pyotp
import qrcode


# Настройкт из переменных окружения
TOTP_ISSUER = os.getenv("TOTP_ISSUER", "LiB")
TOTP_VALID_WINDOW = int(os.getenv("TOTP_VALID_WINDOW", "1"))


def generate_secret() -> str:
    """Генерация нового TOTP секрета"""
    return pyotp.random_base32()


def get_provisioning_uri(secret: str, username: str) -> str:
    """Получение URI для QR-кода"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=TOTP_ISSUER)


def verify_totp_code(secret: str, code: str) -> bool:
    """Проверка TOTP кода"""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=TOTP_VALID_WINDOW)


def qr_to_bitmap_b64(data: str) -> dict:
    """Конвертирует данные в QR-код и возвращает как base64 bitmap"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=1,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)

    matrix = qr.get_matrix()
    size = len(matrix)

    bits = []
    for row in matrix:
        for cell in row:
            bits.append(0 if cell else 1)

    padding = (8 - len(bits) % 8) % 8
    bits.extend([0] * padding)

    bytes_array = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for j in range(8):
            byte = (byte << 1) | bits[i + j]
        bytes_array.append(byte)

    b64 = base64.b64encode(bytes_array).decode("ascii")
    return {"size": size, "padding": padding, "bitmap_b64": b64}


def generate_totp_setup(username: str) -> dict:
    """Генерация данных для настройки TOTP"""
    secret = generate_secret()
    uri = get_provisioning_uri(secret, username)
    bitmap_data = qr_to_bitmap_b64(uri)

    return {
        "secret": secret,
        "username": username,
        "issuer": TOTP_ISSUER,
        **bitmap_data,
    }
