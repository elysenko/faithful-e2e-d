# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DB_PATH=/data/faithfuld.db \
    PORT=8080

WORKDIR /app

# Install dependencies first for better layer caching.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application source (package + static frontend).
COPY backend/ ./backend/

# Persistent SQLite location (mount a volume here in production).
RUN mkdir -p /data

EXPOSE 8080

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
