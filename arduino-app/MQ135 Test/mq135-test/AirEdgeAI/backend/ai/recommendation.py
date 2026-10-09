
def generate_recommendation(aqi, source):
    """
    Generate a practical recommendation.

    AQI-based health recommendations require a valid AQI.
    The MQ-135 raw reading is not an AQI measurement.
    """

    if aqi is None:
        return {
            "title": "AQI assessment unavailable",
            "message": (
                "The Arduino is providing raw MQ-135, "
                "temperature, and humidity readings. "
                "A calibrated AQI measurement is required "
                "for AQI-based health recommendations."
            ),
            "action": "Continue monitoring sensor readings"
        }

    try:
        aqi = float(aqi)
    except (TypeError, ValueError):
        return {
            "title": "AQI assessment unavailable",
            "message": "A valid numeric AQI value is required.",
            "action": "Check the air-quality measurement system"
        }

    if aqi <= 50:
        return {
            "title": "Air quality is good",
            "message": "Outdoor activities are suitable.",
            "action": "Normal outdoor activity"
        }

    if aqi <= 100:
        return {
            "title": "Moderate air quality",
            "message": (
                "Sensitive individuals should "
                "reduce prolonged outdoor activity."
            ),
            "action": "Limit prolonged exposure"
        }

    if source == "Traffic":
        return {
            "title": "Avoid busy traffic areas",
            "message": (
                "Choose a lower-traffic walking route today."
            ),
            "action": "Change walking route"
        }

    if source == "Construction Dust":
        return {
            "title": "Avoid construction zones",
            "message": (
                "Dust levels may be elevated near "
                "construction activity."
            ),
            "action": "Avoid construction area"
        }

    if source == "Cooking Smoke":
        return {
            "title": "Improve kitchen ventilation",
            "message": (
                "Turn on the exhaust fan and improve "
                "indoor ventilation."
            ),
            "action": "Run exhaust fan"
        }

    if source == "Garbage Burning":
        return {
            "title": "Avoid the affected area",
            "message": (
                "Possible garbage burning detected. "
                "Avoid exposure and report the activity."
            ),
            "action": "Avoid affected area"
        }

    if source == "Crop Residue Burning":
        return {
            "title": "Reduce outdoor exposure",
            "message": (
                "Smoke-related pollution may be affecting "
                "the area."
            ),
            "action": "Move activity indoors"
        }

    return {
        "title": "Reduce outdoor exposure",
        "message": (
            "Air pollution may be elevated. Consider "
            "moving outdoor activities indoors."
        ),
        "action": "Stay indoors"
    }
