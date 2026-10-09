def generate_recommendation(aqi, source="Unknown"):
    if aqi is None:
        return {
            "status": "unavailable",
            "recommendation": "AQI unavailable. Connect a supported air-quality sensor to calculate AQI.",
            "message": "Current sensors do not provide a validated AQI value."
        }

    try:
        aqi = float(aqi)
    except (TypeError, ValueError):
        return {
            "status": "unavailable",
            "recommendation": "AQI unavailable.",
            "message": "Invalid AQI value."
        }

    if aqi <= 50:
        message = "Air quality is good."
    elif aqi <= 100:
        message = "Air quality is moderate. Sensitive individuals should take care."
    elif aqi <= 150:
        message = "Unhealthy for sensitive groups. Reduce prolonged outdoor activity."
    elif aqi <= 200:
        message = "Unhealthy air quality. Reduce outdoor exposure."
    elif aqi <= 300:
        message = "Very unhealthy air quality. Avoid unnecessary outdoor activity."
    else:
        message = "Hazardous air quality. Avoid outdoor exposure."

    return {
        "status": "success",
        "recommendation": message,
        "source": source
    }