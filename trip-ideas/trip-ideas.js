/* =========================================================
   Bookbindass — AI Trip Ideas
   Vanilla JS. Calls a small Cloudflare Worker (see
   /cloudflare-worker) that holds the OpenAI key server-side —
   this file never sees or sends any secret.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };

  /* ---------------------------------------------------------
     Set this to your deployed Worker URL once you've followed
     /cloudflare-worker/README.md. Until then the form will show
     a friendly "not configured yet" message instead of failing
     silently.
     --------------------------------------------------------- */
  var CONFIG = {
    ENDPOINT: "https://bookbindass-trip-ideas.bookbindasscom.workers.dev"
  };

  var form = $("#ideasForm");
  if (!form) return;

  var queryField = $("#ideasQuery");
  var submitBtn = $("#ideasSubmit");
  var loadingEl = $("#ideasLoading");
  var resultsEl = $("#ideasResults");
  var gridEl = $("#ideasGrid");

  function setError(message) {
    var el = $("#ideasError");
    if (el) el.textContent = message || "";
  }

  function setLoading(isLoading) {
    loadingEl.hidden = !isLoading;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Thinking…" : "Get destination ideas";
  }

  var currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });

  function formatINR(amount) {
    var n = Number(amount);
    if (!isFinite(n) || isNaN(n)) return "";
    return currencyFormatter.format(Math.round(n));
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function buildCalculatorLink(trip, destination) {
    var params = new URLSearchParams();
    if (trip && trip.from) params.set("from", trip.from);
    if (destination) params.set("destination", destination);
    if (trip && trip.adults) params.set("adults", trip.adults);
    if (trip && trip.children) params.set("children", trip.children);
    if (trip && trip.days) params.set("days", trip.days);
    var qs = params.toString();
    return "../trip-cost-calculator/" + (qs ? "?" + qs : "");
  }

  function renderResults(data) {
    var trip = data.trip || {};
    var suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];

    if (!suggestions.length) {
      setError("Couldn't come up with any ideas for that — try describing your trip differently.");
      resultsEl.hidden = true;
      return;
    }

    gridEl.innerHTML = suggestions.map(function (s) {
      var low = formatINR(s.priceLow);
      var high = formatINR(s.priceHigh);
      var priceLabel = low && high ? (low + " – " + high) : (low || high || "");

      return (
        '<article class="idea-card">' +
          '<h3>' + escapeHtml(s.destination) + '</h3>' +
          (priceLabel ? '<p class="idea-price">' + priceLabel + '</p>' : "") +
          '<p class="idea-reason">' + escapeHtml(s.reason) + '</p>' +
          '<a class="btn btn-primary idea-build-btn" href="' + buildCalculatorLink(trip, s.destination) + '">Build this trip</a>' +
        '</article>'
      );
    }).join("");

    resultsEl.hidden = false;
    resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillExample(text) {
    queryField.value = text;
    queryField.focus();
  }

  document.querySelectorAll(".ideas-example-chip").forEach(function (chip) {
    chip.addEventListener("click", function () { fillExample(chip.textContent); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setError("");
    resultsEl.hidden = true;

    var query = (queryField.value || "").trim();
    if (!query) {
      setError("Tell us a bit about your trip first.");
      return;
    }

    if (!CONFIG.ENDPOINT) {
      setError("AI trip ideas aren't set up yet — see /cloudflare-worker/README.md to deploy the Worker, then set CONFIG.ENDPOINT in trip-ideas.js.");
      return;
    }

    setLoading(true);

    fetch(CONFIG.ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        setLoading(false);
        if (!result.ok) {
          setError((result.data && result.data.error) || "Something went wrong — please try again.");
          return;
        }
        renderResults(result.data);
      })
      .catch(function () {
        setLoading(false);
        setError("Couldn't reach the AI service. Please check your connection and try again.");
      });
  });
})();
