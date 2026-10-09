// ==========================================
// AirEdge AI - Frontend
// Frontend <-> Python Flask Backend
// ==========================================

const BACKEND_URL = "http://localhost:5000";


// ==========================================
// ELEMENTS
// ==========================================

const pm25Element = document.getElementById("pm25");
const pm10Element = document.getElementById("pm10");
const coElement = document.getElementById("co");
const co2Element = document.getElementById("co2");
const no2Element = document.getElementById("no2");
const vocElement = document.getElementById("voc");

const temperatureElement =
    document.getElementById("temperature");

const humidityElement =
    document.getElementById("humidity");

const aqiElement =
    document.getElementById("aqiValue");

const airStatusElement =
    document.getElementById("airStatus");

const airDescriptionElement =
    document.getElementById("airDescription");

const connectionText =
    document.getElementById("connectionText");

const nodeText =
    document.getElementById("nodeText");

const lastUpdateElement =
    document.getElementById("lastUpdate");

const systemModeElement =
    document.getElementById("systemMode");

const forecast1Element =
    document.getElementById("forecast1");

const forecast2Element =
    document.getElementById("forecast2");

const forecast3Element =
    document.getElementById("forecast3");

const sourceElement =
    document.getElementById("source");

const confidenceElement =
    document.getElementById("confidence");

const confidenceBar =
    document.getElementById("confidenceBar");

const recommendationTitleElement =
    document.getElementById("recommendationTitle");

const recommendationMessageElement =
    document.getElementById("recommendationMessage");


// ==========================================
// LOAD SENSOR DATA
// ==========================================

async function loadSensors() {

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/sensors`
        );

        if (!response.ok) {
            throw new Error(
                `Sensor request failed: ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Sensor data:", data);

        // Update sensor cards
        pm25Element.textContent =
            Number(data.pm25).toFixed(0);

        pm10Element.textContent =
            Number(data.pm10).toFixed(0);

        coElement.textContent =
            Number(data.co).toFixed(1);

        co2Element.textContent =
            Number(data.co2).toFixed(0);

        no2Element.textContent =
            Number(data.no2).toFixed(0);

        vocElement.textContent =
            Number(data.voc).toFixed(0);

        temperatureElement.textContent =
            Number(data.temperature).toFixed(1);

        humidityElement.textContent =
            Number(data.humidity).toFixed(0);

        aqiElement.textContent =
            Number(data.aqi).toFixed(0);


        // Update AQI status
        updateAQIStatus(
            Number(data.aqi)
        );


        // Connection status
        connectionText.textContent =
            "Backend Connected";

        nodeText.textContent =
            "NODE-01 • Flask";


        // Time
        updateTime();


    } catch (error) {

        console.error(
            "Sensor connection error:",
            error
        );

        connectionText.textContent =
            "Backend Offline";

        nodeText.textContent =
            "Waiting for Flask";

        airStatusElement.textContent =
            "Offline";

        airDescriptionElement.textContent =
            "Unable to receive sensor data.";

    }
}


// ==========================================
// AQI STATUS
// ==========================================

function updateAQIStatus(aqi) {

    let status;
    let description;

    if (aqi <= 50) {

        status = "Good";

        description =
            "Air quality is currently within a healthy range.";

    } else if (aqi <= 100) {

        status = "Moderate";

        description =
            "Air quality is acceptable, but sensitive people should be cautious.";

    } else if (aqi <= 150) {

        status = "Unhealthy for Sensitive Groups";

        description =
            "Sensitive individuals should reduce prolonged outdoor activity.";

    } else if (aqi <= 200) {

        status = "Unhealthy";

        description =
            "Everyone may begin to experience health effects.";

    } else if (aqi <= 300) {

        status = "Very Unhealthy";

        description =
            "Health alert: the risk of health effects is increased.";

    } else {

        status = "Hazardous";

        description =
            "Health emergency conditions. Avoid outdoor exposure.";
    }

    airStatusElement.textContent =
        status;

    airDescriptionElement.textContent =
        description;
}


// ==========================================
// LOAD AI INTELLIGENCE
// ==========================================

async function loadIntelligence() {

    try {

        recommendationTitleElement.textContent =
            "Analyzing...";

        sourceElement.textContent =
            "Detecting...";


        const response = await fetch(
            `${BACKEND_URL}/api/intelligence`
        );

        if (!response.ok) {
            throw new Error(
                `AI request failed: ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "AI intelligence:",
            data
        );


        // ==================================
        // FORECAST
        // ==================================

        const forecast =
            data.forecast;

        forecast1Element.textContent =
            Math.round(forecast["1_hour"]);

        forecast2Element.textContent =
            Math.round(forecast["2_hour"]);

        forecast3Element.textContent =
            Math.round(forecast["3_hour"]);


        // ==================================
        // SOURCE DETECTION
        // ==================================

        const sourceData =
            data.source_detection;

        sourceElement.textContent =
            sourceData.source;


        const confidence =
            Number(sourceData.confidence);

        const confidencePercent =
            Math.round(confidence * 100);

        confidenceElement.textContent =
            `${confidencePercent}%`;

        confidenceBar.style.width =
            `${confidencePercent}%`;


        // ==================================
        // RECOMMENDATION
        // ==================================

        const recommendation =
            data.recommendation;

        recommendationTitleElement.textContent =
            recommendation.title;

        recommendationMessageElement.textContent =
            recommendation.message;


        // ==================================
        // SHOW NOTIFICATION
        // ==================================

        showNotification(
            "AI insight updated"
        );


    } catch (error) {

        console.error(
            "AI intelligence error:",
            error
        );

        forecast1Element.textContent =
            "--";

        forecast2Element.textContent =
            "--";

        forecast3Element.textContent =
            "--";

        sourceElement.textContent =
            "Unavailable";

        confidenceElement.textContent =
            "--";

        recommendationTitleElement.textContent =
            "Analysis unavailable";

        recommendationMessageElement.textContent =
            "Unable to receive AI results from the backend.";

    }
}


// ==========================================
// SYSTEM INFORMATION
// ==========================================

async function loadSystemInfo() {

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/system`
        );

        if (!response.ok) {
            throw new Error("System request failed");
        }

        const data =
            await response.json();

        console.log(
            "System info:",
            data
        );

        systemModeElement.textContent =
            data.mode;

        nodeText.textContent =
            `${data.node_id || "NODE-01"} • Flask`;

    } catch (error) {

        console.error(
            "System information error:",
            error
        );

    }
}


// ==========================================
// NOTIFICATION
// ==========================================

function showNotification(message) {

    const notification =
        document.getElementById(
            "notification"
        );

    if (!notification) {
        return;
    }

    notification.textContent =
        message;

    notification.classList.add("show");

    setTimeout(() => {

        notification.classList.remove("show");

    }, 2500);
}


// ==========================================
// LAST UPDATED
// ==========================================

function updateTime() {

    const now =
        new Date();

    lastUpdateElement.textContent =
        now.toLocaleTimeString();
}


// ==========================================
// INITIAL LOAD
// ==========================================

loadSensors();

loadIntelligence();

loadSystemInfo();


// ==========================================
// AUTO UPDATE
// ==========================================

// Sensor data every 3 seconds
setInterval(() => {

    loadSensors();

}, 3000);


// AI intelligence every 10 seconds
setInterval(() => {

    loadIntelligence();

}, 10000);