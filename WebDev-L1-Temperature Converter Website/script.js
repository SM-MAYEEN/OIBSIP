(function () {
  "use strict";

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var form = $("converter-form");
  var input = $("temp-input");
  var select = $("unit-select");
  var errorEl = $("error-msg");
  var liveToggle = $("live-toggle");
  var resetBtn = $("reset-btn");
  var resultsEl = $("results");
  var feelEl = $("feel");
  var formulaEl = $("formula");
  var thermoFill = $("thermo-fill");
  var themeBtn = $("theme-toggle");
  var historySection = $("history-section");
  var historyList = $("history-list");
  var clearHistoryBtn = $("clear-history");
  var toastEl = $("toast");
  var outputs = { C: $("out-C"), F: $("out-F"), K: $("out-K") };

  // ---------- Constants ----------
  var ABSOLUTE_ZERO_C = -273.15;
  var ABSOLUTE_ZERO_F = -459.67;
  var ABSOLUTE_ZERO_K = 0;
  var MAX_ABS_VALUE = 1e15;
  var HISTORY_LIMIT = 8;
  var DEFAULT_HUE = 215;
  var SYMBOL = { C: "°C", F: "°F", K: "K" };
  var NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/;

  var FORMULAS = {
    C: "°F = °C × 9/5 + 32   |   K = °C + 273.15",
    F: "°C = (°F − 32) × 5/9   |   K = (°F − 32) × 5/9 + 273.15",
    K: "°C = K − 273.15   |   °F = (K − 273.15) × 9/5 + 32"
  };

  // ---------- Storage helpers (safe if storage is blocked) ----------
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // ---------- Conversion (everything goes through Celsius) ----------
  function toCelsius(value, unit) {
    if (unit === "C") return value;
    if (unit === "F") return (value - 32) * 5 / 9;
    return value - 273.15;
  }

  function fromCelsius(c) {
    return { C: c, F: c * 9 / 5 + 32, K: c + 273.15 };
  }

  // ---------- Formatting ----------
  function format(n, maxDecimals) {
    var p = Math.pow(10, maxDecimals === undefined ? 2 : maxDecimals);
    var rounded = Math.round(n * p) / p;
    if (Object.is(rounded, -0)) rounded = 0;
    return rounded.toLocaleString("en-US", { maximumFractionDigits: maxDecimals === undefined ? 2 : maxDecimals });
  }

  // ---------- Validation ----------
  function validate() {
    var raw = input.value.trim();

    if (raw === "") {
      return { ok: false, message: "Please enter a temperature value." };
    }
    if (!NUMBER_PATTERN.test(raw)) {
      return { ok: false, message: "Invalid input: please enter a number (e.g. 25 or -40.5)." };
    }

    var value = parseFloat(raw);
    if (!isFinite(value) || Math.abs(value) > MAX_ABS_VALUE) {
      return { ok: false, message: "That number is too large. Please enter a smaller value." };
    }

    var unit = select.value;
    if (unit === "C" && value < ABSOLUTE_ZERO_C) {
      return { ok: false, message: "Below absolute zero! Temperatures cannot be lower than −273.15 °C." };
    }
    if (unit === "F" && value < ABSOLUTE_ZERO_F) {
      return { ok: false, message: "Below absolute zero! Temperatures cannot be lower than −459.67 °F." };
    }
    if (unit === "K" && value < ABSOLUTE_ZERO_K) {
      return { ok: false, message: "Below absolute zero! Kelvin cannot be negative." };
    }
    return { ok: true, value: value };
  }

  function showError(message) {
    errorEl.textContent = message;
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    resultsEl.hidden = true;
  }

  function clearError() {
    errorEl.textContent = "";
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  }

  // ---------- Visual feedback ----------
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  // -50 °C → blue (210), 150 °C → red (0)
  function hueFor(c) {
    var t = clamp((c + 50) / 200, 0, 1);
    return Math.round(210 - 210 * t);
  }

  function applyVisuals(c) {
    var t = clamp((c + 50) / 200, 0, 1);
    document.documentElement.style.setProperty("--hue", hueFor(c));
    thermoFill.style.height = clamp(t * 100, 4, 100) + "%";
  }

  function feelText(c) {
    if (c <= ABSOLUTE_ZERO_C + 0.005) return "🧊 Absolute zero. Nothing can be colder!";
    if (c < -30) return "🥶 Extremely freezing";
    if (c <= 0) return "❄️ Freezing";
    if (c < 10) return "🧥 Cold";
    if (c < 20) return "🌤️ Cool";
    if (c < 28) return "😊 Comfortable";
    if (c < 35) return "☀️ Warm";
    if (c < 50) return "🥵 Hot";
    if (c < 100) return "🔥 Dangerously hot";
    return "♨️ At or above the boiling point of water";
  }

  // ---------- Convert ----------
  var lastResult = null;

  function convert(addToHistory) {
    var result = validate();
    if (!result.ok) {
      showError(result.message);
      return;
    }
    clearError();

    var unit = select.value;
    var c = toCelsius(result.value, unit);
    var all = fromCelsius(c);
    lastResult = all;

    outputs.C.textContent = format(all.C) + " °C";
    outputs.F.textContent = format(all.F) + " °F";
    outputs.K.textContent = format(all.K) + " K";
    feelEl.textContent = feelText(c);
    formulaEl.textContent = FORMULAS[unit];
    applyVisuals(c);
    resultsEl.hidden = false;

    if (addToHistory) pushHistory(result.value, unit, c);
  }

  // ---------- History ----------
  var history = (function () {
    var stored = load("tc-history", []);
    if (!Array.isArray(stored)) return [];
    return stored.filter(function (h) {
      return h && typeof h.v === "number" && typeof h.c === "number" && SYMBOL[h.u];
    }).slice(0, HISTORY_LIMIT);
  })();

  function pushHistory(v, u, c) {
    if (history.length && history[0].v === v && history[0].u === u) return;
    history.unshift({ v: v, u: u, c: c });
    history = history.slice(0, HISTORY_LIMIT);
    save("tc-history", history);
    renderHistory();
  }

  function renderHistory() {
    historyList.textContent = "";
    historySection.hidden = history.length === 0;

    history.forEach(function (h) {
      var all = fromCelsius(h.c);
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.textContent = format(h.v, 6) + " " + SYMBOL[h.u] + "  →  " +
        format(all.C) + " °C · " + format(all.F) + " °F · " + format(all.K) + " K";
      btn.addEventListener("click", function () {
        input.value = String(h.v);
        select.value = h.u;
        convert(false);
      });
      li.appendChild(btn);
      historyList.appendChild(li);
    });
  }

  clearHistoryBtn.addEventListener("click", function () {
    history = [];
    save("tc-history", history);
    renderHistory();
  });

  // ---------- Toast & copy ----------
  var toastTimer = null;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!lastResult) return;
      var key = btn.getAttribute("data-copy");
      var text = format(lastResult[key]) + " " + SYMBOL[key];
      copyText(text).then(
        function () { toast("Copied: " + text); },
        function () { toast("Could not copy. Please copy manually."); }
      );
    });
  });

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  var savedTheme = load("tc-theme", null);
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : (prefersDark ? "dark" : "light"));

  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    save("tc-theme", next);
  });

  // ---------- Events ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    convert(true);
  });

  input.addEventListener("input", function () {
    if (input.value.trim() === "") {
      clearError();
      resultsEl.hidden = true;
      return;
    }
    if (liveToggle.checked) {
      convert(false);
      return;
    }
    var result = validate();
    if (result.ok) clearError(); else showError(result.message);
  });

  select.addEventListener("change", function () {
    if (input.value.trim() === "") return;
    if (liveToggle.checked) {
      convert(false);
      return;
    }
    var result = validate();
    if (result.ok) clearError(); else showError(result.message);
  });

  liveToggle.addEventListener("change", function () {
    if (liveToggle.checked && input.value.trim() !== "") convert(false);
  });

  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      input.value = chip.getAttribute("data-value");
      select.value = chip.getAttribute("data-unit");
      convert(true);
    });
  });

  resetBtn.addEventListener("click", function () {
    input.value = "";
    select.value = "C";
    clearError();
    resultsEl.hidden = true;
    lastResult = null;
    document.documentElement.style.setProperty("--hue", DEFAULT_HUE);
    input.focus();
  });

  // ---------- Init ----------
  renderHistory();
})();