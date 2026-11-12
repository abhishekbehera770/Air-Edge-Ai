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
    "system_on": False,
    "data_source": "Arduino UNO Q",
    "status": "waiting",
    "timestamp": None,
}


def _valid_number(value):
    if value is None or isinstance(value, bool):
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if number != number or number in (float("inf"), float("-inf")):
        return None

    return number


def update_sensor_data(data):
    global latest_data

    if not isinstance(data, dict):
        return latest_data.copy()

    air_raw = _valid_number(data.get("air_raw"))
    temperature = _valid_number(data.get("temperature"))
    humidity = _valid_number(data.get("humidity"))

    has_reading = any(
        value is not None
        for value in (air_raw, temperature, humidity)
    )

    latest_data.update({
        "air_raw": air_raw,
        "temperature": temperature,
        "humidity": humidity,
        "alert": data.get("alert"),
        "aqi": _valid_number(data.get("aqi")),
        "pm25": _valid_number(data.get("pm25")),
        "pm10": _valid_number(data.get("pm10")),
        "co": _valid_number(data.get("co")),
        "co2": _valid_number(data.get("co2")),
        "no2": _valid_number(data.get("no2")),
        "voc": _valid_number(data.get("voc")),
        "system_on": bool(data.get("system_on", False)),
        "data_source": data.get("data_source", "Arduino UNO Q"),
        "status": "live" if has_reading else "waiting",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })

    return latest_data.copy()


def get_sensor_data():
    return latest_data.copy()