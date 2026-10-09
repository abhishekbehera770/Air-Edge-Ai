def detect_source(sensor_data):
    pm25 = sensor_data.get("pm25")
    pm10 = sensor_data.get("pm10")
    co = sensor_data.get("co")
    no2 = sensor_data.get("no2")
    voc = sensor_data.get("voc")

    if any(value is None for value in [pm25, pm10, co, no2, voc]):
        return {
            "source": "Unknown",
            "confidence": 0.0,
            "status": "unavailable",
            "message": "Insufficient sensor data for source detection"
        }

    if co > 9 and no2 > 40:
        source = "Vehicle Emissions"
    elif pm25 > 35 and pm10 > 50:
        source = "Dust or Particulate Matter"
    elif voc > 100:
        source = "Volatile Organic Compounds"
    else:
        source = "Mixed or Unclassified"

    return {
        "source": source,
        "confidence": 0.6,
        "status": "success",
        "message": "Prototype rule-based classification"
    }