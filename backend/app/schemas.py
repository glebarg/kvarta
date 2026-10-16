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
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=32)
    interest: Interest
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

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if len(value.strip()) < 2:
            raise ValueError("Введите имя (не менее двух символов).")
        return value.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_belarus_phone(value)

    @field_validator("page_url", "referrer")
    @classmethod
    def validate_url(cls, value: str | None) -> str | None:
        if value and urlparse(value).scheme not in {"http", "https"}:
            raise ValueError("Некорректный адрес страницы.")
        return value


class LeadCreated(BaseModel):
    id: int
    message: str
