
import sqlite3

from config import DATABASE_PATH


def get_connection():
    """Create a SQLite database connection."""
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def create_database():
    """Create the sensor table and add new columns if needed."""
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
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

    # Migrate databases created by the earlier project version.
    cursor.execute("PRAGMA table_info(sensor_readings)")
    existing_columns = {
        row["name"] for row in cursor.fetchall()
    }

    new_columns = {
        "air_raw": "INTEGER",
        "alert": "TEXT",
        "data_source": "TEXT",
        "status": "TEXT",
    }

    for column, column_type in new_columns.items():
        if column not in existing_columns:
            cursor.execute(
                f"ALTER TABLE sensor_readings "
                f"ADD COLUMN {column} {column_type}"
            )

    connection.commit()
    connection.close()


def save_sensor_data(data):
    """Save one sensor reading locally."""
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO sensor_readings (
                timestamp,
                pm25,
                pm10,
                co,
                co2,
                no2,
                voc,
                temperature,
                humidity,
                aqi,
                air_raw,
                alert,
                data_source,
                status
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
            data.get("data_source"),
            data.get("status"),
        ))

        connection.commit()

    finally:
        connection.close()


def get_latest_data():
    """Return the newest stored reading."""
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT *
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT 1
        """)

        row = cursor.fetchone()
        return dict(row) if row is not None else None

    finally:
        connection.close()


def get_history(limit=50):
    """Return recent sensor readings."""
    connection = get_connection()

    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT *
            FROM sensor_readings
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()
