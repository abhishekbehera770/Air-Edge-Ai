
"use strict";

/* AirEdge AI — Cloudflare Remote Backend Configuration */

const CONFIG = {
 API_BASE:
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:5000"
    : window.location.origin,
  SENSOR_ENDPOINT: "/api/sensors",
  HISTORY_ENDPOINT: "/api/history?limit=12",
  POLL_INTERVAL: 3000,
  HISTORY_INTERVAL: 12000,
  REQUEST_TIMEOUT: 10000,
  WARNING_THRESHOLD: 80,
  HIGH_THRESHOLD: 120,
  ADC_MAX: 1023,
  HISTORY_LIMIT: 12
};

const $ = (id) => document.getElementById(id);

const state = {
  latest: null,
  history: [],
  refreshBusy: false,
  sensorOnline: false,
  sensorTimer: null,
  historyTimer: null,
  clockTimer: null,
  observer: null
};

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value);
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstValue(object, keys) {
  if (!object || typeof object !== "object") return null;

  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }

  return null;
}

function normalizePayload(payload) {
  const data =
    payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid sensor response");
  }

  return {
    raw: numberOrNull(firstValue(data, [
      "air_raw", "mq135_raw", "mq135Raw", "raw",
      "raw_value", "analog_value", "sensor_value",
      "gas_raw", "gas_value", "adc"
    ])),

    temperature: numberOrNull(firstValue(data, [
      "temperature", "temp", "temperature_c",
      "temp_c", "dht_temperature"
    ])),

    humidity: numberOrNull(firstValue(data, [
      "humidity", "humidity_percent",
      "relative_humidity", "rh", "dht_humidity"
    ])),

    alert: firstValue(data, [
      "alert", "air_status", "air_quality_status", "level"
    ]),

    status: firstValue(data, ["status", "connection_status"]),

    switchState: firstValue(data, [
      "switch_state", "switchState", "monitoring_switch",
      "monitoring_enabled", "system_on", "monitoring",
      "switch_on", "enabled", "system_enabled"
    ]),

    led: firstValue(data, [
      "led", "led_state", "active_led", "led_status"
    ]),

    buzzer: firstValue(data, [
      "buzzer", "buzzer_state", "alarm_active"
    ]),

    timestamp: firstValue(data, [
      "timestamp", "time", "datetime", "created_at", "updated_at"
    ]),

    original: data
  };
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const text = value.trim().toLowerCase();

    if (["on", "true", "yes", "enabled", "active", "1"].includes(text)) {
      return true;
    }

    if (["off", "false", "no", "disabled", "inactive", "0"].includes(text)) {
      return false;
    }
  }

  return null;
}

/* Classify the raw MQ-135 reading. */

function classify(raw) {
  if (raw === null) {
    return {
      level: "unknown",
      label: "NO DATA",
      color: "var(--muted)",
      percent: 0
    };
  }

  let level = "green";

  if (raw > CONFIG.HIGH_THRESHOLD) {
    level = "red";
  } else if (raw > CONFIG.WARNING_THRESHOLD) {
    level = "yellow";
  }

  const labels = {
    green: "NORMAL",
    yellow: "WARNING",
    red: "HIGH SIGNAL"
  };

  const colors = {
    green: "var(--green)",
    yellow: "var(--yellow)",
    red: "var(--red)"
  };

  return {
    level,
    label: labels[level],
    color: colors[level],
    percent: Math.max(0, Math.min(100, raw / CONFIG.ADC_MAX * 100))
  };
}

function formatTime(value) {
  if (!value) return new Date().toLocaleTimeString();

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString();
}

function updateConnection(online, message = "") {
  state.sensorOnline = online;

  setText("backendBadge", online ? "ONLINE" : "OFFLINE");

  setText(
    "connectionText",
    online ? "Flask backend responding" : message || "Backend unavailable"
  );

  setText("sideConnection", online ? "CONNECTED" : "DISCONNECTED");
  setText("controllerState", online ? "API CONNECTED" : "OFFLINE");

  const dot = $("sideConnectionDot");

  if (dot) {
    dot.classList.toggle("offline", !online);
    dot.classList.toggle("online", online);
  }

  const mode = $("systemMode");
  if (mode) mode.textContent = online ? "LIVE DATA" : "BACKEND OFFLINE";
}

function updateBar(id, percent) {
  const element = $(id);
  if (!element) return;

  element.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

/* LED indicator cards. */

function updateIndicatorCards(classification, data) {
  const cards = {
    green: $("greenCard"),
    yellow: $("yellowCard"),
    red: $("redCard")
  };

  for (const [level, card] of Object.entries(cards)) {
    if (!card) continue;

    const active = classification.level === level;

    card.classList.toggle("active", active);
    card.classList.toggle("inactive", !active);
    card.setAttribute("aria-current", active ? "true" : "false");

    const preview = card.querySelector(".led-preview");
    if (preview) preview.classList.toggle("is-lit", active);

    const foot = card.querySelector(".indicator-foot strong");

    if (foot) {
      foot.textContent = active
        ? level === "green"
          ? "EXPECTED LED ON"
          : level === "yellow"
            ? "WARNING RULE"
            : "HIGH SIGNAL RULE"
        : "OFF";
    }
  }

  const ledReported = data.led !== null && data.led !== undefined;
  const buzzer = normalizeBoolean(data.buzzer);

  setText(
    "ledStatus",
    ledReported
      ? `Reported LED: ${String(data.led).toUpperCase()}`
      : "Physical LED state not reported by device"
  );

  const bulb = $("ledBulb");

  if (bulb) {
    bulb.classList.remove("green", "yellow", "red", "blinking");

    if (ledReported) {
      const ledText = String(data.led).toLowerCase();

      if (ledText.includes("green")) bulb.classList.add("green");
      else if (ledText.includes("yellow")) bulb.classList.add("yellow");
      else if (ledText.includes("red")) bulb.classList.add("red");
    } else if (classification.level !== "unknown") {
      bulb.classList.add(classification.level);
    }

    if (buzzer === true) bulb.classList.add("blinking");
  }

  const halo = $("ledHalo");

  if (halo) {
    halo.classList.remove("green", "yellow", "red", "blinking");

    if (classification.level !== "unknown") {
      halo.classList.add(classification.level);
    }

    if (buzzer === true) halo.classList.add("blinking");
  }

  setText(
    "alertRule",
    classification.level === "green"
      ? "RAW ≤ 80"
      : classification.level === "yellow"
        ? "RAW 81–120"
        : classification.level === "red"
          ? "RAW > 120"
          : "WAITING FOR DATA"
  );

  setText("alertStatus", classification.label);

  if (buzzer !== null) {
    setText("deviceMessage", buzzer ? "Buzzer reported ON" : "Buzzer reported OFF");
  } else if (classification.level === "unknown") {
    setText("deviceMessage", "Waiting for device data");
  }
}

/* LED-based precaution panel. */

function updatePrecautionPanel(classification, raw) {
  const title = $("precautionTitle");
  const description = $("precautionDescription");
  const list = $("precautionList");
  const panel = $("precautionPanel");

  if (!title || !description || !list) return;

  let heading = "Waiting for sensor data";
  let message = "Precautionary actions will appear according to the active LED indicator.";
  let actions = ["Waiting for a valid MQ-135 reading."];
  let level = "unknown";

  if (raw !== null && Number.isFinite(raw)) {
    level = classification.level;

    if (level === "green") {
      heading = "🟢 Green LED — Normal prototype range";
      message =
        `Current raw reading: ${Math.round(raw)} (≤ ${CONFIG.WARNING_THRESHOLD}). ` +
        "Continue routine monitoring. This reading does not certify that the air is safe.";

      actions = [
        "Continue monitoring the sensor reading and watch for sudden changes.",
        "Keep potential pollution sources controlled and maintain normal ventilation.",
        "Do not interpret this raw value as a calibrated AQI or a guarantee of safe air."
      ];
    } else if (level === "yellow") {
      heading = "🟡 Yellow LED — Elevated signal";
      message =
        `Current raw reading: ${Math.round(raw)} ` +
        `(${CONFIG.WARNING_THRESHOLD + 1}–${CONFIG.HIGH_THRESHOLD}). ` +
        "Check the surroundings and take sensible precautions.";

      actions = [
        "Check for nearby fumes, smoke, vapours, or other possible pollution sources without approaching them.",
        "Improve ventilation if it is safe to do so, and avoid the suspected source.",
        "Monitor whether the reading rises or falls. Use a suitable calibrated instrument if air safety is uncertain."
      ];
    } else if (level === "red") {
      heading = "🔴 Red LED — High sensor signal";
      message =
        `Current raw reading: ${Math.round(raw)} (> ${CONFIG.HIGH_THRESHOLD}). ` +
        "Treat this as a warning signal, not a confirmed gas identification or calibrated AQI.";

      actions = [
        "Move away from the suspected source and avoid inhaling fumes or vapours.",
        "Warn nearby people and notify the responsible person or site safety team.",
        "Follow the location's safety or emergency procedures. Do not re-enter the affected area until it has been assessed as safe by qualified personnel."
      ];
    }
  }

  title.textContent = heading;
  description.textContent = message;
  list.replaceChildren();

  actions.forEach((action) => {
    const item = document.createElement("li");
    item.textContent = action;
    list.appendChild(item);
  });

  if (panel) {
    panel.dataset.level = level;

    panel.classList.remove(
      "precaution-green",
      "precaution-yellow",
      "precaution-red",
      "precaution-unknown"
    );

    panel.classList.add(`precaution-${level}`);
  }
}

/* Hardware status indicators. */

function updateDeviceStates(data) {
  setText("controllerState", state.sensorOnline ? "API CONNECTED" : "OFFLINE");

  setText("mqDeviceState", data.raw === null ? "NO READING" : "DATA RECEIVED");

  setText(
    "dhtDeviceState",
    data.temperature !== null || data.humidity !== null
      ? "DATA RECEIVED"
      : "NO READING"
  );

  const ledReported = data.led !== null && data.led !== undefined;
  const ledText = ledReported ? String(data.led).toLowerCase() : "";

  setText(
    "greenDeviceState",
    ledReported
      ? ledText.includes("green") ? "REPORTED ON" : "REPORTED OUTPUT"
      : "STATE NOT REPORTED"
  );

  setText(
    "yellowDeviceState",
    ledReported
      ? ledText.includes("yellow") ? "REPORTED ON" : "REPORTED OUTPUT"
      : "STATE NOT REPORTED"
  );

  setText(
    "redDeviceState",
    ledReported
      ? ledText.includes("red") ? "REPORTED ON" : "REPORTED OUTPUT"
      : "STATE NOT REPORTED"
  );

  const buzzer = normalizeBoolean(data.buzzer);
  const switchState = normalizeBoolean(data.switchState);

  setText(
    "buzzerDeviceState",
    buzzer === null ? "STATE NOT REPORTED" : buzzer ? "REPORTED ON" : "REPORTED OFF"
  );

  setText(
    "switchDeviceState",
    switchState === null ? "STATE NOT REPORTED" : switchState ? "ON" : "OFF"
  );
}

/* Main dashboard update. */

function updateDashboard(data) {
  state.latest = data;

  const classification = classify(data.raw);
  const rawText = data.raw === null ? "--" : String(Math.round(data.raw));

  setText("airRaw", rawText);
  setText("meterValue", rawText);
  setText("sensorAir", rawText);

  setText(
    "airStatus",
    data.raw === null ? "No MQ-135 reading" : classification.label
  );

  setText(
    "airDescription",
    data.raw === null
      ? "Waiting for a valid analog reading."
      : "Raw analog signal only. This is not a calibrated AQI."
  );

  setText("temperature", data.temperature === null ? "--" : data.temperature.toFixed(1));
  setText("humidity", data.humidity === null ? "--" : data.humidity.toFixed(1));
  setText("mqStatus", data.raw === null ? "NO DATA" : "LIVE");

  setText(
    "dhtStatus",
    data.temperature !== null || data.humidity !== null ? "LIVE" : "NO DATA"
  );

  updateBar("airBar", classification.percent);
  updateBar("tempBar", data.temperature === null ? 0 : data.temperature / 50 * 100);
  updateBar("humidityBar", data.humidity === null ? 0 : data.humidity);

  const ring = $("meterRing");

  if (ring) {
    ring.style.setProperty("--signal-color", classification.color);
    ring.style.setProperty("--signal-percent", `${classification.percent}%`);

    ring.style.background =
      `conic-gradient(${classification.color} ${classification.percent * 3.6}deg, rgba(140,170,255,.09) 0deg)`;

    ring.classList.toggle("has-reading", data.raw !== null);
  }

  const airStatus = $("airStatus");
  if (airStatus) airStatus.style.color = classification.color;

  const switchState = normalizeBoolean(data.switchState);

  setText(
    "switchStatus",
    switchState === null ? "NOT REPORTED BY DEVICE" : switchState ? "ON" : "OFF"
  );

  setText("lcdLine1", data.raw === null ? "AIR: ---" : `AIR: ${Math.round(data.raw)}`);

  setText(
    "lcdLine2",
    `TEMP: ${data.temperature === null ? "--" : data.temperature.toFixed(1)}C ` +
    `HUM: ${data.humidity === null ? "--" : data.humidity.toFixed(0)}%`
  );

  setText("footerUpdate", `Latest sample: ${formatTime(data.timestamp)}`);

  updateIndicatorCards(classification, data);
  updatePrecautionPanel(classification, data.raw);
  updateDeviceStates(data);

  document.querySelectorAll(".sensor-card").forEach((card) => {
    card.classList.toggle("sensor-live", state.sensorOnline);
  });

  updateHistoryWithLiveFallback();
}

/* Backend requests. */

async function fetchJSON(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${CONFIG.API_BASE}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${path}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSensors() {
  if (state.refreshBusy) return;
  state.refreshBusy = true;

  try {
    const payload = await fetchJSON(CONFIG.SENSOR_ENDPOINT);
    const data = normalizePayload(payload);

    updateConnection(true);
    updateDashboard(data);
  } catch (error) {
    updateConnection(
      false,
      error.name === "AbortError" ? "Sensor request timed out" : "Backend request failed"
    );

    setText("deviceMessage", "Cannot receive live sensor data");
    console.error("[AirEdge AI] Sensor request failed:", error);
  } finally {
    state.refreshBusy = false;
  }
}

/* History table. */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getHistoryRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.readings)) return payload.readings;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function renderHistory(records) {
  const body = $("historyBody");
  if (!body) return;

  if (!records.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">No saved history records are available.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = records.map((record) => {
    const data = normalizePayload(record);
    const classification = classify(data.raw);

    return `
      <tr>
        <td>${escapeHTML(formatTime(data.timestamp))}</td>
        <td>${escapeHTML(data.raw === null ? "--" : Math.round(data.raw))}</td>
        <td>${escapeHTML(data.temperature === null ? "--" : data.temperature.toFixed(1))} °C</td>
        <td>${escapeHTML(data.humidity === null ? "--" : data.humidity.toFixed(1))}%</td>
        <td><span class="level-pill level-${escapeHTML(classification.level)}">${escapeHTML(classification.label)}</span></td>
      </tr>
    `;
  }).join("");
}

function updateHistoryWithLiveFallback() {
  if (state.history.length) {
    renderHistory(state.history);
    return;
  }

  if (state.latest) {
    renderHistory([state.latest]);

    setText(
      "footerUpdate",
      `LIVE SAMPLE ONLY · ${formatTime(state.latest.timestamp)} · No saved history returned by API`
    );
  }
}

async function refreshHistory() {
  try {
    const payload = await fetchJSON(CONFIG.HISTORY_ENDPOINT);

    state.history = getHistoryRecords(payload).slice(0, CONFIG.HISTORY_LIMIT);

    if (state.history.length) renderHistory(state.history);
    else updateHistoryWithLiveFallback();
  } catch (error) {
    console.warn("[AirEdge AI] History endpoint unavailable:", error);
    updateHistoryWithLiveFallback();
  }
}

/* Navigation. */

function initializeNavigation() {
  const links = [...document.querySelectorAll(".nav-link")];

  const sections = links.map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? $(id) : null;
    return target ? { link, target, id } : null;
  }).filter(Boolean);

  function setActive(id) {
    links.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);

      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href")?.slice(1);
      const target = id ? $(id) : null;
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
      setActive(id);
    });
  });

  if ("IntersectionObserver" in window) {
    state.observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length) setActive(visible[0].target.id);
    }, {
      rootMargin: "-18% 0px -62% 0px",
      threshold: [0, 0.1, 0.25, 0.5]
    });

    sections.forEach(({ target }) => state.observer.observe(target));
  }

  const initialId = location.hash.slice(1);

  if (sections.some((section) => section.id === initialId)) setActive(initialId);
  else setActive("overview");
}

/* Clock. */

function updateClock() {
  setText(
    "clock",
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
  );

  setText("year", new Date().getFullYear());
}

/* Startup. */

function initializeDashboard() {
  setText("backendAddress", new URL(CONFIG.API_BASE).host);

  initializeNavigation();
  updateClock();

  state.clockTimer = setInterval(updateClock, 1000);

  const refreshButton = $("refreshButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      refreshButton.disabled = true;

      try {
        await refreshSensors();
        await refreshHistory();
      } finally {
        refreshButton.disabled = false;
      }
    });
  }

  refreshSensors();
  refreshHistory();

  state.sensorTimer = setInterval(refreshSensors, CONFIG.POLL_INTERVAL);
  state.historyTimer = setInterval(refreshHistory, CONFIG.HISTORY_INTERVAL);

  window.addEventListener("online", refreshSensors);

  window.addEventListener("offline", () => {
    updateConnection(false, "Browser is offline");
  });

  window.addEventListener("beforeunload", () => {
    clearInterval(state.sensorTimer);
    clearInterval(state.historyTimer);
    clearInterval(state.clockTimer);
    state.observer?.disconnect();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDashboard, { once: true });
} else {
  initializeDashboard();
}
