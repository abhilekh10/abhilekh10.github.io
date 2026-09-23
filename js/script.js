/* =========================================================
   Bookbindass — site behaviour
   Sticky header · mobile nav · scroll reveal · destination
   filter · scroll spy · form validation · back to top
   ========================================================= */
(function () {
  "use strict";

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- current year ---------- */
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- sticky header + back-to-top ---------- */
  var header = $("#siteHeader");
  var toTop  = $("#toTop");
  var hero   = $(".hero");

  function onScroll() {
    var y = window.scrollY;
    // on the home page the header only goes solid once we're past the hero
    var threshold = hero ? Math.min(hero.offsetHeight - 120, 420) : 20;
    if (header) header.classList.toggle("is-stuck", y > threshold);
    if (toTop)  toTop.classList.toggle("is-visible", y > 700);
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- mobile nav ---------- */
  var navToggle = $("#navToggle");
  var nav = $("#nav");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    $$("a", nav).forEach(function (link) { link.addEventListener("click", closeNav); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });
  }

  /* ---------- scroll reveal ---------- */
  var revealables = $$(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

    revealables.forEach(function (el, i) {
      // stagger siblings a little so grids cascade rather than pop
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      revealer.observe(el);
    });
  }

  /* ---------- destination filter ---------- */
  var filters = $$(".filter");
  var cards = $$("#destinationGrid .card");
  var emptyMsg = $("#gridEmpty");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var region = btn.dataset.filter;

      filters.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      var shown = 0;
      cards.forEach(function (card) {
        var match = region === "all" || card.dataset.region === region;
        card.classList.toggle("is-hidden", !match);
        if (match) {
          shown++;
          // replay the reveal so filtered-in cards animate back
          card.classList.remove("is-visible");
          void card.offsetWidth;
          card.classList.add("is-visible");
        }
      });

      if (emptyMsg) emptyMsg.hidden = shown !== 0;
    });
  });

  /* ---------- visa tabs ---------- */
  $$(".tabs").forEach(function (group) {
    var tabs = $$('[role="tab"]', group);
    if (!tabs.length) return;

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
        // roving tabindex: only the selected tab is in the tab order
        t.tabIndex = active ? 0 : -1;

        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !active;
      });

      if (focus) tab.focus();
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab, false); });
    });

    group.querySelector('[role="tablist"]').addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i === -1) return;

      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];

      if (!next) return;
      e.preventDefault();
      select(next, true);
    });
  });

  /* ---------- scroll spy ---------- */
  var navLinks = $$(".nav-link");
  var sections = navLinks
    .map(function (link) { return document.getElementById(link.getAttribute("href").slice(1)); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-current", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ---------- bank details disclosure ---------- */
  var bankDetails = $("#bankDetails");

  if (bankDetails) {
    // someone who followed a "Bank details" link wants it open, not collapsed
    var openBank = function () { bankDetails.open = true; };

    if (window.location.hash === "#bank") openBank();
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#bank") openBank();
    });
    $$('a[href$="#bank"]').forEach(function (link) { link.addEventListener("click", openBank); });
  }

  /* ---------- copy-to-clipboard (bank details) ---------- */
  $$(".copy").forEach(function (btn) {
    var label = btn.textContent;
    var timer;

    function done(ok) {
      btn.textContent = ok ? "Copied" : "Press \u2318C";
      btn.classList.toggle("is-copied", ok);
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        btn.textContent = label;
        btn.classList.remove("is-copied");
      }, 1800);
    }

    // For http:// origins, older browsers, and any clipboard permission refusal.
    // Selects the value in place so "Press Cmd/Ctrl+C" is actually true — an
    // off-screen textarea would leave the user nothing selected to copy.
    function fallback() {
      var target = btn.parentNode.querySelector(".bank-value");
      var ok = false;

      if (target) {
        var range = document.createRange();
        range.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        if (ok) sel.removeAllRanges();
      }

      done(ok);
    }

    btn.addEventListener("click", function () {
      var now = Date.now();

      // Rate limiting: prevent rapid clicks
      if (now - btn.__lastClick < 500) {
        return;
      }
      btn.__lastClick = now;

      var value = btn.dataset.copy || "";

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(function () { done(true); }, fallback);
        return;
      }

      fallback();
    });

    btn.__lastClick = 0;
  });

  /* ---------- security: prevent right-click on sensitive data ---------- */
  var sensitiveZones = $$("[data-sensitive], [data-secure-zone]");
  sensitiveZones.forEach(function (zone) {
    zone.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      return false;
    });
  });

  /* ---------- security: prevent keyboard shortcuts on sensitive data ---------- */
  var secureZone = $("[data-secure-zone]");
  if (secureZone) {
    document.addEventListener("keydown", function (e) {
      var target = e.target;
      // Check if the key event originated from within sensitive area
      if (!secureZone.contains(target)) return;

      // Block Ctrl+A / Cmd+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+C / Cmd+C (copy) except on .copy buttons
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !target.closest(".copy")) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+X / Cmd+X (cut)
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        return false;
      }
    });
  }

  /* ---------- security: prevent image drag on QR code ---------- */
  var qrCode = $("[data-secure='qr-code']");
  if (qrCode) {
    qrCode.addEventListener("dragstart", function (e) {
      e.preventDefault();
      return false;
    });

    qrCode.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      return false;
    });
  }

  /* ---------- Explore tabs (Atlys-inspired UX) ---------- */
  var exploreTabs = $$(".explore-tab");
  var tabContents = $$(".explore-content");

  exploreTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var targetTab = this.getAttribute("data-tab");

      // Hide all tab contents
      tabContents.forEach(function (content) {
        content.style.display = "none";
      });

      // Remove active state from all tabs
      exploreTabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });

      // Show selected tab content and mark tab as active
      var targetContent = $("[data-tab-content='" + targetTab + "']");
      if (targetContent) {
        targetContent.style.display = "block";
      }
      this.classList.add("is-active");
      this.setAttribute("aria-selected", "true");
    });
  });

  /* ---------- filter pills (event categories) ---------- */
  var filterPills = $$(".filter-pill");
  filterPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      var filter = this.getAttribute("data-filter");
      var activeTab = $(".explore-tab.is-active");
      var activeContent = $("[data-tab-content='" + activeTab.getAttribute("data-tab") + "']");

      // Update active filter pill
      $$(".filter-pill").forEach(function (p) {
        p.classList.remove("is-active");
      });
      this.classList.add("is-active");

      // Filter event cards if in events tab
      if (activeContent && filter !== "all") {
        var eventCards = $$(".event-card", activeContent);
        eventCards.forEach(function (card) {
          var cardCategory = card.getAttribute("data-category");
          card.style.display = (cardCategory === filter) ? "block" : "none";
        });
      } else if (activeContent) {
        // Show all cards
        var allCards = $$(".event-card", activeContent);
        allCards.forEach(function (card) {
          card.style.display = "block";
        });
      }
    });
  });

  /* ---------- enquiry form now handled by MS Forms ---------- */
})();
