#!/bin/sh
set -e

chown appuser:appuser /data

if [ ! -f /data/kvarta.db ]; then
    cp /app/kvarta.db /data/kvarta.db
fi

chown appuser:appuser /data/kvarta.db

exec su -p -s /bin/sh appuser -c 'export DATABASE_URL=sqlite:////data/kvarta.db; python run_telegram_bot.py & exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"'