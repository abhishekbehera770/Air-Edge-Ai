```python
import json
import os

DATA_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "data",
    "live_sensor_data.json"
)


def get_sensor_data():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        if not data.get("system_on", False):
            return {
                **data,
                "status": "system_off",
                "data_source": "Arduino UNO Q"
            }

        return {
            **data,
            "status": "online",
            "data_source": "Arduino UNO Q"
        }

    except (OSError, ValueError, TypeError):
        return {
            "status": "waiting_for_arduino",
            "message": "Waiting for live sensor data",
            "data_source": "Arduino UNO Q"
        }
```
