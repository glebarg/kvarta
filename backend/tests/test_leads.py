from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)


def test_create_lead():
    response = client.post("/api/lead", json={
        "name": "Анна",
        "phone": "+375 29 123-45-67",
        "interest": "subscription",
        "utm_source": "instagram",
        "page_url": "https://example.com/?utm_source=instagram",
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Заявка отправлена. Мы скоро вам позвоним."


def test_invalid_phone_is_rejected():
    response = client.post("/api/lead", json={
        "name": "Анна",
        "phone": "+1 555 123 4567",
        "interest": "question",
    })
    assert response.status_code == 422


def test_duplicate_phone_is_rejected():
    payload = {"name": "Анна", "phone": "+375 29 123-45-67", "interest": "one_time"}
    assert client.post("/api/lead", json=payload).status_code == 201
    assert client.post("/api/lead", json=payload).status_code == 409
