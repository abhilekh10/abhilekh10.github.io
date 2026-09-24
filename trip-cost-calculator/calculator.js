/* =========================================================
   Bookbindass \u2014 Trip Cost Calculator
   Vanilla JS, no dependencies. Runs entirely client-side so it
   works on GitHub Pages with no backend.
   ========================================================= */
(function () {
  "use strict";

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     Insert your affiliate / partner links here. Nothing else
     in this file needs to change to update where the booking
     buttons on the result screen point to.
     --------------------------------------------------------- */
  var BOOKING_LINKS = {
    flights: "#",
    hotels: "#",
    activities: "#"
  };

  var TOTAL_STEPS = 7;
  var STEP_NAMES = {
    1: "Trip details",
    2: "Travel cost",
    3: "Hotel",
    4: "Food",
    5: "Local transport",
    6: "Activities",
    7: "Shopping & misc"
  };

  var form = $("#calcForm");
  if (!form) return; // calculator markup not present on this page

  var currentStep = 1;
  var nightsTouched = false;
  var hasNavigated = false;

  /* ---------- helpers ---------- */

  // Every numeric read goes through this: blocks NaN, blocks negatives,
  // and lets us cap a field (e.g. adults <= 20) in one place.
  function num(value, opts) {
    opts = opts || {};
    var n = parseFloat(value);
    if (!isFinite(n) || isNaN(n)) n = opts.fallback !== undefined ? opts.fallback : 0;
    if (n < 0) n = 0;
    if (opts.min !== undefined && n < opts.min) n = opts.min;
    if (opts.max !== undefined && n > opts.max) n = opts.max;
    return n;
  }

  function fieldNum(id, opts) {
    var el = document.getElementById(id);
    return el ? num(el.value, opts) : (opts && opts.fallback) || 0;
  }

  var currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });

  function formatINR(amount) {
    return currencyFormatter.format(Math.round(num(amount)));
  }

  // Plain "1,23,456" without the currency symbol, for copy-to-clipboard text.
  function formatNumberINR(amount) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(num(amount)));
  }

  /* ---------- stepper controls (adults / children / days / nights / rooms) ---------- */
  $$("[data-stepper]").forEach(function (wrap) {
    var input = $("input", wrap);
    var min = num(input.min, { fallback: 0 });
    var max = input.max ? num(input.max, { fallback: 9999 }) : 9999;

    $$(".stepper-btn", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var step = btn.dataset.action === "inc" ? 1 : -1;
        var next = num(input.value, { fallback: min }) + step;
        if (next < min) next = min;
        if (next > max) next = max;
        input.value = next;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });

    input.addEventListener("input", function () {
      var v = num(input.value, { fallback: min, min: min, max: max });
      // don't fight the user mid-keystroke on an empty field
      if (input.value !== "" ) input.value = v;
    });
  });

  /* ---------- days -> nights auto-calc ---------- */
  var daysInput = $("#fieldDays");
  var nightsInput = $("#fieldNights");

  function syncNightsFromDays() {
    if (nightsTouched) return;
    var days = num(daysInput.value, { fallback: 1, min: 1 });
    nightsInput.value = Math.max(0, days - 1);
  }

  daysInput.addEventListener("input", syncNightsFromDays);
  nightsInput.addEventListener("input", function () { nightsTouched = true; });

  /* ---------- selectable option cards (travel style / travel mode) ---------- */
  $$(".option-cards").forEach(function (group) {
    var radios = $$('input[type="radio"]', group);
    function refresh() {
      radios.forEach(function (r) {
        r.closest(".option-card").classList.toggle("is-selected", r.checked);
      });
    }
    radios.forEach(function (r) { r.addEventListener("change", refresh); });
    refresh();
  });

  /* ---------- quick pills (food / local transport presets) ---------- */
  function wirePillGroup(pillsId, hiddenId, customFieldId, customInputId) {
    var pillsGroup = document.getElementById(pillsId);
    var hidden = document.getElementById(hiddenId);
    var customField = document.getElementById(customFieldId);
    var customInput = document.getElementById(customInputId);
    if (!pillsGroup) return;

    var pills = $$(".quick-pill", pillsGroup);

    function selectPill(pill) {
      pills.forEach(function (p) { p.classList.toggle("is-active", p === pill); });
      if (pill.dataset.value === "custom") {
        customField.hidden = false;
        hidden.value = num(customInput.value, { fallback: 0 });
        customInput.focus();
      } else {
        customField.hidden = true;
        hidden.value = num(pill.dataset.value);
      }
      renderLiveCalcs();
    }

    pills.forEach(function (pill) {
      pill.addEventListener("click", function () { selectPill(pill); });
    });

    if (customInput) {
      customInput.addEventListener("input", function () {
        hidden.value = num(customInput.value, { fallback: 0 });
        renderLiveCalcs();
      });
    }
  }

  wirePillGroup("foodPills", "fieldFood", "foodCustomField", "fieldFoodCustom");
  wirePillGroup("transportPills", "fieldTransport", "transportCustomField", "fieldTransportCustom");

  /* ---------- collect current state from the form ---------- */
  function getState() {
    var adults = fieldNum("fieldAdults", { fallback: 1, min: 1, max: 20 });
    var children = fieldNum("fieldChildren", { fallback: 0, min: 0, max: 20 });
    var days = fieldNum("fieldDays", { fallback: 1, min: 1, max: 60 });
    var nights = fieldNum("fieldNights", { fallback: Math.max(0, days - 1), min: 0, max: 60 });
    var rooms = fieldNum("fieldRooms", { fallback: 1, min: 1, max: 20 });

    return {
      from: ($("#fieldFrom").value || "").trim(),
      destination: ($("#fieldDestination").value || "").trim(),
      adults: adults,
      children: children,
      travelers: Math.max(1, adults + children),
      days: days,
      nights: nights,
      travelStyle: (form.querySelector('input[name="travelStyle"]:checked') || {}).value || "comfort",
      travelMode: (form.querySelector('input[name="travelMode"]:checked') || {}).value || "flight",
      travelCostPerPerson: fieldNum("fieldTravelCost", { fallback: 0, min: 0 }),
      hotelCostPerNight: fieldNum("fieldHotelCost", { fallback: 0, min: 0 }),
      rooms: rooms,
      foodPerPersonPerDay: fieldNum("fieldFood", { fallback: 0, min: 0 }),
      localTransportPerDay: fieldNum("fieldTransport", { fallback: 0, min: 0 }),
      activitiesPerPerson: fieldNum("fieldActivities", { fallback: 0, min: 0 }),
      shopping: fieldNum("fieldShopping", { fallback: 0, min: 0 })
    };
  }

  function computeCosts(state) {
    var travel = state.travelCostPerPerson * state.travelers;
    var hotel = state.hotelCostPerNight * state.rooms * state.nights;
    var food = state.foodPerPersonPerDay * state.travelers * state.days;
    var transport = state.localTransportPerDay * state.days;
    var activities = state.activitiesPerPerson * state.travelers;
    var shopping = state.shopping;
    var total = travel + hotel + food + transport + activities + shopping;

    return {
      travel: travel, hotel: hotel, food: food, transport: transport,
      activities: activities, shopping: shopping, total: total,
      perPerson: total / state.travelers,
      recommended: total * 1.1
    };
  }

  /* ---------- live "show the math" readouts ---------- */
  function renderLiveCalcs() {
    var state = getState();
    var costs = computeCosts(state);

    var travelerWord = state.travelers === 1 ? "traveler" : "travelers";

    setText("liveTravelCost",
      formatINR(state.travelCostPerPerson) + " \u00D7 " + state.travelers + " " + travelerWord +
      " = " + formatINR(costs.travel));

    setText("liveHotelCost",
      formatINR(state.hotelCostPerNight) + " \u00D7 " + state.rooms + (state.rooms === 1 ? " room" : " rooms") +
      " \u00D7 " + state.nights + (state.nights === 1 ? " night" : " nights") +
      " = " + formatINR(costs.hotel));

    setText("liveFoodCost",
      formatINR(state.foodPerPersonPerDay) + " \u00D7 " + state.travelers + " " + travelerWord +
      " \u00D7 " + state.days + (state.days === 1 ? " day" : " days") +
      " = " + formatINR(costs.food));

    setText("liveTransportCost",
      formatINR(state.localTransportPerDay) + " \u00D7 " + state.days + (state.days === 1 ? " day" : " days") +
      " = " + formatINR(costs.transport));

    setText("liveActivitiesCost",
      formatINR(state.activitiesPerPerson) + " \u00D7 " + state.travelers + " " + travelerWord +
      " = " + formatINR(costs.activities));
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  form.addEventListener("input", renderLiveCalcs);
  form.addEventListener("change", renderLiveCalcs);

  /* ---------- step validation ---------- */
  function clearError(id) {
    setText(id, "");
    var errEl = document.getElementById(id);
    var field = errEl && errEl.closest(".field");
    if (field) field.classList.remove("has-error");
  }

  function showError(id, message) {
    setText(id, message);
    var errEl = document.getElementById(id);
    if (errEl) { var f = errEl.closest(".field"); if (f) f.classList.add("has-error"); }
  }

  function validateStep(step) {
    var ok = true;

    if (step === 1) {
      clearError("errFrom"); clearError("errDestination"); clearError("errDays");

      if (!$("#fieldFrom").value.trim()) { showError("errFrom", "Please tell us where you're travelling from."); ok = false; }
      if (!$("#fieldDestination").value.trim()) { showError("errDestination", "Please tell us your destination."); ok = false; }
      if (fieldNum("fieldDays", { fallback: 0 }) < 1) { showError("errDays", "Trip must be at least 1 day."); ok = false; }
    }

    if (step === 2) {
      clearError("errTravelCost");
      if (fieldNum("fieldTravelCost", { fallback: -1 }) < 0) { showError("errTravelCost", "Enter 0 or more."); ok = false; }
    }

    if (step === 3) {
      clearError("errHotelCost");
      if (fieldNum("fieldHotelCost", { fallback: -1 }) < 0) { showError("errHotelCost", "Enter 0 or more."); ok = false; }
    }

    return ok;
  }

  /* ---------- step navigation ---------- */
  var backBtn = $("#calcBack");
  var nextBtn = $("#calcNext");
  var calcBtn = $("#calcCalculate");

  function renderStep() {
    $$(".calc-step", form).forEach(function (step) {
      step.classList.toggle("is-active", Number(step.dataset.step) === currentStep);
    });

    setText("calcStepNow", currentStep);
    setText("calcStepName", STEP_NAMES[currentStep]);
    $("#calcProgressFill").style.width = (currentStep / TOTAL_STEPS * 100) + "%";

    backBtn.hidden = currentStep === 1;
    nextBtn.hidden = currentStep === TOTAL_STEPS;
    calcBtn.hidden = currentStep !== TOTAL_STEPS;

    renderLiveCalcs();

    // move focus to the step heading so keyboard/screen-reader users land
    // on the new step instead of staying on a now-hidden "Next" button \u2014
    // skipped on the very first render so page load doesn't steal focus
    if (hasNavigated) {
      var heading = $(".calc-step.is-active .calc-step-title", form);
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      }
    }
  }

  nextBtn.addEventListener("click", function () {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) currentStep++;
    hasNavigated = true;
    renderStep();
    scrollToCalculator();
  });

  backBtn.addEventListener("click", function () {
    if (currentStep > 1) currentStep--;
    hasNavigated = true;
    renderStep();
    scrollToCalculator();
  });

  function scrollToCalculator() {
    var el = $("#calculator");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- smart budget insights (rule-based, no API) ---------- */
  function buildInsights(state, costs) {
    var insights = [];

    if (costs.total > 0) {
      var hotelPct = Math.round((costs.hotel / costs.total) * 100);
      insights.push("Your hotel represents " + hotelPct + "% of your total budget.");
    }

    var hotelSaving = 1000 * state.rooms * state.nights;
    if (hotelSaving > 0) {
      insights.push("Choosing a hotel \u20B91,000 cheaper per night could save approximately " + formatINR(hotelSaving) + ".");
    }

    if (state.foodPerPersonPerDay > 0) {
      insights.push("Food is approximately " + formatINR(state.foodPerPersonPerDay) + " per traveler per day.");
    }

    if (state.days > 0) {
      insights.push("Your estimated daily trip cost is " + formatINR(costs.total / state.days) + ".");
    }

    insights.push("Adding a 10% emergency buffer would make your recommended budget " + formatINR(costs.recommended) + ".");

    if (costs.total > 0) {
      var travelPct = Math.round((costs.travel / costs.total) * 100);
      if (travelPct >= 35) {
        insights.push("Travel is a large share of this trip (" + travelPct + "%) \u2014 flexible dates or an earlier booking could bring this down.");
      }
    }

    return insights;
  }

  /* ---------- render result ---------- */
  var lastState = null;
  var lastCosts = null;

  function renderResult() {
    var state = getState();
    var costs = computeCosts(state);
    lastState = state; lastCosts = costs;

    var travelerWord = state.travelers === 1 ? "Traveler" : "Travelers";
    var routeText = (state.from || "Your city") + " \u2192 " + (state.destination || "Your destination");
    var metaText = state.days + (state.days === 1 ? " Day" : " Days") + " \u2022 " +
      state.nights + (state.nights === 1 ? " Night" : " Nights") + " \u2022 " +
      state.travelers + " " + travelerWord;

    setText("resRoute", routeText);
    setText("resMeta", metaText);
    setText("resTotal", formatINR(costs.total));
    setText("resPerPerson", formatINR(costs.perPerson));
    setText("resRecommended", formatINR(costs.recommended));
    setText("breakdownTotal", formatINR(costs.total));

    var rows = [
      ["Travel", costs.travel],
      ["Hotel", costs.hotel],
      ["Food", costs.food],
      ["Local transport", costs.transport],
      ["Activities", costs.activities],
      ["Shopping / misc", costs.shopping]
    ];

    var breakdownList = $("#breakdownList");
    breakdownList.innerHTML = rows.map(function (r) {
      return '<div class="breakdown-row"><dt>' + r[0] + '</dt><dd>' + formatINR(r[1]) + "</dd></div>";
    }).join("");

    var barsWrap = $("#progressBars");
    barsWrap.innerHTML = rows.map(function (r) {
      var pct = costs.total > 0 ? Math.round((r[1] / costs.total) * 100) : 0;
      return (
        '<div class="progress-bar-row">' +
          '<div class="progress-bar-top"><span>' + r[0] + '</span><span>' + pct + '%</span></div>' +
          '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
        '</div>'
      );
    }).join("");

    var insightsList = $("#insightsList");
    insightsList.innerHTML = buildInsights(state, costs).map(function (line) {
      return "<li>" + line + "</li>";
    }).join("");

    $("#bookFlights").href = BOOKING_LINKS.flights;
    $("#bookHotels").href = BOOKING_LINKS.hotels;
    $("#bookActivities").href = BOOKING_LINKS.activities;

    $("#calcForm").hidden = true;
    $(".calc-progress").hidden = true;
    $("#calcResult").hidden = false;
    setText("copyFeedback", "");
    $("#calcResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  calcBtn.addEventListener("click", function () {
    // run every step's validation once more before computing a final number
    for (var s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        currentStep = s;
        renderStep();
        scrollToCalculator();
        return;
      }
    }
    renderResult();
  });

  /* ---------- adjust / start new / copy ---------- */
  $("#btnAdjust").addEventListener("click", function () {
    $("#calcResult").hidden = true;
    $("#calcForm").hidden = false;
    $(".calc-progress").hidden = false;
    currentStep = 1;
    hasNavigated = true;
    renderStep();
    scrollToCalculator();
  });

  $("#btnStartNew").addEventListener("click", function () {
    form.reset();
    nightsTouched = false;
    // restore preset defaults for the two pill groups
    resetPillGroup("foodPills", "1200", "fieldFood", "foodCustomField", "fieldFoodCustom");
    resetPillGroup("transportPills", "1000", "fieldTransport", "transportCustomField", "fieldTransportCustom");
    $$(".option-cards").forEach(function (group) {
      $$(".option-card", group).forEach(function (card) { card.classList.remove("is-selected"); });
      var checked = form.querySelector('input[name="' + $("input", group).name + '"]:checked');
      if (checked) checked.closest(".option-card").classList.add("is-selected");
    });
    syncNightsFromDays();

    $("#calcResult").hidden = true;
    $("#calcForm").hidden = false;
    $(".calc-progress").hidden = false;
    currentStep = 1;
    hasNavigated = true;
    renderStep();
    scrollToCalculator();
  });

  function resetPillGroup(pillsId, defaultValue, hiddenId, customFieldId, customInputId) {
    var group = document.getElementById(pillsId);
    if (!group) return;
    $$(".quick-pill", group).forEach(function (p) {
      p.classList.toggle("is-active", p.dataset.value === defaultValue);
    });
    document.getElementById(hiddenId).value = defaultValue;
    document.getElementById(customFieldId).hidden = true;
    document.getElementById(customInputId).value = "";
  }

  // Emoji are written as \u{...} escapes (pure ASCII in this source file)
  // rather than literal characters. Some static file servers \u2014 including a
  // plain `python -m http.server` \u2014 send `text/javascript` with no charset,
  // and this browser's <script src> loader (unlike fetch().text()) doesn't
  // reliably fall back to UTF-8 for it, which was silently corrupting every
  // literal emoji into "U+FFFD" once loaded. Escapes sidestep the problem
  // entirely since there are no multi-byte characters in the file to misread.
  var EMOJI = {
    suitcase: "\u{1F9F3}",
    calendar: "\u{1F4C5}",
    people: "\u{1F465}",
    plane: "\u{2708}\u{FE0F}",
    hotel: "\u{1F3E8}",
    food: "\u{1F37D}\u{FE0F}",
    taxi: "\u{1F695}",
    ticket: "\u{1F39F}\u{FE0F}",
    bags: "\u{1F6CD}\u{FE0F}",
    globe: "\u{1F310}"
  };

  // Shared by "Copy trip budget" and "Share on WhatsApp" \u2014 `whatsapp: true`
  // adds WhatsApp's own *bold*/_italic_ markup and a couple of emoji so the
  // shared message reads as a formatted card rather than a wall of text.
  function buildSummaryText(state, costs, whatsapp) {
    var b = whatsapp ? "*" : "";
    var i = whatsapp ? "_" : "";
    var lines = [
      b + "My " + (state.destination || "Trip") + " Trip" + b + (whatsapp ? " " + EMOJI.suitcase : ""),
      (whatsapp ? EMOJI.calendar + " " : "") + state.days + (state.days === 1 ? " Day" : " Days") + " / " +
        state.nights + (state.nights === 1 ? " Night" : " Nights"),
      (whatsapp ? EMOJI.people + " " : "") + state.travelers + (state.travelers === 1 ? " Traveler" : " Travelers"),
      ""
    ];
    if (whatsapp) lines.push(b + "Cost Breakdown" + b);
    lines.push((whatsapp ? EMOJI.plane + " " : "") + "Travel: \u20B9" + formatNumberINR(costs.travel));
    lines.push((whatsapp ? EMOJI.hotel + " " : "") + "Hotel: \u20B9" + formatNumberINR(costs.hotel));
    lines.push((whatsapp ? EMOJI.food + " " : "") + "Food: \u20B9" + formatNumberINR(costs.food));
    lines.push((whatsapp ? EMOJI.taxi + " " : "") + "Transport: \u20B9" + formatNumberINR(costs.transport));
    lines.push((whatsapp ? EMOJI.ticket + " " : "") + "Activities: \u20B9" + formatNumberINR(costs.activities));
    if (costs.shopping > 0) lines.push((whatsapp ? EMOJI.bags + " " : "") + "Shopping/Misc: \u20B9" + formatNumberINR(costs.shopping));
    lines.push("");
    lines.push(b + "Estimated Total: \u20B9" + formatNumberINR(costs.total) + b);
    lines.push(b + "Recommended Budget: \u20B9" + formatNumberINR(costs.recommended) + b);
    lines.push("");
    lines.push(i + "Planned using BookBindass.com" + i + (whatsapp ? " " + EMOJI.globe : ""));
    if (whatsapp) lines.push("https://bookbindass.com/trip-cost-calculator/");

    return lines.join("\n");
  }

  $("#btnWhatsAppShare").addEventListener("click", function (e) {
    if (!lastState || !lastCosts) { e.preventDefault(); return; }
    var text = buildSummaryText(lastState, lastCosts, true);
    this.href = "https://wa.me/?text=" + encodeURIComponent(text);
  });

  $("#btnCopy").addEventListener("click", function () {
    if (!lastState || !lastCosts) return;
    var text = buildSummaryText(lastState, lastCosts, false);

    function done(ok) {
      setText("copyFeedback", ok ? "Copied to clipboard \u2713" : "Couldn't copy automatically \u2014 please select and copy the summary manually.");
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      // very old browser / http:// fallback
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  });

  /* ---------- init ---------- */
  syncNightsFromDays();
  renderStep();
})();
