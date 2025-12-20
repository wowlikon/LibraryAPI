"""Модуль перечислений (Enums)"""
from enum import Enum

class BookStatus(str, Enum):
    """Статусы книги"""
    ACTIVE = "active"           
    BORROWED = "borrowed"       
    RESERVED = "reserved"       
    RESTORATION = "restoration" 
    WRITTEN_OFF = "written_off" 