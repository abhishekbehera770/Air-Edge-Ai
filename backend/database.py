import sqlite3
from config import DATABASE_PATH


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def create_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                pm25 REAL,
                pm10 REAL,
                co REAL,
                co2 REAL,
                no2 REAL,
                voc REAL,
                temperature REAL,
                humidity REAL,
                aqi REAL,
                air_raw INTEGER,
                alert TEXT,
                data_source TEXT,
                status TEXT
            )
        """)

        existing = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(sensor_readings)"
            ).fetchall()
        }

        extra_columns = {
            "air_raw": "INTEGER",
            "alert": "TEXT",
            "data_source": "TEXT",
            "status": "TEXT",
        }

        for column, data_type in extra_columns.items():
            if column not in existing:
                connection.execute(
                    f"ALTER TABLE sensor_readings "
                    f"ADD COLUMN {column} {data_type}"
                )


def save_sensor_data(data):
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO sensor_readings (
                timestamp, pm25, pm10, co, co2, no2, voc,
                temperature, humidity, aqi, air_raw,
                alert, data_source, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get("timestamp"),
            data.get("pm25"),
            data.get("pm10"),
            data.get("co"),
            data.get("co2"),
            data.get("no2"),
            data.get("voc"),
            data.get("temperature"),
            data.get("humidity"),
            data.get("aqi"),
            data.get("air_raw"),
            data.get("alert"),
            data.get("data_source", "Arduino UNO Q"),
            data.get("status", "online")
        ))


def get_latest_data():
    with get_connection() as connection:
        row = connection.execute("""
            SELECT * FROM sensor_readings
            ORDER BY id DESC LIMIT 1
        """).fetchone()

    return dict(row) if row else None


def get_history(limit=50):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT * FROM sensor_readings
            ORDER BY id DESC LIMIT ?
        """, (limit,)).fetchall()

    return [dict(row) for row in rows]