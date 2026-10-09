
def forecast_aqi(current_aqi):
    """
    Temporary local forecast.

    AQI forecasting is unavailable until calibrated AQI
    measurements are available. Never treat the MQ-135
    raw reading as AQI.
    """

    if current_aqi is None:
        return {
            "status": "unavailable",
            "message": (
                "AQI forecasting requires calibrated AQI "
                "measurements. The current sensor provides "
                "an MQ-135 raw reading only."
            ),
            "1_hour": None,
            "2_hour": None,
            "3_hour": None
        }

    try:
        current_aqi = float(current_aqi)
    except (TypeError, ValueError):
        return {
            "status": "unavailable",
            "message": "A valid numeric AQI value is required.",
            "1_hour": None,
            "2_hour": None,
            "3_hour": None
        }

    hour_1 = min(round(current_aqi * 1.05, 2), 500)
    hour_2 = min(round(current_aqi * 1.10, 2), 500)
    hour_3 = min(round(current_aqi * 1.15, 2), 500)

    return {
        "status": "estimated",
        "message": "Temporary mathematical projection, not a trained forecast.",
        "1_hour": hour_1,
        "2_hour": hour_2,
        "3_hour": hour_3
    }
