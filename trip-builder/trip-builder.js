/* =========================================================
   Bookbindass Visual Trip Builder — engine
   ---------------------------------------------------------
   This file is destination-agnostic: it never mentions
   "Dubai" and reads everything from window.TB_DESTINATIONS
   (see trip-data.js). Today that object only has a "dubai"
   entry, so this preview only builds Dubai journeys — but
   adding another destination is a data change, not an engine
   change.

   All prices computed here are MOCK/ESTIMATED demo figures,
   clearly labelled as such in the UI (see .tb-tag-estimated).
   The AI command bar below is a small local rule-based parser
   for this preview, not a live model call — see handleCommand()
   for the exact swap point where a real Cloudflare Worker AI
   endpoint (same pattern as ../trip-ideas/trip-ideas.js) would
   plug in later.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var uidCounter = 0;
  function uid(prefix) { uidCounter += 1; return (prefix || "id") + "_" + Date.now().toString(36) + uidCounter; }

  function money(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function sanitizeName(s) {
    var cleaned = String(s || "").replace(/[^a-zA-Z\s.'-]/g, "").trim().slice(0, 40);
    return cleaned || "Delhi";
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function durationLabel(min) {
    if (!min) return "";
    var h = Math.floor(min / 60), m = min % 60;
    return h + "h" + (m ? " " + m + "m" : "");
  }

  function formatDate(d) {
    return WEEKDAYS_SHORT[d.getDay()] + ", " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
  }

  function toDateInputValue(d) {
    var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  var state = { trip: null, map: null, markers: {} };

  /* ---------------------------------------------------------
     Destination lookup
     --------------------------------------------------------- */
  function getDestination(slug) { return (window.TB_DESTINATIONS || {})[String(slug || "").toLowerCase()]; }

  function matchDestinationSlug(text) {
    if (!text) return null;
    var t = text.toLowerCase();
    var found = null;
    Object.keys(window.TB_DESTINATIONS || {}).forEach(function (slug) {
      if (t.indexOf(window.TB_DESTINATIONS[slug].name.toLowerCase()) !== -1) found = slug;
    });
    return found;
  }

  /* ---------------------------------------------------------
     Lightweight local natural-language parsing (no network) —
     e.g. "Plan a 4-night Dubai trip from Delhi for 2 adults
     in December". Falls back to manual fields for anything it
     can't confidently extract.
     --------------------------------------------------------- */
  function parseNaturalLanguage(text) {
    var out = { from: null, destinationSlug: null, nights: null, adults: null, children: null, month: null, tripType: null };
    var t = text.toLowerCase();

    var nightsMatch = t.match(/(\d+)\s*[- ]?\s*night/);
    if (nightsMatch) out.nights = parseInt(nightsMatch[1], 10);

    var adultsMatch = t.match(/(\d+)\s*adult/);
    if (adultsMatch) out.adults = parseInt(adultsMatch[1], 10);

    var childMatch = t.match(/(\d+)\s*(?:child|children|kid)/);
    if (childMatch) out.children = parseInt(childMatch[1], 10);

    var fromMatch = t.match(/from\s+([a-z\s]+?)(?:\s+for|\s+in|\s*,|$)/);
    if (fromMatch) out.from = capitalize(fromMatch[1].trim());

    out.destinationSlug = matchDestinationSlug(t);

    MONTHS.forEach(function (m, i) { if (t.indexOf(m.toLowerCase()) !== -1) out.month = i; });

    ["family", "couple", "friends", "solo", "adventure", "relaxation", "luxury", "budget", "religious", "road trip"].forEach(function (type) {
      if (t.indexOf(type) !== -1) out.tripType = capitalize(type);
    });

    return out;
  }

  function nextDateForMonth(monthIndex) {
    var now = new Date();
    var candidate = new Date(now.getFullYear(), monthIndex, 15);
    if (candidate < now) candidate = new Date(now.getFullYear() + 1, monthIndex, 15);
    return candidate;
  }

  /* ---------------------------------------------------------
     Trip object construction — the reusable data model
     --------------------------------------------------------- */
  function buildTrip(input) {
    var dest = getDestination(input.destinationSlug || "dubai");
    var trip = {
      id: uid("trip"),
      destination: dest,
      origin: { name: sanitizeName(input.from) },
      travellers: { adults: input.adults || 2, children: input.children || 0 },
      dates: { departure: input.departure || nextDateForMonth(11) },
      duration: { nights: Math.max(1, Math.min(14, input.nights || 4)) },
      tripType: input.tripType || "Family",
      budgetInput: input.budget || null,
      selections: {
        hotelId: dest.defaultHotelId,
        flightId: dest.defaultFlightId,
        transferId: dest.defaultTransferId,
        localTransportId: dest.defaultLocalTransportId
      },
      days: []
    };
    trip.duration.days = trip.duration.nights + 1;
    buildDays(trip);
    return trip;
  }

  function pickMiddleThemes(dest, count) {
    var cycle = dest.middleThemeCycle;
    var out = [];
    for (var i = 0; i < count; i++) out.push(cycle[i % cycle.length]);
    return out;
  }

  function fillPlaceholders(str, trip) {
    if (!str) return str;
    return str.split("{from}").join(trip.origin.name);
  }

  function instantiateActivity(a, trip) {
    var act = {};
    Object.keys(a).forEach(function (k) { act[k] = a[k]; });
    act.id = uid("act");
    act.title = fillPlaceholders(act.title, trip);
    act.location = fillPlaceholders(act.location, trip);
    return act;
  }

  function buildDays(trip) {
    var dest = trip.destination;
    var middleCount = Math.max(0, trip.duration.nights - 1);
    var themeKeys = ["arrival"].concat(pickMiddleThemes(dest, middleCount)).concat(["departure"]);
    trip.days = themeKeys.map(function (themeKey) {
      var theme = dest.dayThemes[themeKey];
      return { id: uid("day"), themeKey: themeKey, activities: theme.activities.map(function (a) { return instantiateActivity(a, trip); }) };
    });
    reindexDays(trip);
  }

  function reindexDays(trip) {
    trip.days.forEach(function (d, i) {
      d.index = i + 1;
      var base = new Date(trip.dates.departure);
      base.setDate(base.getDate() + i);
      d.date = base;
    });
  }

  function addSpecificDay(trip, themeKey) {
    var theme = trip.destination.dayThemes[themeKey];
    if (!theme) return false;
    var departureIdx = trip.days.findIndex(function (d) { return d.themeKey === "departure"; });
    var newDay = { id: uid("day"), themeKey: themeKey, activities: theme.activities.map(function (a) { return instantiateActivity(a, trip); }) };
    trip.days.splice(departureIdx, 0, newDay);
    trip.duration.nights += 1;
    trip.duration.days += 1;
    reindexDays(trip);
    return true;
  }

  function addDay(trip) {
    var middleDays = trip.days.filter(function (d) { return d.themeKey !== "arrival" && d.themeKey !== "departure"; });
    var themeKey = trip.destination.middleThemeCycle[middleDays.length % trip.destination.middleThemeCycle.length];
    return addSpecificDay(trip, themeKey);
  }

  function removeDay(trip, dayId) {
    var day = trip.days.find(function (d) { return d.id === dayId; });
    if (!day || day.themeKey === "arrival" || day.themeKey === "departure") return false;
    trip.days = trip.days.filter(function (d) { return d.id !== dayId; });
    trip.duration.nights = Math.max(1, trip.duration.nights - 1);
    trip.duration.days = trip.duration.nights + 1;
    reindexDays(trip);
    return true;
  }

  function removeActivity(trip, dayId, activityId) {
    var day = trip.days.find(function (d) { return d.id === dayId; });
    if (!day) return;
    day.activities = day.activities.filter(function (a) { return a.id !== activityId; });
  }

  function removeActivitiesByTitle(trip, titles) {
    var count = 0;
    trip.days.forEach(function (d) {
      var before = d.activities.length;
      d.activities = d.activities.filter(function (a) { return titles.indexOf(a.title) === -1; });
      count += before - d.activities.length;
    });
    return count;
  }

  /* ---------------------------------------------------------
     Cost engine — every figure here is an ESTIMATE, never
     presented as a confirmed live price (see .tb-tag-estimated
     in the markup this feeds).
     --------------------------------------------------------- */
  function computeCosts(trip) {
    var dest = trip.destination;
    var adults = trip.travellers.adults;
    var nights = trip.duration.nights;

    var hotel = dest.hotelOptions.find(function (h) { return h.id === trip.selections.hotelId; });
    var flight = dest.flightOptions.find(function (f) { return f.id === trip.selections.flightId; });
    var transfer = dest.transferOptions.find(function (t) { return t.id === trip.selections.transferId; });
    var local = dest.localTransportOptions.find(function (l) { return l.id === trip.selections.localTransportId; });

    var activitiesCost = 0;
    trip.days.forEach(function (d) {
      d.activities.forEach(function (a) { if (typeof a.cost === "number") activitiesCost += a.cost * adults; });
    });

    var flights = flight.pricePerAdult * adults;
    var hotelCost = hotel.pricePerNight * nights;
    var transfers = transfer.pricePerLeg * 2;
    var localTransport = local.pricePerDay * (nights + 1);
    var food = dest.foodPerAdultPerDay * (nights + 1) * adults;
    var visa = dest.visaCostPerAdult * adults;

    return {
      flights: flights, hotel: hotelCost, transfers: transfers, localTransport: localTransport,
      activities: activitiesCost, food: food, visa: visa,
      total: flights + hotelCost + transfers + localTransport + activitiesCost + food + visa,
      hotelRef: hotel, flightRef: flight, transferRef: transfer, localRef: local
    };
  }

  function currentHotel(trip) { return trip.destination.hotelOptions.find(function (h) { return h.id === trip.selections.hotelId; }); }
  function currentFlight(trip) { return trip.destination.flightOptions.find(function (f) { return f.id === trip.selections.flightId; }); }
  function currentTransfer(trip) { return trip.destination.transferOptions.find(function (t) { return t.id === trip.selections.transferId; }); }
  function currentLocal(trip) { return trip.destination.localTransportOptions.find(function (l) { return l.id === trip.selections.localTransportId; }); }
  function originCode(trip) { return trip.origin.name.slice(0, 3).toUpperCase(); }

  function activityCostLabel(trip, a) {
    if (a.isFlight) return "in flight cost";
    if (a.isTransfer) return "in transfer cost";
    if (typeof a.cost === "number") return a.cost === 0 ? "Included" : money(a.cost * trip.travellers.adults);
    return "—";
  }

  /* ---------------------------------------------------------
     Render: hero
     --------------------------------------------------------- */
  function factHtml(label, valueHtml) {
    return '<div class="tb-hero-fact"><div class="tb-hero-fact-label">' + esc(label) + '</div><div class="tb-hero-fact-value">' + valueHtml + '</div></div>';
  }

  function travellersLabel(trip) {
    var s = trip.travellers.adults + " Adult" + (trip.travellers.adults > 1 ? "s" : "");
    if (trip.travellers.children) s += " + " + trip.travellers.children + " Child" + (trip.travellers.children > 1 ? "ren" : "");
    return s;
  }

  function renderHero(trip) {
    var dest = trip.destination;
    var el = $("#tbHero");
    el.style.backgroundImage = "url('" + dest.heroImage + "')";

    var facts = factHtml("From", "✈️ " + esc(trip.origin.name))
      + factHtml("To", "📍 " + esc(dest.name) + " (" + esc(dest.airportCode) + ")")
      + factHtml("Duration", trip.duration.nights + " Nights / " + trip.duration.days + " Days")
      + factHtml("Travellers", travellersLabel(trip));
    if (trip.budgetInput) facts += factHtml("Your budget", money(trip.budgetInput));

    el.innerHTML =
      '<div class="tb-hero-inner">' +
        '<div class="tb-hero-top"><div>' +
          '<p class="tb-hero-eyebrow">Your journey</p>' +
          '<h1 class="tb-hero-route">Your <span class="tb-hero-route-highlight">' + esc(dest.name) + '</span> Trip</h1>' +
          '<p class="tb-hero-meta-line">from ' + esc(trip.origin.name) + ' · ' + trip.duration.nights + ' Nights · ' + trip.duration.days + ' Days</p>' +
          '<p class="tb-hero-desc">A handpicked journey designed for you — from home to home, with the best flights, stays, local travel and experiences.</p>' +
        '</div></div>' +
        '<div class="tb-hero-facts">' + facts + '</div>' +
        '<div class="tb-hero-actions">' +
          '<button type="button" class="btn btn-glass" data-hero-action="save">❤️ Save Trip</button>' +
          '<button type="button" class="btn btn-glass" data-hero-action="share">🔗 Share</button>' +
          '<button type="button" class="btn btn-glass" data-hero-action="edit">✏️ Edit Trip</button>' +
        '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------
     Render: numbered stage timeline
     --------------------------------------------------------- */
  var STAGE_DEFS = [
    { key: "home", icon: "🏠", kind: "home", label: function (trip) { return trip.origin.name; } },
    { key: "fly", icon: "✈️", kind: "fly", label: function (trip) { return originCode(trip) + " → " + trip.destination.airportCode; } },
    { key: "arrive", icon: "🛬", kind: "arrive", label: function (trip) { return trip.destination.name + " Airport"; } },
    { key: "stay", icon: "🏨", kind: "stay", label: function (trip) { return trip.duration.nights + " Nights in " + trip.destination.name; } },
    { key: "explore", icon: "🗺️", kind: "day", label: function () { return "Top Attractions"; } },
    { key: "return", icon: "✈️", kind: "return", label: function (trip) { return trip.destination.airportCode + " → " + originCode(trip); } }
  ];

  function renderTimeline(trip) {
    var arrivalDay = trip.days[0];
    var departureDay = trip.days[trip.days.length - 1];
    var firstMiddleDay = trip.days.find(function (d) { return d.themeKey !== "arrival" && d.themeKey !== "departure"; }) || departureDay;
    var targetByKey = { home: arrivalDay.id, fly: arrivalDay.id, arrive: arrivalDay.id, stay: arrivalDay.id, explore: firstMiddleDay.id, return: departureDay.id };

    $("#tbTimeline").innerHTML = STAGE_DEFS.map(function (s, i) {
      return (i > 0 ? '<span class="tb-timeline-connector" aria-hidden="true"></span>' : "") +
        '<button type="button" class="tb-timeline-stage" data-day-target="' + targetByKey[s.key] + '">' +
          '<span class="tb-timeline-ico" data-kind="' + s.kind + '">' + s.icon + '</span>' +
          '<span><span class="tb-timeline-num">' + (i + 1) + '. ' + capitalize(s.key) + '</span><br>' +
          '<span class="tb-timeline-label">' + esc(s.label(trip)) + '</span></span>' +
        '</button>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: day-by-day horizontal cards
     --------------------------------------------------------- */
  function activityHtml(trip, day, a) {
    var linkable = !!a.coords;
    var editable = day.themeKey !== "arrival" && day.themeKey !== "departure";
    return (
      '<div class="tb-activity' + (linkable ? ' is-linkable' : '') + '" data-activity-id="' + a.id + '" data-day-id="' + day.id + '">' +
        '<span class="tb-activity-ico">' + a.icon + '</span>' +
        '<span>' +
          '<span class="tb-activity-title">' + esc(a.title) + '</span>' +
          '<span class="tb-activity-meta">' + esc(a.time) + ' · ' + esc(a.location) + '</span>' +
          (editable ? '<span class="tb-activity-actions"><button type="button" data-action="remove-activity" data-activity-id="' + a.id + '" data-day-id="' + day.id + '">Remove</button></span>' : "") +
        '</span>' +
        '<span class="tb-activity-cost">' + activityCostLabel(trip, a) + '</span>' +
      '</div>'
    );
  }

  function dayCardHtml(trip, day) {
    var theme = trip.destination.dayThemes[day.themeKey];
    var canEdit = day.themeKey !== "arrival" && day.themeKey !== "departure";
    return (
      '<article class="tb-day-card" id="' + day.id + '" data-day-id="' + day.id + '">' +
        '<div class="tb-day-media" style="background-image:url(\'' + theme.image + '\')"></div>' +
        '<div class="tb-day-body">' +
          '<div class="tb-day-num">Day ' + day.index + '</div>' +
          '<h3 class="tb-day-title">' + esc(theme.title) + '</h3>' +
          '<div class="tb-day-date">' + formatDate(day.date) + '</div>' +
          '<div class="tb-day-activities">' + day.activities.map(function (a) { return activityHtml(trip, day, a); }).join("") + '</div>' +
          '<div class="tb-day-card-actions">' +
            '<button type="button" data-action="view-route" data-day-id="' + day.id + '">📍 View route</button>' +
            (canEdit ? '<button type="button" data-action="add-activity" data-day-id="' + day.id + '">+ Add</button>' : "") +
            (canEdit ? '<button type="button" data-action="remove-day" data-day-id="' + day.id + '">Remove day</button>' : "") +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function renderDayCards(trip) {
    $("#tbDayCards").innerHTML = trip.days.map(function (day) { return dayCardHtml(trip, day); }).join("");
  }

  function renderExperiences(trip) {
    $("#tbExperiencesGrid").innerHTML = trip.destination.experienceGallery.map(function (g) {
      return '<div class="tb-experience-item"><img src="' + g.image + '" alt="' + esc(g.title) + '" loading="lazy" />' +
        '<div class="tb-experience-label">' + esc(g.title) + '<br><small>' + esc(g.sub) + '</small></div></div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: live cost panel
     --------------------------------------------------------- */
  function renderCost(trip) {
    var costs = computeCosts(trip);
    trip.lastCosts = costs;

    var rows = [
      ["Flights", costs.flights],
      ["Hotel (" + trip.duration.nights + " nights)", costs.hotel],
      ["Airport transfers", costs.transfers],
      ["Local transport", costs.localTransport],
      ["Activities", costs.activities],
      ["Food estimate", costs.food],
      ["Visa", costs.visa]
    ];
    $("#tbCostList").innerHTML = rows.map(function (r) {
      return '<div class="tb-cost-row"><dt>' + esc(r[0]) + '</dt><dd>' + money(r[1]) + '</dd></div>';
    }).join("");
    $("#tbCostTotal").innerHTML = '<span>Estimated total</span><span class="tb-cost-total-amount">' + money(costs.total) + '</span>';

    var footnote = "Estimated · " + travellersLabel(trip) + " · last checked just now";
    if (trip.budgetInput) footnote += " · " + Math.round((costs.total / trip.budgetInput) * 100) + "% of your " + money(trip.budgetInput) + " budget";
    $("#tbCostFootnote").textContent = footnote;
  }

  function flashCostNote(msg) {
    var el = $("#tbCostFootnote");
    if (!el) return;
    el.textContent = msg;
    setTimeout(function () { if (state.trip) renderCost(state.trip); }, 2600);
  }

  /* ---------------------------------------------------------
     Render: journey-at-a-glance strip
     --------------------------------------------------------- */
  function renderGlance(trip) {
    var flight = currentFlight(trip);
    var stops = [
      { icon: "🏠", label: "Home", sub: trip.origin.name },
      { icon: "🚕", label: "Airport transfer", sub: trip.origin.name },
      { icon: "✈️", label: "Flight to " + trip.destination.name, sub: durationLabel(flight.durationMin) },
      { icon: "🛬", label: "Arrive " + trip.destination.name, sub: trip.destination.airportCode },
      { icon: "🏨", label: "Hotel check-in", sub: trip.duration.nights + " nights" },
      { icon: "🗺️", label: "Explore", sub: trip.days.length > 2 ? "Day 2 – Day " + (trip.days.length - 1) : "—" },
      { icon: "✈️", label: "Return flight", sub: trip.destination.airportCode + " → " + originCode(trip) },
      { icon: "🏠", label: "Back home", sub: trip.origin.name }
    ];
    $("#tbGlanceStrip").innerHTML = stops.map(function (s) {
      return '<div class="tb-glance-stop"><div class="tb-glance-ico">' + s.icon + '</div><div class="tb-glance-label">' + esc(s.label) + '</div><div class="tb-glance-sub">' + esc(s.sub) + '</div></div>';
    }).join("");
  }

  /* ---------------------------------------------------------
     Render: trip experience score (informational, not a rating)
     --------------------------------------------------------- */
  function renderScore(trip) {
    var costs = trip.lastCosts || computeCosts(trip);
    var items = [];

    if (trip.budgetInput) {
      var pct = Math.round((costs.total / trip.budgetInput) * 100);
      items.push({ label: "Budget usage", value: pct + "%", why: pct <= 100 ? "Within your stated budget." : "Over budget — try “Make Budget Friendly”." });
    } else {
      items.push({ label: "Budget usage", value: "No budget set", why: "Add a budget above to track usage." });
    }

    var flight = currentFlight(trip);
    items.push({ label: "Travel time", value: flight.stops === 0 ? "Light" : "Moderate", why: flight.stops === 0 ? "Direct flight both ways." : "One stop adds time but saves money." });

    var avgActivities = trip.days.reduce(function (s, d) { return s + d.activities.filter(function (a) { return !a.isFlight && !a.isTransfer; }).length; }, 0) / trip.days.length;
    items.push({ label: "Daily activity load", value: avgActivities >= 5 ? "Packed" : avgActivities >= 3 ? "Balanced" : "Relaxed", why: "Averages " + avgActivities.toFixed(1) + " activities per day." });

    items.push({ label: "Walking", value: trip.destination.scoreFacts.walking, why: "Based on typical distances between planned stops." });

    items.push({
      label: "Family suitability",
      value: trip.travellers.children > 0 ? "High" : "Good",
      why: trip.travellers.children > 0 ? "Desert camp, aquarium and theme parks all suit kids well." : "Add children to your trip to see family-specific notes."
    });

    var month = new Date(trip.dates.departure).getMonth();
    var good = trip.destination.scoreFacts.weatherByMonth.good[month];
    items.push({ label: "Weather suitability", value: good ? "Good" : "Hot — caution", why: good ? "Comfortable temperatures for outdoor plans." : "Very hot this month — lean on indoor/evening activities." });

    $("#tbScoreGrid").innerHTML = items.map(function (it) {
      return '<div class="tb-score-item"><div class="tb-score-label">' + esc(it.label) + '</div><div class="tb-score-value">' + esc(it.value) + '</div><div class="tb-score-why">' + esc(it.why) + '</div></div>';
    }).join("");
  }

  function renderMobileBar(trip) {
    $("#tbMobileTotal").textContent = money((trip.lastCosts || computeCosts(trip)).total);
    $("#tbMobileBar").hidden = false;
  }

  /* ---------------------------------------------------------
     Render: interactive map (Leaflet + OpenStreetMap, no key)
     --------------------------------------------------------- */
  function renderMap(trip) {
    var mapEl = $("#tbMap");
    if ($("#tbMapTitle")) $("#tbMapTitle").textContent = "Your " + trip.destination.name + " journey map";
    if ($("#tbMapHint")) $("#tbMapHint").textContent = "A visual guide to your " + trip.duration.nights + "-night adventure.";
    if (!window.L || !mapEl) return;

    if (!state.map) {
      state.map = window.L.map(mapEl, { scrollWheelZoom: false });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18
      }).addTo(state.map);
    }

    Object.keys(state.markers).forEach(function (k) { state.map.removeLayer(state.markers[k]); });
    state.markers = {};

    var dest = trip.destination;
    var points = [];

    function addMarker(key, coords, label, activityId) {
      var marker = window.L.marker([coords.lat, coords.lng]).addTo(state.map).bindTooltip(label, { direction: "top" });
      if (activityId) marker.on("click", function () { highlightActivity(activityId); });
      state.markers[key] = marker;
      points.push(coords);
    }

    var hotel = currentHotel(trip);
    addMarker("hotel", hotel.coords, "🏨 " + hotel.name);

    dest.alwaysOnMap.forEach(function (p) { addMarker(p.id, p.coords, p.icon + " " + p.label); });

    trip.days.forEach(function (day) {
      day.activities.forEach(function (a) { if (a.coords) addMarker(a.id, a.coords, a.icon + " " + a.title, a.id); });
    });

    if (points.length) {
      state.map.fitBounds(window.L.latLngBounds(points.map(function (p) { return [p.lat, p.lng]; })), { padding: [30, 30] });
    } else {
      state.map.setView([dest.center.lat, dest.center.lng], 11);
    }
    setTimeout(function () { state.map.invalidateSize(); }, 200);
  }

  function highlightActivity(activityId) {
    $$(".tb-activity").forEach(function (el) { el.classList.remove("is-highlighted"); });
    var target = $('.tb-activity[data-activity-id="' + activityId + '"]');
    if (target) { target.classList.add("is-highlighted"); target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); }
    var marker = state.markers[activityId];
    if (marker && state.map) { state.map.panTo(marker.getLatLng()); marker.openTooltip(); }
  }

  /* ---------------------------------------------------------
     One shared refresh — re-renders only the trip-app
     containers below the header/hero/input form, never the
     page shell. Every mutation in this file ends by calling
     this rather than rebuilding the page.
     --------------------------------------------------------- */
  function refresh() {
    var trip = state.trip;
    renderHero(trip);
    renderTimeline(trip);
    renderDayCards(trip);
    renderCost(trip);
    renderGlance(trip);
    renderScore(trip);
    renderMobileBar(trip);
    renderMap(trip);
  }

  /* ---------------------------------------------------------
     Modals: generic open/close
     --------------------------------------------------------- */
  function openModal(el) { el.hidden = false; }
  function closeModal(el) { el.hidden = true; }

  function wireModalCloseButtons() {
    $$(".tb-modal").forEach(function (m) {
      m.addEventListener("click", function (e) { if (e.target === m || e.target.closest("[data-close-modal]")) closeModal(m); });
    });
  }

  /* ---------------------------------------------------------
     Edit Trip menu — hotel / flight / transfer / local / dates
     --------------------------------------------------------- */
  function openEditTripMenu() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Edit your trip";
    var rows = [
      { key: "hotel", label: "🏨 Change hotel", sub: currentHotel(trip).name },
      { key: "flight", label: "✈️ Change flight", sub: currentFlight(trip).label },
      { key: "transfer", label: "🚕 Change airport transfer", sub: currentTransfer(trip).label },
      { key: "local", label: "🚗 Change local transport", sub: currentLocal(trip).label },
      { key: "dates", label: "📅 Change dates / nights", sub: trip.duration.nights + " nights from " + formatDate(trip.dates.departure) }
    ];
    $("#tbEditOptions").innerHTML = rows.map(function (r) {
      return '<div class="tb-edit-option" data-edit-key="' + r.key + '">' +
        '<div><div class="tb-edit-option-name">' + r.label + '</div><div class="tb-edit-option-sub">' + esc(r.sub) + '</div></div>' +
        '<div class="tb-edit-option-price">Change →</div></div>';
    }).join("");
    $$("[data-edit-key]", $("#tbEditOptions")).forEach(function (rowEl) {
      rowEl.addEventListener("click", function () {
        var key = rowEl.dataset.editKey;
        if (key === "hotel") openHotelOptions();
        else if (key === "flight") openFlightOptions();
        else if (key === "transfer") openTransferOptions();
        else if (key === "local") openLocalOptions();
        else openDatesEditor();
      });
    });
    openModal($("#tbEditModal"));
  }

  function bindOptionRows(field) {
    $$(".tb-edit-option", $("#tbEditOptions")).forEach(function (optEl) {
      optEl.addEventListener("click", function () {
        state.trip.selections[field] = optEl.dataset.optionId;
        closeModal($("#tbEditModal"));
        refresh();
      });
    });
  }

  function openHotelOptions() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Change hotel";
    $("#tbEditOptions").innerHTML = trip.destination.hotelOptions.map(function (h) {
      return '<div class="tb-edit-option' + (trip.selections.hotelId === h.id ? " is-selected" : "") + '" data-option-id="' + h.id + '">' +
        '<div><div class="tb-edit-option-name">' + esc(h.name) + '</div><div class="tb-edit-option-sub">' + esc(h.tier) + ' · ' + esc(h.area) + '</div></div>' +
        '<div class="tb-edit-option-price">' + money(h.pricePerNight) + '/night</div></div>';
    }).join("");
    bindOptionRows("hotelId");
  }

  function openFlightOptions() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Change flight";
    $("#tbEditOptions").innerHTML = trip.destination.flightOptions.map(function (f) {
      var route = f.route.split("{from}").join(originCode(trip));
      return '<div class="tb-edit-option' + (trip.selections.flightId === f.id ? " is-selected" : "") + '" data-option-id="' + f.id + '">' +
        '<div><div class="tb-edit-option-name">' + esc(f.label) + '</div><div class="tb-edit-option-sub">' + esc(route) + ' · ' + durationLabel(f.durationMin) + '</div></div>' +
        '<div class="tb-edit-option-price">' + money(f.pricePerAdult) + '/adult</div></div>';
    }).join("");
    bindOptionRows("flightId");
  }

  function openTransferOptions() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Change airport transfer";
    $("#tbEditOptions").innerHTML = trip.destination.transferOptions.map(function (t) {
      return '<div class="tb-edit-option' + (trip.selections.transferId === t.id ? " is-selected" : "") + '" data-option-id="' + t.id + '">' +
        '<div><div class="tb-edit-option-name">' + esc(t.label) + '</div><div class="tb-edit-option-sub">' + esc(t.note) + '</div></div>' +
        '<div class="tb-edit-option-price">' + money(t.pricePerLeg) + '/leg</div></div>';
    }).join("");
    bindOptionRows("transferId");
  }

  function openLocalOptions() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Change local transport";
    $("#tbEditOptions").innerHTML = trip.destination.localTransportOptions.map(function (l) {
      return '<div class="tb-edit-option' + (trip.selections.localTransportId === l.id ? " is-selected" : "") + '" data-option-id="' + l.id + '">' +
        '<div><div class="tb-edit-option-name">' + esc(l.label) + '</div></div>' +
        '<div class="tb-edit-option-price">' + money(l.pricePerDay) + '/day</div></div>';
    }).join("");
    bindOptionRows("localTransportId");
  }

  function openDatesEditor() {
    var trip = state.trip;
    $("#tbEditModalTitle").textContent = "Change dates / nights";
    $("#tbEditOptions").innerHTML =
      '<div class="field"><label for="tbEditNights">Nights</label><input type="number" id="tbEditNights" min="1" max="14" value="' + trip.duration.nights + '" /></div>' +
      '<div class="field" style="margin-top:12px"><label for="tbEditDeparture">Departure date</label><input type="date" id="tbEditDeparture" value="' + toDateInputValue(trip.dates.departure) + '" /></div>' +
      '<p class="tb-modal-sub" style="margin-top:12px">Changing nights or the date reshuffles your day-by-day plan.</p>' +
      '<button type="button" class="btn btn-primary" id="tbEditDatesSave" style="width:100%">Save changes</button>';
    $("#tbEditDatesSave").addEventListener("click", function () {
      var nights = parseInt($("#tbEditNights").value, 10);
      if (nights > 0) { trip.duration.nights = Math.max(1, Math.min(14, nights)); trip.duration.days = trip.duration.nights + 1; }
      if ($("#tbEditDeparture").value) trip.dates.departure = new Date($("#tbEditDeparture").value);
      buildDays(trip);
      closeModal($("#tbEditModal"));
      refresh();
    });
  }

  /* ---------------------------------------------------------
     Add-activity modal (per day, from that day's theme extras)
     --------------------------------------------------------- */
  function openAddActivityModal(dayId) {
    var trip = state.trip;
    var day = trip.days.find(function (d) { return d.id === dayId; });
    var theme = trip.destination.dayThemes[day.themeKey];
    var extras = (theme.extras || []).filter(function (ex) { return !day.activities.some(function (a) { return a.title === ex.title; }); });

    $("#tbEditModalTitle").textContent = "Add an activity to Day " + day.index;
    if (!extras.length) {
      $("#tbEditOptions").innerHTML = '<p class="tb-modal-sub">No more suggested add-ons for this day — try the AI command bar or Bindass Mode instead.</p>';
    } else {
      $("#tbEditOptions").innerHTML = extras.map(function (ex, i) {
        return '<div class="tb-edit-option" data-extra-index="' + i + '">' +
          '<div><div class="tb-edit-option-name">' + ex.icon + ' ' + esc(ex.title) + '</div><div class="tb-edit-option-sub">' + esc(ex.time) + ' · ' + esc(ex.location) + '</div></div>' +
          '<div class="tb-edit-option-price">' + (ex.cost ? money(ex.cost * trip.travellers.adults) : "Included") + '</div></div>';
      }).join("");
      $$(".tb-edit-option", $("#tbEditOptions")).forEach(function (optEl, i) {
        optEl.addEventListener("click", function () {
          day.activities.push(instantiateActivity(extras[i], trip));
          closeModal($("#tbEditModal"));
          refresh();
        });
      });
    }
    openModal($("#tbEditModal"));
  }

  /* ---------------------------------------------------------
     Budget optimization (§10) and Bindass Mode (§11)
     --------------------------------------------------------- */
  function openOptimizeModal() {
    var trip = state.trip;
    var current = (trip.lastCosts || computeCosts(trip)).total;
    var applicable = trip.destination.optimizations.filter(function (o) { return o.appliesIf(trip); });
    var totalSavings = applicable.reduce(function (s, o) { return s + o.savings(trip); }, 0);

    $("#tbOptimizeCompare").innerHTML =
      '<div><div class="tb-compare-label">Current trip</div><div class="tb-compare-amount">' + money(current) + '</div></div>' +
      '<div class="tb-compare-arrow">→</div>' +
      '<div><div class="tb-compare-label">Possible optimized trip</div><div class="tb-compare-amount is-new">' + money(current - totalSavings) + '</div></div>';

    $("#tbOptimizeList").innerHTML = !applicable.length
      ? '<p class="tb-modal-sub">Your trip is already using the leaner options for each category in this preview.</p>'
      : applicable.map(function (o) {
          return '<div class="tb-suggestion" data-opt-id="' + o.id + '">' +
            '<div class="tb-suggestion-text"><div class="tb-suggestion-title">' + esc(o.label) + '</div><div class="tb-suggestion-explain">' + esc(o.explain) + '</div></div>' +
            '<div class="tb-suggestion-savings">Save ' + money(o.savings(trip)) + '</div>' +
            '<div class="tb-suggestion-actions"><button type="button" class="btn btn-primary" data-accept-opt="' + o.id + '">Accept</button></div>' +
          '</div>';
        }).join("");

    $$("[data-accept-opt]", $("#tbOptimizeList")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var opt = trip.destination.optimizations.find(function (o) { return o.id === btn.dataset.acceptOpt; });
        opt.apply(trip);
        closeModal($("#tbOptimizeModal"));
        refresh();
        flashCostNote("Applied: " + opt.label);
      });
    });
    openModal($("#tbOptimizeModal"));
  }

  function openBindassModal() {
    var trip = state.trip;
    var applicable = trip.destination.bindassIdeas.filter(function (b) { return b.appliesIf(trip); });
    $("#tbBindassList").innerHTML = !applicable.length
      ? '<p class="tb-modal-sub">You’ve already gone full Bindass — nothing unconventional left to try!</p>'
      : applicable.map(function (b) {
          return '<div class="tb-suggestion">' +
            '<div class="tb-suggestion-text"><div class="tb-suggestion-title">' + esc(b.label) + '</div><div class="tb-suggestion-tradeoff">Trade-off: ' + esc(b.tradeoff) + '</div></div>' +
            '<div class="tb-suggestion-savings">Save ' + money(b.savings(trip)) + '</div>' +
            '<div class="tb-suggestion-actions"><button type="button" class="btn tb-btn-bindass" data-accept-bindass="' + b.id + '">Use this</button></div>' +
          '</div>';
        }).join("");

    $$("[data-accept-bindass]", $("#tbBindassList")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idea = trip.destination.bindassIdeas.find(function (b) { return b.id === btn.dataset.acceptBindass; });
        idea.apply(trip);
        closeModal($("#tbBindassModal"));
        refresh();
        flashCostNote("Bindass move applied: " + idea.label);
      });
    });
    openModal($("#tbBindassModal"));
  }

  /* ---------------------------------------------------------
     Share
     --------------------------------------------------------- */
  function buildShareState(trip) {
    return {
      d: trip.destination.slug, f: trip.origin.name, n: trip.duration.nights,
      a: trip.travellers.adults, c: trip.travellers.children,
      dep: trip.dates.departure.toISOString().slice(0, 10), b: trip.budgetInput,
      h: trip.selections.hotelId, fl: trip.selections.flightId, tr: trip.selections.transferId, lo: trip.selections.localTransportId
    };
  }
  function encodeState(obj) { return encodeURIComponent(btoa(JSON.stringify(obj))); }
  function decodeState(str) { try { return JSON.parse(atob(decodeURIComponent(str))); } catch (e) { return null; } }

  function tripFromState(s) {
    var trip = buildTrip({ destinationSlug: s.d, from: s.f, nights: s.n, adults: s.a, children: s.c, departure: s.dep ? new Date(s.dep) : null, budget: s.b });
    if (s.h) trip.selections.hotelId = s.h;
    if (s.fl) trip.selections.flightId = s.fl;
    if (s.tr) trip.selections.transferId = s.tr;
    if (s.lo) trip.selections.localTransportId = s.lo;
    return trip;
  }

  function buildShareUrl(trip) { return location.origin + location.pathname + "?state=" + encodeState(buildShareState(trip)); }

  function openShareModal() {
    var trip = state.trip;
    var url = buildShareUrl(trip);
    var costs = trip.lastCosts || computeCosts(trip);
    $("#tbSharePreview").innerHTML =
      "<h4>" + esc(trip.origin.name) + " → " + esc(trip.destination.name) + " Journey " + (trip.destination.flag || "") + "</h4>" +
      "<p>" + trip.duration.nights + " Nights · Estimated " + money(costs.total) + "</p>";
    $("#tbShareWhatsapp").href = "https://wa.me/?text=" + encodeURIComponent("Check out my " + trip.duration.nights + "-night " + trip.destination.name + " journey on Bookbindass: " + url);
    $("#tbShareCopy").onclick = function () {
      navigator.clipboard.writeText(url).then(function () {
        $("#tbShareCopyFeedback").textContent = "Link copied ✓";
        setTimeout(function () { $("#tbShareCopyFeedback").textContent = ""; }, 2200);
      });
    };
    openModal($("#tbShareModal"));
  }

  function saveTripToDevice() {
    try {
      var saved = JSON.parse(localStorage.getItem("tb_saved_trips") || "[]");
      saved.push({ id: state.trip.id, savedAt: Date.now(), state: buildShareState(state.trip) });
      localStorage.setItem("tb_saved_trips", JSON.stringify(saved));
      flashHeroButton("❤️ Saved on this device ✓");
    } catch (e) { flashHeroButton("Storage unavailable"); }
  }

  function flashHeroButton(msg) {
    var btn = $('[data-hero-action="save"]');
    if (!btn) return;
    var original = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = original; }, 2200);
  }

  /* ---------------------------------------------------------
     AI trip command bar — local rule-based parser for this
     preview (no network call). Swap point for a real model:
     replace the body of handleCommand() with a fetch() to a
     Cloudflare Worker using the same env.AI pattern as
     ../trip-ideas/trip-ideas.js + ../cloudflare-worker/worker.js.
     --------------------------------------------------------- */
  function applyOptimizationsTowardSavings(trip, targetAmount) {
    var applicable = trip.destination.optimizations.filter(function (o) { return o.appliesIf(trip); });
    var appliedLabels = [];
    var savedSoFar = 0;
    applicable.forEach(function (o) {
      if (targetAmount !== null && savedSoFar >= targetAmount) return;
      savedSoFar += o.savings(trip);
      o.apply(trip);
      appliedLabels.push(o.label);
    });
    if (!appliedLabels.length) return "Your trip is already using the leaner options I have for this preview.";
    return "Applied: " + appliedLabels.join("; ") + ". Estimated savings ≈ " + money(savedSoFar) + ".";
  }

  function swapADayForRelax(trip) {
    var busy = trip.days.find(function (d) { return d.themeKey === "desert" || d.themeKey === "explore"; });
    if (!busy) return "I couldn't find a busy day to swap in this itinerary.";
    var theme = trip.destination.dayThemes.relax;
    busy.themeKey = "relax";
    busy.activities = theme.activities.map(function (a) { return instantiateActivity(a, trip); });
    return "Swapped a busy day for a relaxed beach & marina day.";
  }

  function lightenDay(trip, dayIndex) {
    var day = trip.days.find(function (d) { return d.index === dayIndex; });
    if (!day) return "I couldn't find Day " + dayIndex + " in this itinerary.";
    if (day.activities.length > 3) {
      day.activities = day.activities.slice(0, Math.ceil(day.activities.length * 0.7));
      return "Trimmed Day " + dayIndex + " to a lighter pace.";
    }
    return "Day " + dayIndex + " is already fairly light.";
  }

  function handleCommand(text) {
    var trip = state.trip;
    var t = text.toLowerCase();

    if (/cheap|reduce|lower|save/.test(t) && /[\d,]{3,}/.test(t)) {
      var amountMatch = t.match(/[\d,]{3,}/);
      return applyOptimizationsTowardSavings(trip, parseInt(amountMatch[0].replace(/,/g, ""), 10));
    }
    if (/cheap|budget.?friendly/.test(t)) return applyOptimizationsTowardSavings(trip, null);

    if (/upgrade.*hotel|better hotel|5.?star|five.?star/.test(t)) {
      var best = trip.destination.hotelOptions.reduce(function (a, b) { return b.pricePerNight > a.pricePerNight ? b : a; });
      trip.selections.hotelId = best.id;
      return "Upgraded your hotel to " + best.name + " (" + best.tier + ").";
    }
    if (/abu ?dhabi/.test(t)) {
      return addSpecificDay(trip, "abudhabi") ? "Added a full Abu Dhabi day trip before your departure day." : "I couldn't add that for this destination.";
    }
    if (/shopping/.test(t) && /remove|no |drop/.test(t)) {
      var removed = removeActivitiesByTitle(trip, ["Dubai Mall", "Gold Souk", "Spice Souk"]);
      return removed ? "Removed " + removed + " shopping stop(s) from your itinerary." : "I didn't find a shopping stop to remove.";
    }
    if (/child|kid|family.?friendly/.test(t)) {
      trip.tripType = "Family";
      if (!trip.travellers.children) trip.travellers.children = 1;
      return "Tuned your itinerary notes for family travel — desert camp, aquarium and theme-park stops are already great fits.";
    }
    if (/relax|less busy|slow(er)? down|chill/.test(t) && !/day\s*\d/.test(t)) return swapADayForRelax(trip);
    if (/day\s*(\d+)/.test(t) && /less busy|lighter|calmer/.test(t)) return lightenDay(trip, parseInt(t.match(/day\s*(\d+)/)[1], 10));
    if (/cheaper dates|different dates|flexible dates/.test(t)) return "Flights and hotels are typically 10–20% cheaper just outside school holidays and long weekends — try shifting your departure by a few days either way.";
    if (/vegetarian/.test(t)) return "Noted — we'll flag vegetarian-friendly restaurants for every evening in your final itinerary. (Restaurant-level detail isn't in this preview yet.)";
    if (/one more night|add (a )?night|extra night/.test(t)) { addDay(trip); return "Added one more night to your trip."; }
    if (/remove (a |one )?night|one less night/.test(t)) {
      var middle = trip.days.find(function (d) { return d.themeKey !== "arrival" && d.themeKey !== "departure"; });
      return middle && removeDay(trip, middle.id) ? "Removed one night from your trip." : "Your trip is already at its shortest.";
    }
    return "I'm a demo assistant for this preview — try “make this cheaper”, “upgrade the hotel”, “add Abu Dhabi for one day”, or “add one more night”.";
  }

  function logCommand(youText, response) {
    var log = $("#tbCommandLog");
    var entry = document.createElement("div");
    entry.className = "tb-command-entry";
    entry.innerHTML = '<div class="tb-command-you">You: ' + esc(youText) + '</div><div>' + esc(response) + '</div>';
    log.insertBefore(entry, log.firstChild);
    while (log.children.length > 4) log.removeChild(log.lastChild);
  }

  /* ---------------------------------------------------------
     Event wiring
     --------------------------------------------------------- */
  function wireHeroEvents() {
    $("#tbHero").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-hero-action]");
      if (!btn) return;
      var action = btn.dataset.heroAction;
      if (action === "save") saveTripToDevice();
      else if (action === "share") openShareModal();
      else openEditTripMenu();
    });
  }

  function wireDayCardEvents() {
    $("#tbDayCards").addEventListener("click", function (e) {
      var removeActBtn = e.target.closest('[data-action="remove-activity"]');
      if (removeActBtn) { removeActivity(state.trip, removeActBtn.dataset.dayId, removeActBtn.dataset.activityId); refresh(); return; }

      var removeDayBtn = e.target.closest('[data-action="remove-day"]');
      if (removeDayBtn) { if (window.confirm("Remove this day from your journey?")) { removeDay(state.trip, removeDayBtn.dataset.dayId); refresh(); } return; }

      var addActBtn = e.target.closest('[data-action="add-activity"]');
      if (addActBtn) { openAddActivityModal(addActBtn.dataset.dayId); return; }

      var viewRouteBtn = e.target.closest('[data-action="view-route"]');
      if (viewRouteBtn) {
        var day = state.trip.days.find(function (d) { return d.id === viewRouteBtn.dataset.dayId; });
        var first = day && day.activities.find(function (a) { return a.coords; });
        if (first) { highlightActivity(first.id); $("#tbMap").scrollIntoView({ behavior: "smooth", block: "center" }); }
        return;
      }

      var activity = e.target.closest(".tb-activity.is-linkable");
      if (activity) highlightActivity(activity.dataset.activityId);
    });
  }

  function wireTimelineEvents() {
    $("#tbTimeline").addEventListener("click", function (e) {
      var btn = e.target.closest(".tb-timeline-stage");
      if (!btn) return;
      var target = document.getElementById(btn.dataset.dayTarget);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  }

  function wireCommandBar() {
    function submit() {
      var input = $("#tbCommandInput");
      var text = input.value.trim();
      if (!text || !state.trip) return;
      var response = handleCommand(text);
      logCommand(text, response);
      input.value = "";
      refresh();
    }
    $("#tbCommandSend").addEventListener("click", submit);
    $("#tbCommandInput").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }

  function wireQuickPlans() {
    $("#tbOptimizeBtn").addEventListener("click", openOptimizeModal);
    $("#tbBindassBtn").addEventListener("click", openBindassModal);
    $("#tbCustomizeBtn").addEventListener("click", openEditTripMenu);
    $("#tbUpgradeBtn").addEventListener("click", function () {
      var best = state.trip.destination.hotelOptions.reduce(function (a, b) { return b.pricePerNight > a.pricePerNight ? b : a; });
      state.trip.selections.hotelId = best.id;
      refresh();
      flashCostNote("Upgraded to " + best.name + " ✓");
    });
    $("#tbAddAbuDhabiBtn").addEventListener("click", function () {
      var added = addSpecificDay(state.trip, "abudhabi");
      refresh();
      flashCostNote(added ? "Added an Abu Dhabi day trip ✓" : "Not available for this destination.");
    });
    $("#tbFamilyBtn").addEventListener("click", function () {
      state.trip.tripType = "Family";
      if (!state.trip.travellers.children) state.trip.travellers.children = 1;
      refresh();
      flashCostNote("Tuned for family travel ✓");
    });
  }

  function wireInputForm() {
    $$(".tb-chip").forEach(function (chip) { chip.addEventListener("click", function () { $("#tbNaturalInput").value = chip.textContent; }); });

    $("#tbManualToggle").addEventListener("click", function () {
      var expanded = this.getAttribute("aria-expanded") === "true";
      this.setAttribute("aria-expanded", String(!expanded));
      $("#tbManualFields").hidden = expanded;
    });

    $$(".tb-pill", $("#tbTripTypes")).forEach(function (p) {
      p.addEventListener("click", function () {
        $$(".tb-pill", $("#tbTripTypes")).forEach(function (x) { x.classList.remove("is-active"); });
        p.classList.add("is-active");
      });
    });

    $("#tbBuildBtn").addEventListener("click", buildFromForm);
  }

  function showInputNote(msg) { var el = $("#tbInputNote"); el.textContent = msg; el.hidden = false; }
  function hideInputNote() { $("#tbInputNote").hidden = true; }

  function buildFromForm() {
    var nlText = $("#tbNaturalInput").value.trim();
    var parsed = nlText ? parseNaturalLanguage(nlText) : {};

    var from = parsed.from || $("#tbFrom").value;
    var typedDestination = ($("#tbDestination").value || "").trim();
    var matchedSlug = parsed.destinationSlug || (typedDestination ? matchDestinationSlug(typedDestination) : null);

    if (typedDestination && !matchedSlug) {
      showInputNote("This preview currently only builds journeys for Dubai — showing a Dubai journey instead. We're adding more destinations to this engine soon.");
    } else {
      hideInputNote();
    }
    var destinationSlug = matchedSlug || "dubai";

    var activeTypePill = $(".tb-pill.is-active", $("#tbTripTypes"));
    var trip = buildTrip({
      destinationSlug: destinationSlug,
      from: from,
      nights: parsed.nights || parseInt($("#tbNights").value, 10) || 4,
      adults: parsed.adults || parseInt($("#tbAdults").value, 10) || 2,
      children: parsed.children != null ? parsed.children : (parseInt($("#tbChildren").value, 10) || 0),
      budget: parseInt($("#tbBudget").value, 10) || null,
      tripType: parsed.tripType || (activeTypePill && activeTypePill.dataset.type) || "Family",
      departure: $("#tbDeparture").value ? new Date($("#tbDeparture").value) : (parsed.month != null ? nextDateForMonth(parsed.month) : null)
    });

    launchTrip(trip);
  }

  function launchTrip(trip) {
    state.trip = trip;
    $("#tbInputSection").hidden = true;
    $("#tbApp").hidden = false;
    renderExperiences(trip);
    refresh();
    updateUrlForTrip(trip);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateUrlForTrip(trip) {
    try { history.replaceState(null, "", location.pathname + "?state=" + encodeState(buildShareState(trip))); } catch (e) { /* ignore in sandboxed previews */ }
  }

  function wireGlobalControls() {
    $("#tbAddDay").addEventListener("click", function () { addDay(state.trip); refresh(); });
    $("#tbMobileCustomize").addEventListener("click", openEditTripMenu);
  }

  function prefillFromQueryString() {
    var params = new URLSearchParams(location.search);
    if (params.get("state")) {
      var s = decodeState(params.get("state"));
      if (s) { launchTrip(tripFromState(s)); return true; }
    }
    if (params.get("from") || params.get("destination")) {
      if (params.get("from")) $("#tbFrom").value = sanitizeName(params.get("from"));
      if (params.get("destination")) $("#tbDestination").value = sanitizeName(params.get("destination"));
      if (params.get("adults")) $("#tbAdults").value = params.get("adults");
      if (params.get("children")) $("#tbChildren").value = params.get("children");
      if (params.get("days")) $("#tbNights").value = Math.max(1, parseInt(params.get("days"), 10) - 1);
      $("#tbManualToggle").click();
    }
    return false;
  }

  function init() {
    wireInputForm();
    wireHeroEvents();
    wireDayCardEvents();
    wireTimelineEvents();
    wireCommandBar();
    wireQuickPlans();
    wireGlobalControls();
    wireModalCloseButtons();
    prefillFromQueryString();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
