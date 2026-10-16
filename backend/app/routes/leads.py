from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Lead
from app.schemas import LeadCreate, LeadCreated

router = APIRouter(tags=["leads"])
DUPLICATE_WINDOW = timedelta(minutes=10)


@router.post("/lead", response_model=LeadCreated, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    cutoff = now - DUPLICATE_WINDOW

    # Не создаём повторную заявку с тем же номером в течение 10 минут.
    existing = db.scalar(
        select(Lead)
        .where(
            Lead.phone_normalized == payload.phone,
            Lead.created_at >= cutoff.replace(tzinfo=None),
        )
        .order_by(Lead.created_at.desc())
        .limit(1)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Мы уже получили заявку с этого номера. Если нужно уточнить детали, дождитесь звонка менеджера.",
        )

    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        phone_normalized=payload.phone,
        interest=payload.interest,
        comment=payload.comment or None,
        page_url=payload.page_url,
        referrer=payload.referrer,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        utm_content=payload.utm_content,
        utm_term=payload.utm_term,
        gclid=payload.gclid,
        yclid=payload.yclid,
        created_at=now.replace(tzinfo=None),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadCreated(id=lead.id, message="Заявка отправлена. Мы скоро вам позвоним.")
