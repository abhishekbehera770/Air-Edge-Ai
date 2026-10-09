
def detect_source(data):
    """
    Prototype pollution-source detection.

    The current Arduino setup provides an MQ-135 raw reading,
    temperature, humidity, and a test alert. It cannot reliably
    identify a specific pollution source from these values alone.
    """

    required_pollutants = ("pm25", "pm10", "co", "no2", "voc")

    # Do not use missing or simulated pollutant values.
    if any(data.get(key) is None for key in required_pollutants):
        return {
            "source": "Unknown",
            "confidence": 0.0,
            "status": "unavailable",
            "message": (
                "Specific pollution-source detection is unavailable. "
                "The connected sensors do not measure all required "
                "pollutants independently."
            )
        }

    try:
        pm25 = float(data["pm25"])
        pm10 = float(data["pm10"])
        co = float(data["co"])
        no2 = float(data["no2"])
        voc = float(data["voc"])
    except (TypeError, ValueError):
        return {
            "source": "Unknown",
            "confidence": 0.0,
            "status": "unavailable",
            "message": "Pollutant measurements are invalid."
        }

    # These are prototype rules, not a validated ML model.
    if pm10 > 180 and pm25 > 100:
        source, confidence = "Construction Dust", 0.86
    elif co > 4 and voc > 300:
        source, confidence = "Cooking Smoke", 0.82
    elif no2 > 60 and co > 3:
        source, confidence = "Traffic", 0.84
    elif pm25 > 130 and co > 3:
        source, confidence = "Garbage Burning", 0.78
    elif pm25 > 150 and voc > 300:
        source, confidence = "Crop Residue Burning", 0.74
    else:
        source, confidence = "Unknown", 0.55

    return {
        "source": source,
        "confidence": confidence,
        "status": "prototype",
        "message": (
            "Rule-based prototype result; not a validated "
            "pollution-source identification."
        )
    }
