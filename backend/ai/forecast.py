def forecast_aqi(aqi):
    if aqi is None:
        return {
            "status": "unavailable",
            "current_aqi": None,
            "forecast_aqi": None,
            "predicted_aqi": None,
            "message": "AQI data is not available"
        }

    try:
        current_aqi = float(aqi)
    except (TypeError, ValueError):
        return {
            "status": "unavailable",
            "current_aqi": None,
            "forecast_aqi": None,
            "predicted_aqi": None,
            "message": "Invalid AQI data"
        }

    if current_aqi < 0:
        return {
            "status": "unavailable",
            "current_aqi": None,
            "forecast_aqi": None,
            "predicted_aqi": None,
            "message": "Invalid AQI value"
        }

    predicted_aqi = round(current_aqi * 1.05, 2)

    if predicted_aqi <= 50:
        category = "Good"
    elif predicted_aqi <= 100:
        category = "Moderate"
    elif predicted_aqi <= 150:
        category = "Unhealthy for Sensitive Groups"
    elif predicted_aqi <= 200:
        category = "Unhealthy"
    elif predicted_aqi <= 300:
        category = "Very Unhealthy"
    else:
        category = "Hazardous"

    return {
        "status": "success",
        "current_aqi": current_aqi,
        
        "forecast_aqi": predicted_aqi,
        "predicted_aqi": predicted_aqi,
        "category": category,
        "message": "Estimated forecast based on current AQI"
    }