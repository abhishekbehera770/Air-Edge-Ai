
import os
import json
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import BadRequest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.json.sort_keys = False

# Environment variables
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY", "").strip()

# Local frontend origins allowed to access the backend.
ALLOWED_ORIGINS = {
    "http://127.0.0.1:5500",
    "http://localhost:5500",
}

# Render deployment requires PostgreSQL and a device API key.
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required."
    )

if not DEVICE_API_KEY:
    raise RuntimeError(
        "DEVICE_API_KEY environment variable is required."
    )


# CORS configuration
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")

    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, X-Device-Key"
        )
        response.headers["Access-Control-Max-Age"] = "600"

    return response


# Database connection
def get_db():
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
        connect_timeout=10,
    )


# Initialize database tables
def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id BIGSERIAL PRIMARY KEY,
                recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                air_raw DOUBLE PRECISION,
                temperature DOUBLE PRECISION,
                humidity DOUBLE PRECISION,
                alert TEXT,
                payload JSONB NOT NULL DEFAULT '{}'::jsonb
            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at
            ON sensor_readings (recorded_at DESC)
        """)


# Safely convert numeric values
def number_or_none(value):
    if value is None or value == "":
        return None

    try:
        number = float(value)

        if number != number or number in (
            float("inf"),
            float("-inf"),
        ):
            return None

        return number

    except (TypeError, ValueError):
        return None


# Convert a database record into JSON-compatible data
def reading_to_dict(row):
    if row is None:
        return {
            "air_raw": None,
            "temperature": None,
            "humidity": None,
            "alert": "Waiting for sensor data",
            "status": "waiting",
            "timestamp": None,
            "id": None,
        }

    result = dict(row)
    recorded_at = result.pop("recorded_at", None)

    payload = result.pop("payload", {}) or {}
    result.update(payload)

    result["air_raw"] = row.get("air_raw")
    result["temperature"] = row.get("temperature")
    result["humidity"] = row.get("humidity")
    result["alert"] = row.get("alert") or "Unknown"
    result["id"] = row.get("id")

    if recorded_at:
        result["timestamp"] = recorded_at.astimezone(
            timezone.utc
        ).isoformat()

        age = (
            datetime.now(timezone.utc) - recorded_at
        ).total_seconds()

        result["status"] = "live" if age <= 30 else "offline"

    else:
        result["timestamp"] = None
        result["status"] = "waiting"

    return result


# Get the latest sensor reading
def latest_reading():
    with get_db() as conn:
        return conn.execute("""
            SELECT id, recorded_at, air_raw, temperature,
                   humidity, alert, payload
            FROM sensor_readings
            ORDER BY recorded_at DESC, id DESC
            LIMIT 1
        """).fetchone()


# Serve the frontend when its files are located beside app.py.
@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.get("/script.js")
def javascript():
    return send_from_directory(BASE_DIR, "script.js")


@app.get("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(
        os.path.join(BASE_DIR, "assets"),
        filename,
    )


# Health check
@app.get("/api/health")
def health():
    try:
        with get_db() as conn:
            conn.execute("SELECT 1")

        return jsonify({
            "project": "AirEdge AI",
            "status": "Backend running",
            "database": "connected",
            "time": datetime.now(timezone.utc).isoformat(),
        })

    except Exception:
        app.logger.exception("Health check failed")

        return jsonify({
            "project": "AirEdge AI",
            "status": "degraded",
            "database": "disconnected",
        }), 503


# Sensor API: GET readings, POST authenticated device readings
@app.route(
    "/api/sensors",
    methods=["GET", "POST", "OPTIONS"],
)
def sensors():
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "GET":
        return jsonify(reading_to_dict(latest_reading()))

    # Authenticate sensor uploads.
    supplied_key = request.headers.get("X-Device-Key", "")

    if supplied_key != DEVICE_API_KEY:
        return jsonify({
            "error": "Unauthorized device",
        }), 401

    try:
        data = request.get_json(force=True)

    except BadRequest:
        return jsonify({
            "error": "Request body must be valid JSON",
        }), 400

    if not isinstance(data, dict):
        return jsonify({
            "error": "JSON object required",
        }), 400

    air_raw = number_or_none(
        data.get("air_raw", data.get("raw_adc"))
    )

    temperature = number_or_none(
        data.get("temperature")
    )

    humidity = number_or_none(
        data.get("humidity")
    )

    if (
        air_raw is None
        and temperature is None
        and humidity is None
    ):
        return jsonify({
            "error": "No valid sensor readings received",
        }), 400

    alert = str(data.get("alert", "Unknown"))[:80]

    # Preserve device metadata and other additional fields.
    payload = dict(data)
    payload["received_at"] = (
        datetime.now(timezone.utc).isoformat()
    )

    try:
        with get_db() as conn:
            row = conn.execute("""
                INSERT INTO sensor_readings
                    (air_raw, temperature, humidity, alert, payload)
                VALUES (%s, %s, %s, %s, %s::jsonb)
                RETURNING id, recorded_at, air_raw, temperature,
                          humidity, alert, payload
            """, (
                air_raw,
                temperature,
                humidity,
                alert,
                json.dumps(payload),
            )).fetchone()

        return jsonify({
            "success": True,
            "message": "Sensor reading stored",
            "reading": reading_to_dict(row),
        }), 201

    except Exception:
        app.logger.exception(
            "Could not store sensor reading"
        )

        return jsonify({
            "error": "Database write failed",
        }), 500


# Latest sensor reading
@app.get("/api/sensors/latest")
def sensors_latest():
    return jsonify(reading_to_dict(latest_reading()))


# Sensor history
@app.get("/api/history")
def history():
    try:
        limit = int(request.args.get("limit", "12"))

    except ValueError:
        limit = 12

    limit = max(1, min(limit, 500))

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, recorded_at, air_raw, temperature,
                   humidity, alert, payload
            FROM sensor_readings
            ORDER BY recorded_at DESC, id DESC
            LIMIT %s
        """, (limit,)).fetchall()

    return jsonify([
        reading_to_dict(row)
        for row in rows
    ])


# Basic sensor intelligence
@app.get("/api/intelligence")
def intelligence():
    current = reading_to_dict(latest_reading())
    air = current.get("air_raw")

    if current["status"] != "live":
        level = "WAITING"
        message = (
            "No recent sensor reading. "
            "Check the device connection."
        )

    elif air is None:
        level = "UNKNOWN"
        message = "Air sensor reading is unavailable."

    elif air <= 80:
        level = "LOW"
        message = (
            "Raw sensor value is within the configured low range."
        )

    elif air <= 120:
        level = "MODERATE"
        message = (
            "Raw sensor value is within the configured middle range."
        )

    else:
        level = "HIGH"
        message = (
            "Raw sensor value is above the configured threshold."
        )

    return jsonify({
        "level": level,
        "message": message,
        "status": current["status"],
        "timestamp": current["timestamp"],
    })


# System status
@app.get("/api/system")
def system():
    current = reading_to_dict(latest_reading())

    return jsonify({
        "project": "AirEdge AI",
        "backend": "online",
        "device_status": current["status"],
        "last_reading": current["timestamp"],
        "database": "PostgreSQL",
    })


# Error handlers
@app.errorhandler(404)
def not_found(_error):
    return jsonify({
        "error": "Not found",
    }), 404


@app.errorhandler(500)
def server_error(_error):
    return jsonify({
        "error": "Internal server error",
    }), 500


# Initialize the database before serving requests.
init_db()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=False,
    )
