from flask import Flask, jsonify, request
from flask_cors import CORS

from config import HOST, PORT, DEBUG, NODE_ID, DEVICE_NAME, MODE

from sensors import get_sensor_data, update_sensor_data

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
        "edge_ai": "ready",
        "mode": MODE
    })


@app.route("/api/sensors", methods=["GET", "POST", "OPTIONS"])
def sensors():
    if request.method == "OPTIONS":
        return "", 204

    if request.method == "POST":
        incoming = request.get_json(silent=True)

        if not isinstance(incoming, dict):
            return jsonify({
                "error": "Invalid JSON data"
            }), 400

        data = {
            "timestamp": incoming.get("timestamp"),
            "air_raw": incoming.get("air_raw"),
            "temperature": incoming.get("temperature"),
            "humidity": incoming.get("humidity"),
            "alert": incoming.get("alert", "NORMAL"),
            "system_on": incoming.get("system_on", False),
            "data_source": incoming.get("data_source", "Arduino UNO Q"),
            "status": incoming.get("status", "live"),
            "pm25": incoming.get("pm25"),
            "pm10": incoming.get("pm10"),
            "co": incoming.get("co"),
            "co2": incoming.get("co2"),
            "no2": incoming.get("no2"),
            "voc": incoming.get("voc"),
            "aqi": incoming.get("aqi")
        }

        try:
            update_sensor_data(data)
            save_sensor_data(data)

            return jsonify({
                "status": "success",
                "message": "Sensor data received",
                "data": data
            }), 201

        except Exception as error:
            app.logger.exception("Could not process sensor data")
            return jsonify({"error": str(error)}), 500

    return jsonify(get_sensor_data())


@app.route("/api/sensors/latest")
def latest_sensors():
    data = get_latest_data()

    if data is None:
        return jsonify({
            "error": "No sensor data available"
        }), 404

    return jsonify(data)


@app.route("/api/history")
def history():
    limit = request.args.get("limit", default=50, type=int)
    limit = max(1, min(limit, 500))
    data = get_history(limit)

    return jsonify({
        "count": len(data),
        "readings": data
    })


@app.route("/api/intelligence")
def intelligence():
    sensor_data = get_sensor_data() or {}

    aqi = sensor_data.get("aqi")

    # Do not calculate AQI from raw MQ-135 readings.
    if aqi is None:
        forecast = {
            "status": "unavailable",
            "current_aqi": None,
            "forecast_aqi": None,
            "predicted_aqi": None,
            "message": "AQI data is not available"
        }

        recommendation = {
            "status": "unavailable",
            "recommendation": (
                "AQI unavailable. A validated AQI measurement "
                "is required for an AQI-based recommendation."
            ),
            "message": "Current sensors do not provide a validated AQI value."
        }
    else:
        try:
            forecast = forecast_aqi(aqi)
        except (TypeError, ValueError):
            forecast = {
                "status": "unavailable",
                "current_aqi": aqi,
                "forecast_aqi": None,
                "predicted_aqi": None,
                "message": "Could not calculate AQI forecast"
            }

        source_name = "Unknown"
        recommendation = {
            "status": "unavailable",
            "recommendation": "Recommendation unavailable."
        }

        try:
            source_result = detect_source(sensor_data) or {}
            source_name = source_result.get("source", "Unknown")
        except (TypeError, ValueError):
            source_result = {
                "status": "unavailable",
                "source": "Unknown",
                "confidence": 0.0,
                "message": "Insufficient sensor data"
            }

        try:
            recommendation = generate_recommendation(
                aqi, source_name
            )
        except (TypeError, ValueError):
            pass

    # Source detection needs several measurements that
    # the current hardware does not provide.
    try:
        source_result = detect_source(sensor_data) or {}
    except (TypeError, ValueError):
        source_result = {
            "status": "unavailable",
            "source": "Unknown",
            "confidence": 0.0,
            "message": "Insufficient sensor data for source detection"
        }

    return jsonify({
        "sensor_data": sensor_data,
        "forecast": forecast,
        "source_detection": source_result,
        "recommendation": recommendation
    })


@app.route("/api/system")
def system():
    return jsonify({
        "device": DEVICE_NAME,
        "node_id": NODE_ID,
        "mode": MODE,
        "inference": "Local",
        "cloud_ai": False,
        "database": "SQLite",
        "network_required_for_inference": False
    })


if __name__ == "__main__":
    print(f"AirEdge AI Backend: http://{HOST}:{PORT}")

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG
    )