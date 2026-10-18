
from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_phone_created_at", "phone_normalized", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    phone_normalized: Mapped[str] = mapped_column(String(16), nullable=False)
    interest: Mapped[str] = mapped_column(String(32), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Текущая страница формы и last-touch.
    page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(255), nullable=True)
    utm_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gclid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    yclid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_touch_page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    last_touch_at: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # First-touch: первая точка входа посетителя.
    first_page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    first_referrer: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    first_utm_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_utm_medium: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_utm_campaign: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_utm_content: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_utm_term: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_gclid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_yclid: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_touch_at: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class TelegramSubscriber(Base):
    __tablename__ = "telegram_subscribers"
    __table_args__ = (
        UniqueConstraint("chat_id", name="uq_telegram_subscribers_chat_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    chat_id: Mapped[str] = mapped_column(String(64), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
