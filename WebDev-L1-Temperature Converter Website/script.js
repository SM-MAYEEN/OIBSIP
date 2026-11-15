(function () {
  "use strict";

  var form = document.getElementById("converter-form");
  var input = document.getElementById("temp-input");
  var select = document.getElementById("unit-select");
  var errorEl = document.getElementById("error-msg");
  var resultsEl = document.getElementById("results");
  var outputs = {
    C: document.getElementById("out-C"),
    F: document.getElementById("out-F"),
    K: document.getElementById("out-K")
  };

  var ABSOLUTE_ZERO_C = -273.15;
  var ABSOLUTE_ZERO_F = -459.67;
  var ABSOLUTE_ZERO_K = 0;

  // Accepts optional sign, digits, optional decimal part (e.g. "-40", "3.5", ".5", "+12").
  var NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/;

  // --- Conversion helpers: everything goes through Celsius ---
  function toCelsius(value, unit) {
    if (unit === "C") return value;
    if (unit === "F") return (value - 32) * 5 / 9;
    return value - 273.15; // Kelvin
  }

  function fromCelsius(c) {
    return {
      C: c,
      F: c * 9 / 5 + 32,
      K: c + 273.15
    };
  }

  // --- Validation ---
  // Returns { ok: true, value } or { ok: false, message }
  function validate() {
    var raw = input.value.trim();

    if (raw === "") {
      return { ok: false, message: "Please enter a temperature value." };
    }
    if (!NUMBER_PATTERN.test(raw)) {
      return { ok: false, message: "Invalid input: please enter a number (e.g. 25 or -40.5)." };
    }

    var value = parseFloat(raw);
    if (!isFinite(value)) {
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

  function format(n) {
    // Round to 2 decimals, avoid "-0" and trailing zeros.
    var rounded = Math.round(n * 100) / 100;
    if (Object.is(rounded, -0)) rounded = 0;
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function convert() {
    var result = validate();
    if (!result.ok) {
      showError(result.message);
      return;
    }

    clearError();
    var all = fromCelsius(toCelsius(result.value, select.value));

    outputs.C.textContent = format(all.C) + " °C";
    outputs.F.textContent = format(all.F) + " °F";
    outputs.K.textContent = format(all.K) + " K";
    resultsEl.hidden = false;
  }

  // Convert button (form submit also covers pressing Enter)
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    convert();
  });

  // Real-time validation while typing (errors only; conversion waits for the button)
  input.addEventListener("input", function () {
    if (input.value.trim() === "") {
      clearError();
      resultsEl.hidden = true;
      return;
    }
    var result = validate();
    if (result.ok) {
      clearError();
    } else {
      showError(result.message);
    }
  });

  // Re-check absolute-zero limit if the unit changes
  select.addEventListener("change", function () {
    if (input.value.trim() === "") return;
    var result = validate();
    if (result.ok) {
      clearError();
    } else {
      showError(result.message);
    }
  });
})();