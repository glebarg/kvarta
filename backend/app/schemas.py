import re
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


Interest = Literal["subscription", "one_time", "question"]


def normalize_belarus_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    # Поддерживаем +375 29/25/33/44/17 и национальный формат 8 0xx...
    if digits.startswith("80") and len(digits) == 11:
        digits = "375" + digits[2:]
    elif digits.startswith("0") and len(digits) == 10:
        digits = "375" + digits[1:]
    if len(digits) != 12 or not digits.startswith("375"):
        raise ValueError("Введите белорусский номер, например +375 29 123-45-67.")
    operator_code = digits[3:5]
    if operator_code not in {"25", "29", "33", "44", "17"}:
        raise ValueError("Проверьте код белорусского оператора в номере телефона.")
    return "+" + digits


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=32)
    interest: Literal["subscription", "one_time", "question"]
    comment: str | None = Field(default=None, max_length=2000)

    page_url: str | None = Field(default=None, max_length=2048)
    referrer: str | None = Field(default=None, max_length=2048)
    utm_source: str | None = Field(default=None, max_length=255)
    utm_medium: str | None = Field(default=None, max_length=255)
    utm_campaign: str | None = Field(default=None, max_length=255)
    utm_content: str | None = Field(default=None, max_length=255)
    utm_term: str | None = Field(default=None, max_length=255)
    gclid: str | None = Field(default=None, max_length=255)
    yclid: str | None = Field(default=None, max_length=255)

    last_touch_page_url: str | None = Field(default=None, max_length=2048)
    last_touch_at: str | None = Field(default=None, max_length=40)

    first_page_url: str | None = Field(default=None, max_length=2048)
    first_referrer: str | None = Field(default=None, max_length=2048)
    first_utm_source: str | None = Field(default=None, max_length=255)
    first_utm_medium: str | None = Field(default=None, max_length=255)
    first_utm_campaign: str | None = Field(default=None, max_length=255)
    first_utm_content: str | None = Field(default=None, max_length=255)
    first_utm_term: str | None = Field(default=None, max_length=255)
    first_gclid: str | None = Field(default=None, max_length=255)
    first_yclid: str | None = Field(default=None, max_length=255)
    first_touch_at: str | None = Field(default=None, max_length=40)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Укажите имя не короче двух символов")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()
        digits = re.sub(r"\D", "", value)
        if not 7 <= len(digits) <= 15:
            raise ValueError("Укажите корректный номер телефона")
        return value

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class LeadCreated(BaseModel):
    id: int
    message: str
