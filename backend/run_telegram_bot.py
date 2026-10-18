"""Run with: python run_telegram_bot.py (from the backend directory)."""
import logging
import time

import httpx
from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import TelegramSubscriber  # noqa: F401 - registers the model with SQLAlchemy
from app.telegram_bot import send_chat_message

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("kvarta.telegram_polling")

POLL_TIMEOUT = 25
RETRY_DELAY = 3


def telegram_call(client: httpx.Client, method: str, payload: dict | None = None) -> dict:
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        raise RuntimeError("Заполни TELEGRAM_BOT_TOKEN в backend/.env")

    response = client.post(
        f"https://api.telegram.org/bot{token}/{method}",
        json=payload or {},
        timeout=POLL_TIMEOUT + settings.telegram_api_timeout,
    )
    response.raise_for_status()
    result = response.json()
    if not result.get("ok"):
        raise RuntimeError(result.get("description", f"Telegram API error in {method}"))
    return result


def save_subscriber(chat_id: str, username: str | None, first_name: str | None) -> bool:
    """Persist a chat. Return True if it was newly registered."""
    with SessionLocal() as db:
        subscriber = db.scalar(
            select(TelegramSubscriber).where(TelegramSubscriber.chat_id == chat_id)
        )
        if subscriber:
            subscriber.username = username
            subscriber.first_name = first_name
            db.commit()
            return False

        db.add(
            TelegramSubscriber(
                chat_id=chat_id,
                username=username,
                first_name=first_name,
            )
        )
        db.commit()
        return True


def main() -> None:
    if not (settings.telegram_bot_token or "").strip():
        raise SystemExit("Ошибка: заполни TELEGRAM_BOT_TOKEN в backend/.env")

    # The API and this polling process share the same database.
    Base.metadata.create_all(bind=engine)
    offset: int | None = None
    logger.info("Telegram bot started. Open the bot and send /start to subscribe.")

    with httpx.Client() as client:
        while True:
            try:
                payload: dict = {"timeout": POLL_TIMEOUT, "allowed_updates": ["message"]}
                if offset is not None:
                    payload["offset"] = offset
                updates = telegram_call(client, "getUpdates", payload).get("result", [])

                for update in updates:
                    offset = update["update_id"] + 1
                    message = update.get("message") or {}
                    chat = message.get("chat") or {}
                    text = (message.get("text") or "").strip()
                    chat_id = chat.get("id")

                    # Only private chats are subscribed; groups are ignored.
                    if chat.get("type") != "private" or chat_id is None:
                        continue

                    command = text.split(maxsplit=1)[0].split("@", maxsplit=1)[0].lower() if text else ""
                    if command == "/start":
                        is_new = save_subscriber(
                            chat_id=str(chat_id),
                            username=(message.get("from") or {}).get("username"),
                            first_name=(message.get("from") or {}).get("first_name"),
                        )
                        reply = (
                            "Готово! Вы подписались на уведомления о новых заявках «Кварта»."
                            if is_new
                            else "Вы уже подписаны на уведомления о новых заявках «Кварта»."
                        )
                        try:
                            send_chat_message(chat_id, reply)
                        except Exception:
                            logger.exception("Could not send /start confirmation to chat %s", chat_id)
                        logger.info("Subscriber %s processed (/start)", chat_id)
                    elif command == "/stop":
                        with SessionLocal() as db:
                            subscriber = db.scalar(
                                select(TelegramSubscriber).where(
                                    TelegramSubscriber.chat_id == str(chat_id)
                                )
                            )
                            if subscriber:
                                db.delete(subscriber)
                                db.commit()
                        try:
                            send_chat_message(chat_id, "Вы отписались от уведомлений «Кварта».")
                        except Exception:
                            logger.exception("Could not send /stop confirmation to chat %s", chat_id)
            except KeyboardInterrupt:
                logger.info("Telegram bot stopped.")
                break
            except Exception:
                logger.exception("Telegram polling failed; retrying in %s seconds", RETRY_DELAY)
                time.sleep(RETRY_DELAY)


if __name__ == "__main__":
    main()
