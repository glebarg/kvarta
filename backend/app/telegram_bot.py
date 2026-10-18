
import logging

import httpx
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models import Lead, TelegramSubscriber

logger = logging.getLogger(__name__)

INTEREST_LABELS = {
    "subscription": "Подписка",
    "one_time": "Разовый заказ",
    "question": "Вопрос",
}


def _telegram_request(method: str, payload: dict) -> dict:
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")

    response = httpx.post(
        f"https://api.telegram.org/bot{token}/{method}",
        json=payload,
        timeout=settings.telegram_api_timeout,
    )
    response.raise_for_status()

    result = response.json()
    if not result.get("ok"):
        raise RuntimeError(
            result.get("description", "Telegram API returned ok=false")
        )

    return result


def send_chat_message(chat_id: str | int, message: str) -> None:
    _telegram_request(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": message,
            "disable_web_page_preview": True,
        },
    )


def display(value: str | None) -> str:
    return value or "Не определён"


def send_lead_notification(lead: Lead) -> None:
    """Send a lead and its advertising attribution to every subscriber."""
    if not (settings.telegram_bot_token or "").strip():
        return

    created_at = (
        lead.created_at.strftime("%d.%m.%Y %H:%M:%S UTC")
        if lead.created_at
        else "Не указано"
    )

    first_source = lead.first_utm_source or lead.first_referrer
    last_source = lead.utm_source or lead.referrer

    message = (
    "☕ Новая заявка — Кварта\n\n"
    f"Номер заявки: #{lead.id}\n"
    f"Дата: {created_at}\n"
    f"Имя: {lead.name}\n"
    f"Телефон: {lead.phone}\n"
    f"Интерес: {INTEREST_LABELS.get(lead.interest, lead.interest)}\n"
    f"Комментарий: {lead.comment or 'Не указан'}"
)

    with SessionLocal() as db:
        chat_ids = db.scalars(
            select(TelegramSubscriber.chat_id)
        ).all()

    for chat_id in chat_ids:
        try:
            send_chat_message(chat_id, message)
        except Exception:
            # Ошибка в одном чате не мешает отправке остальным.
            logger.exception(
                "Could not send Telegram notification for lead #%s to chat %s",
                lead.id,
                chat_id,
            )
