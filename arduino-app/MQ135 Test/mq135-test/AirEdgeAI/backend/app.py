
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import HOST, PORT, DEBUG, NODE_ID, DEVICE_NAME, MODE
from sensors import get_sensor_data
from database import (
    create_database,
    save_sensor_data,
    get_latest_data,
    get_history
)
from ai.forecast import forecast_aqi
from ai.source_detection import detect_source
from ai.recommendation import generate_recommendation

app = Flask(__name__)
CORS(app)

create_database()


@app.route("/")
def home():
    return jsonify({
        "project": "AirEdge AI",
        "status": "Backend running",
        "mode": MODE,
        "device": DEVICE_NAME,
        "node_id": NODE_ID
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "online",
        "backend": "Flask",
        "database": "SQLite",
        "mode": MODE
    })


@app.route("/api/sensors")
def sensors():
    data = get_sensor_data()

    if data.get("status") != "connected":
        return jsonify(data), 503

    save_sensor_data(data)
    return jsonify(data)


@app.route("/api/sensors/latest")
def latest_sensors():
    data = get_latest_data()

    if data is None:
        return jsonify({"error": "No sensor data available"}), 404

    return jsonify(data)


@app.route("/api/history")
def history():
    limit = max(1, min(request.args.get("limit", 50, type=int), 500))
    readings = get_history(limit)

    return jsonify({
        "count": len(readings),
        "readings": readings
    })


@app.route("/api/intelligence")
def intelligence():
    data = get_sensor_data()

    if data.get("status") != "connected":
        return jsonify({
            "status": "waiting_for_arduino",
            "sensor_data": data,
            "forecast": forecast_aqi(None),
            "source_detection": {
                "source": "Unknown",
                "status": "unavailable"
            },
            "recommendation": generate_recommendation(
                None, "Unknown"
            )
        }), 503

    save_sensor_data(data)

    # No calibrated AQI is available from the MQ-135 raw reading.
    return jsonify({
        "status": "connected",
        "sensor_data": data,
        "forecast": forecast_aqi(None),
        "source_detection": {
            "source": "Unknown",
            "status": "unavailable",
            "message": "Additional calibrated pollutant sensors are required."
        },
        "recommendation": generate_recommendation(None, "Unknown")
    })


@app.route("/api/system")
def system():
    return jsonify({
        "device": DEVICE_NAME,
        "node_id": NODE_ID,
        "mode": MODE,
        "inference": "Local",
        "cloud_ai": False,
        "database": "SQLite"
    })


if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=DEBUG)
