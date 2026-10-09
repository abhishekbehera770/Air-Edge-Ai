from datetime import datetime

latest_data = {
    "air_raw": None,
    "temperature": None,
    "humidity": None,
    "alert": None,
    "aqi": None,
    "pm25": None,
    "pm10": None,
    "co": None,
    "co2": None,
    "no2": None,
    "voc": None,
    "data_source": "Arduino UNO Q",
    "status": "waiting",
    "timestamp": None,
}


def update_sensor_data(data):
    global latest_data

    if not isinstance(data, dict):
        return latest_data

    latest_data.update({
        "air_raw": data.get("air_raw"),
        "temperature": data.get("temperature"),
        "humidity": data.get("humidity"),
        "alert": data.get("alert"),
        "data_source": "Arduino UNO Q",
        "status": "live",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })

    return latest_data


def get_sensor_data():
    return latest_data.copy()