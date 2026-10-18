
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.database import Base, get_db
from app.models import Lead
from app.schemas import LeadCreate, LeadCreated
from app.telegram_bot import send_lead_notification

router = APIRouter(tags=["leads"])
DUPLICATE_WINDOW = timedelta(minutes=10)

# Новые поля, которые нужно добавить в уже существующую SQLite-базу.
TRACKING_COLUMNS = {
    "last_touch_page_url": "VARCHAR(2048)",
    "last_touch_at": "VARCHAR(40)",
    "first_page_url": "VARCHAR(2048)",
    "first_referrer": "VARCHAR(2048)",
    "first_utm_source": "VARCHAR(255)",
    "first_utm_medium": "VARCHAR(255)",
    "first_utm_campaign": "VARCHAR(255)",
    "first_utm_content": "VARCHAR(255)",
    "first_utm_term": "VARCHAR(255)",
    "first_gclid": "VARCHAR(255)",
    "first_yclid": "VARCHAR(255)",
    "first_touch_at": "VARCHAR(40)",
}


def ensure_tracking_columns(db: Session) -> None:
    """Add new attribution columns to an existing SQLite database."""
    Base.metadata.create_all(bind=db.get_bind())

    columns = {
        row[1]
        for row in db.execute(text("PRAGMA table_info(leads)")).all()
    }

    if not columns:
        return

    changed = False
    for column_name, column_type in TRACKING_COLUMNS.items():
        if column_name not in columns:
            db.execute(
                text(
                    f"ALTER TABLE leads ADD COLUMN "
                    f"{column_name} {column_type}"
                )
            )
            changed = True

    if changed:
        db.commit()


@router.post(
    "/lead",
    response_model=LeadCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
):
    ensure_tracking_columns(db)

    now = datetime.now(timezone.utc)
    cutoff = now - DUPLICATE_WINDOW
    normalized_phone = re.sub(r"\D", "", payload.phone)

    # Не создаём повторную заявку с тем же номером в течение 10 минут.
    existing = db.scalar(
        select(Lead)
        .where(
            Lead.phone_normalized == normalized_phone,
            Lead.created_at >= cutoff.replace(tzinfo=None),
        )
        .order_by(Lead.created_at.desc())
        .limit(1)
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Мы уже получили заявку с этого номера. "
                "Если нужно уточнить детали, дождитесь звонка менеджера."
            ),
        )

    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        phone_normalized=normalized_phone,
        interest=payload.interest,
        comment=payload.comment,

        # Last-touch хранится в существующих полях.
        page_url=payload.page_url,
        referrer=payload.referrer,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        utm_content=payload.utm_content,
        utm_term=payload.utm_term,
        gclid=payload.gclid,
        yclid=payload.yclid,
        last_touch_page_url=payload.last_touch_page_url,
        last_touch_at=payload.last_touch_at,

        # First-touch хранится отдельно.
        first_page_url=payload.first_page_url,
        first_referrer=payload.first_referrer,
        first_utm_source=payload.first_utm_source,
        first_utm_medium=payload.first_utm_medium,
        first_utm_campaign=payload.first_utm_campaign,
        first_utm_content=payload.first_utm_content,
        first_utm_term=payload.first_utm_term,
        first_gclid=payload.first_gclid,
        first_yclid=payload.first_yclid,
        first_touch_at=payload.first_touch_at,

        created_at=now.replace(tzinfo=None),
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Сначала сохраняем заявку, затем уведомляем подписчиков.
    send_lead_notification(lead)

    return LeadCreated(
        id=lead.id,
        message="Заявка отправлена. Мы скоро вам позвоним.",
    )
