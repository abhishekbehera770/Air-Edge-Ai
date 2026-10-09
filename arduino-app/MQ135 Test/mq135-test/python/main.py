
import json
import time
import urllib.request
import urllib.error
from arduino.app_utils import App, Bridge

BACKEND_URL = "http://10.10.6.133:5000/api/sensors"

def send_sensor_data(data):
    try:
        if isinstance(data, str):
            data = json.loads(data)

        if not isinstance(data, dict):
            return

        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "air_raw": data.get("air_raw"),
            "temperature": data.get("temperature"),
            "humidity": data.get("humidity"),
            "alert": data.get("alert", "NORMAL"),
            "system_on": data.get("system_on", False),
            "data_source": "Arduino UNO Q",
            "status": "live",
            "pm25": None,
            "pm10": None,
            "co": None,
            "co2": None,
            "no2": None,
            "voc": None,
            "aqi": None
        }

        request = urllib.request.Request(
            BACKEND_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(request, timeout=5) as response:
            print(
                "[AirEdgeAI] Backend response:",
                response.status,
                flush=True
            )

    except Exception as error:
        print("[AirEdgeAI] Send failed:", error, flush=True)

Bridge.provide("air_data", send_sensor_data)

print("[AirEdgeAI] Bridge ready", flush=True)

App.run(user_loop=lambda: time.sleep(1))
