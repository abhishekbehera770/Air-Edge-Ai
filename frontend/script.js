const BACKEND_URL = "http://127.0.0.1:5000";
const REFRESH_INTERVAL = 3000;
const ALERT_THRESHOLD = 80;

const $ = (id) => document.getElementById(id);

let lastKnownData = null;
let refreshing = false;

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function setClass(id, className) {
  const element = $(id);
  if (element) element.className = className;
}

function firstValue(data, keys) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }
  return null;
}

function validNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function displayNumber(value, decimals = 1) {
  const number = validNumber(value);
  if (number === null) return "--";
  return Number.isInteger(number) ? String(number) : number.toFixed(decimals);
}

function displayBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "on", "yes", "active", "enabled"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "off", "no", "inactive", "disabled"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function formatTime(value) {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateClock() {
  const now = new Date();

  setText(
    "clock",
    now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  );

  setText("year", now.getFullYear());
}

function setBackendState(online, message = "") {
  setText("backendBadge", online ? "ONLINE" : "OFFLINE");
  setText("connectionText", message || (
    online ? "Flask backend responding" : "Cannot reach Flask backend"
  ));

  setText("sideConnection", online ? "CONNECTED" : "DISCONNECTED");
  setClass("sideConnectionDot", online ? "status-dot" : "status-dot offline");

  setText("controllerState", online ? "CONNECTED" : "OFFLINE");
}

function setConnectionError(error) {
  setBackendState(false, "Backend unavailable");

  setText(
    "deviceMessage",
    "Waiting for backend / sensor data"
  );

  if (!lastKnownData) {
    setText("airStatus", "No live data");
    setText("airDescription", "Start the backend and connect your device.");
    setText("systemMode", "OFFLINE");
    setText("switchStatus", "UNKNOWN");
    setText("alertStatus", "UNKNOWN");
    setText("ledStatus", "LED state unavailable");
    setText("mqStatus", "NO DATA");
    setText("dhtStatus", "NO DATA");
    setText("ledDeviceState", "NO DATA");
    setText("switchDeviceState", "NO DATA");
    setText("airRaw", "--");
    setText("meterValue", "--");
    setText("sensorAir", "--");
    setText("temperature", "--");
    setText("humidity", "--");
    setText("lcdLine1", "AIR: ---");
    setText("lcdLine2", "TEMP: -- HUM: --");
    setText("footerUpdate", "Waiting for the first sensor reading");
    setText("airBar", "0%");
    setText("tempBar", "0%");
    setText("humidityBar", "0%");
    setClass("ledBulb", "led-bulb");
  }

  console.warn("[AirEdge AI] Backend request failed:", error);
}

function updateBar(id, percent) {
  const element = $(id);
  if (!element) return;

  const safePercent = Math.max(0, Math.min(100, percent));
  element.style.width = `${safePercent}%`;
}

function updateDashboard(data) {
  if (!data || typeof data !== "object") return;

  lastKnownData = data;

  const airRaw = validNumber(
    firstValue(data, ["air_raw", "mq135_raw", "raw", "mq135"])
  );

  const temperature = validNumber(
    firstValue(data, ["temperature", "temp", "temperature_c"])
  );

  const humidity = validNumber(
    firstValue(data, ["humidity", "relative_humidity"])
  );

  const systemOn = displayBoolean(
    firstValue(data, ["system_on", "monitoring", "switch_on"])
  );

  const suppliedAlert = firstValue(
    data, ["alert", "alarm", "warning"]
  );

  const parsedAlert = displayBoolean(suppliedAlert);

  // The threshold is only a prototype rule for the current raw signal.
  // Prefer an alert value explicitly supplied by the Arduino.
  const alert = parsedAlert !== null
    ? parsedAlert
    : (airRaw !== null ? airRaw > ALERT_THRESHOLD : null);

  const dataAvailable =
    airRaw !== null || temperature !== null || humidity !== null;

  setText("airRaw", displayNumber(airRaw, 0));
  setText("meterValue", displayNumber(airRaw, 0));
  setText("sensorAir", displayNumber(airRaw, 0));
  setText("temperature", displayNumber(temperature, 1));
  setText("humidity", displayNumber(humidity, 0));

  setText(
    "airStatus",
    airRaw === null
      ? "No MQ-135 reading"
      : alert === true
        ? "Threshold exceeded"
        : alert === false
          ? "Below prototype threshold"
          : "Signal received"
  );

  setText(
    "airDescription",
    airRaw === null
      ? "Waiting for a valid analog reading."
      : "Raw sensor signal only. This is not a calibrated air-quality index."
  );

  setText(
    "systemMode",
    systemOn === null
      ? "STATE UNKNOWN"
      : systemOn
        ? "MONITORING ON"
        : "MONITORING OFF"
  );

  setText(
    "switchStatus",
    systemOn === null ? "UNKNOWN" : systemOn ? "ON" : "OFF"
  );

  setText(
    "deviceMessage",
    dataAvailable
      ? "Sensor payload received"
      : "Device responded; waiting for readings"
  );

  setText(
    "alertStatus",
    alert === null ? "UNKNOWN" : alert ? "ALERT" : "NORMAL"
  );

  setText(
    "ledStatus",
    alert === null
      ? "LED state unavailable"
      : alert
        ? "Expected LED state: ON"
        : "Expected LED state: OFF"
  );

  setClass(
    "ledBulb",
    alert === true ? "led-bulb on" : "led-bulb"
  );

  setText(
    "mqStatus",
    airRaw === null ? "NO DATA" : "READING"
  );

  setText(
    "dhtStatus",
    temperature !== null || humidity !== null ? "READING" : "NO DATA"
  );

  setText(
    "ledDeviceState",
    alert === null ? "UNKNOWN" : alert ? "EXPECTED ON" : "EXPECTED OFF"
  );

  setText(
    "switchDeviceState",
    systemOn === null ? "UNKNOWN" : systemOn ? "ON" : "OFF"
  );

  setText(
    "lcdLine1",
    `AIR: ${displayNumber(airRaw, 0)}`
  );

  setText(
    "lcdLine2",
    `TEMP: ${displayNumber(temperature, 1)} HUM: ${displayNumber(humidity, 0)}`
  );

  updateBar("airBar", airRaw === null ? 0 : airRaw / 1023 * 100);
  updateBar("tempBar", temperature === null ? 0 : temperature / 60 * 100);
  updateBar("humidityBar", humidity === null ? 0 : humidity);

  setText(
    "footerUpdate",
    `Last data update: ${new Date().toLocaleTimeString()}`
  );

  // A backend response does not by itself prove the Arduino is connected.
  // The backend must expose device connectivity for that claim.
  const deviceConnected = displayBoolean(
    firstValue(data, ["device_connected", "arduino_connected"])
  );

  if (deviceConnected === true) {
    setText("controllerState", "ONLINE");
  } else if (deviceConnected === false) {
    setText("controllerState", "OFFLINE");
  } else {
    setText("controllerState", "UNVERIFIED");
  }
}

async function getJSON(path) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function loadSensors() {
  const data = await getJSON("/api/sensors");

  // Support either a direct sensor object or a wrapped response.
  const payload = data && (
    data.data ||
    data.sensors ||
    data.latest ||
    data
  );

  updateDashboard(payload);
}

function extractHistory(payload) {
  if (Array.isArray(payload)) return payload;

  if (payload && Array.isArray(payload.history)) return payload.history;
  if (payload && Array.isArray(payload.readings)) return payload.readings;
  if (payload && Array.isArray(payload.data)) return payload.data;

  return [];
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderHistory(payload) {
  const body = $("historyBody");
  if (!body) return;

  const rows = extractHistory(payload);
  body.replaceChildren();

  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = makeCell("No saved readings available yet.");
    cell.colSpan = 5;
    cell.className = "empty-row";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  rows.slice(0, 12).forEach((item) => {
    const airRaw = validNumber(
      firstValue(item, ["air_raw", "mq135_raw", "raw", "mq135"])
    );

    const temperature = validNumber(
      firstValue(item, ["temperature", "temp", "temperature_c"])
    );

    const humidity = validNumber(
      firstValue(item, ["humidity", "relative_humidity"])
    );

    const timestamp = firstValue(
      item, ["timestamp", "created_at", "time", "recorded_at", "date"]
    );

    const suppliedAlert = displayBoolean(
      firstValue(item, ["alert", "alarm", "warning"])
    );

    const alert = suppliedAlert !== null
      ? suppliedAlert
      : airRaw !== null
        ? airRaw > ALERT_THRESHOLD
        : null;

    const row = document.createElement("tr");
    row.appendChild(makeCell(formatTime(timestamp)));
    row.appendChild(makeCell(displayNumber(airRaw, 0)));
    row.appendChild(makeCell(displayNumber(temperature, 1)));
    row.appendChild(makeCell(displayNumber(humidity, 0)));

    const alertCell = document.createElement("td");
    const tag = document.createElement("span");

    tag.className = `alert-tag${alert === true ? " danger" : ""}`;
    tag.textContent = alert === null ? "UNKNOWN" : alert ? "ALERT" : "NORMAL";

    alertCell.appendChild(tag);
    row.appendChild(alertCell);
    body.appendChild(row);
  });
}

async function loadHistory() {
  try {
    const payload = await getJSON("/api/history?limit=12");
    renderHistory(payload);
  } catch (error) {
    console.warn("[AirEdge AI] History unavailable:", error);

    if (!lastKnownData) {
      renderHistory([]);
    }
  }
}

async function refreshDashboard() {
  if (refreshing) return;

  refreshing = true;

  const button = $("refreshButton");
  if (button) {
    button.disabled = true;
    button.textContent = "↻ Loading…";
  }

  try {
    await loadSensors();
    setBackendState(true);
  } catch (error) {
    setConnectionError(error);
  }

  await loadHistory();

  if (button) {
    button.disabled = false;
    button.textContent = "↻ Refresh";
  }

  refreshing = false;
}

function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach((item) => {
        item.classList.remove("active");
      });
      link.classList.add("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);

  setupNavigation();

  const refreshButton = $("refreshButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshDashboard);
  }

  refreshDashboard();
  setInterval(refreshDashboard, REFRESH_INTERVAL);
});