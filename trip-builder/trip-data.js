/* =========================================================
   Bookbindass Visual Trip Builder — destination fixture data
   ---------------------------------------------------------
   This is the ONLY file that knows anything about a specific
   destination. The engine (trip-builder.js) is generic: it
   reads a destination's entry from window.TB_DESTINATIONS by
   slug and never hard-codes "Dubai" anywhere in its logic.

   Today only "dubai" is populated. To support another
   destination later, add a sibling key here with the same
   shape — no engine code changes required.

   All prices are MOCK/ESTIMATED demo figures for this
   preview, not live fares or rates. See TB.money() call
   sites for how "Estimated" labelling is enforced in the UI.
   ========================================================= */
(function (global) {
  "use strict";

  var dubai = {
    slug: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    flag: "🇦🇪",
    airportCode: "DXB",
    currency: "INR",
    heroImage: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=900&fit=crop",
    center: { lat: 25.1972, lng: 55.2744 },
    bestTime: "October – April (20–30°C, low humidity). May–September is very hot but quieter and cheaper.",
    visaNote: "Visa-on-arrival for most Indian nationals — processed at Dubai immigration in minutes.",

    /* Multi-tier options so Edit / Optimize / Bindass Mode have
       something real to switch between. */
    hotelOptions: [
      { id: "hotel-budget", name: "Rove Downtown", tier: "Budget", pricePerNight: 5200, area: "Downtown Dubai", coords: { lat: 25.1900, lng: 55.2750 }, image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&h=400&fit=crop" },
      { id: "hotel-standard", name: "Address Dubai Marina", tier: "Standard", pricePerNight: 11800, area: "Dubai Marina", coords: { lat: 25.0805, lng: 55.1403 }, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop" },
      { id: "hotel-luxury", name: "Burj Al Arab Jumeirah", tier: "Luxury", pricePerNight: 48000, area: "Jumeirah Beach", coords: { lat: 25.1413, lng: 55.1853 }, image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=400&fit=crop" }
    ],
    defaultHotelId: "hotel-standard",

    flightOptions: [
      { id: "flight-direct", label: "Direct", route: "{from} → DXB", pricePerAdult: 23800, durationMin: 210, stops: 0 },
      { id: "flight-onestop-bom", label: "1-stop via Mumbai", route: "{from} → BOM → DXB", pricePerAdult: 11400, durationMin: 350, stops: 1 }
    ],
    defaultFlightId: "flight-direct",

    transferOptions: [
      { id: "transfer-private", label: "Private car transfer", pricePerLeg: 1600, note: "Door-to-door, no waiting" },
      { id: "transfer-shared", label: "Shared airport shuttle", pricePerLeg: 700, note: "~20–30 min shared wait" }
    ],
    defaultTransferId: "transfer-private",

    localTransportOptions: [
      { id: "local-taxi", label: "Taxis / private car", pricePerDay: 2200 },
      { id: "local-metro", label: "Metro + occasional taxi", pricePerDay: 750 }
    ],
    defaultLocalTransportId: "local-taxi",

    foodPerAdultPerDay: 2200,
    visaCostPerAdult: 4200,

    /* Day "themes" cycled in order to build an itinerary of any
       length. arrival/departure are used exactly once each; the
       rest cycle through the middle days. */
    dayThemes: {
      arrival: {
        title: "Arrival",
        headline: "{from} → Dubai",
        image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=500&fit=crop",
        activities: [
          { title: "Home pickup", time: "Morning", location: "{from}", durationMin: 30, cost: 0, icon: "🏠" },
          { title: "Airport check-in", time: "Morning", location: "{from} Airport", durationMin: 60, cost: 0, icon: "🛫" },
          { title: "Flight to Dubai", time: "Midday", location: "In flight", durationMin: null, cost: null, icon: "✈️", isFlight: true },
          { title: "Immigration & arrival", time: "Afternoon", location: "Dubai Airport (DXB)", durationMin: 45, cost: 0, icon: "🛃", coords: { lat: 25.2532, lng: 55.3657 } },
          { title: "Hotel transfer", time: "Afternoon", location: "DXB → Hotel", durationMin: 40, cost: null, icon: "🚕", isTransfer: true },
          { title: "Hotel check-in", time: "Evening", location: "Your hotel", durationMin: 30, cost: 0, icon: "🏨", isHotelCheckin: true },
          { title: "Evening stroll & dinner", time: "Evening", location: "Near your hotel", durationMin: 90, cost: 1800, icon: "🌆" }
        ]
      },
      city: {
        title: "Dubai City",
        headline: "Icons of the city",
        image: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=800&h=500&fit=crop",
        activities: [
          { title: "Burj Khalifa — At the Top", time: "Morning", location: "Burj Khalifa", durationMin: 90, cost: 3200, icon: "🏙️", coords: { lat: 25.1972, lng: 55.2744 } },
          { title: "Dubai Mall", time: "Midday", location: "Dubai Mall", durationMin: 150, cost: 1500, icon: "🛍️", coords: { lat: 25.1975, lng: 55.2796 } },
          { title: "Dubai Aquarium & Underwater Zoo", time: "Afternoon", location: "Dubai Mall", durationMin: 60, cost: 1400, icon: "🐠", coords: { lat: 25.1975, lng: 55.2796 } },
          { title: "Dubai Fountain show", time: "Evening", location: "Burj Lake", durationMin: 30, cost: 0, icon: "⛲", coords: { lat: 25.1953, lng: 55.2708 } },
          { title: "Dubai Marina walk", time: "Night", location: "Dubai Marina", durationMin: 60, cost: 500, icon: "🌃", coords: { lat: 25.0800, lng: 55.1400 } }
        ],
        extras: [
          { title: "La Perle by Dragone show", time: "Night", location: "Al Habtoor City", durationMin: 90, cost: 3500, icon: "🎭", coords: { lat: 25.1889, lng: 55.3033 } },
          { title: "Ski Dubai", time: "Afternoon", location: "Mall of the Emirates", durationMin: 120, cost: 2800, icon: "⛷️", coords: { lat: 25.1181, lng: 55.2003 } }
        ]
      },
      desert: {
        title: "Desert Experience",
        headline: "Dunes, camels & a Bedouin dinner",
        image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800&h=500&fit=crop",
        activities: [
          { title: "Morning free / pool time", time: "Morning", location: "Your hotel", durationMin: 180, cost: 0, icon: "🏊" },
          { title: "Desert Safari pickup", time: "Afternoon", location: "Hotel pickup", durationMin: 30, cost: null, icon: "🚙", isTransfer: true },
          { title: "Dune bashing", time: "Afternoon", location: "Al Marmoom Desert", durationMin: 45, cost: 2800, icon: "🏜️", coords: { lat: 24.8850, lng: 55.5566 } },
          { title: "Camel ride & sandboarding", time: "Evening", location: "Desert camp", durationMin: 40, cost: 900, icon: "🐪", coords: { lat: 24.8850, lng: 55.5566 } },
          { title: "BBQ dinner under the stars", time: "Night", location: "Desert camp", durationMin: 120, cost: 2200, icon: "🔥", coords: { lat: 24.8850, lng: 55.5566 } }
        ],
        extras: [
          { title: "Quad biking", time: "Afternoon", location: "Al Marmoom Desert", durationMin: 30, cost: 2200, icon: "🏍️", coords: { lat: 24.8850, lng: 55.5566 } }
        ]
      },
      explore: {
        title: "Explore",
        headline: "Palm, Atlantis & beyond",
        image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&h=500&fit=crop",
        activities: [
          { title: "Palm Jumeirah monorail", time: "Morning", location: "Palm Jumeirah", durationMin: 60, cost: 300, icon: "🌴", coords: { lat: 25.1124, lng: 55.1390 } },
          { title: "Atlantis Aquaventure", time: "Midday", location: "Atlantis The Palm", durationMin: 180, cost: 4500, icon: "🐬", coords: { lat: 25.1304, lng: 55.1173 } },
          { title: "Dubai Frame", time: "Afternoon", location: "Zabeel Park", durationMin: 60, cost: 600, icon: "🖼️", coords: { lat: 25.2354, lng: 55.3006 } },
          { title: "Global Village", time: "Evening", location: "Global Village", durationMin: 150, cost: 900, icon: "🎡", coords: { lat: 25.0687, lng: 55.3086 } }
        ],
        extras: [
          { title: "IMG Worlds of Adventure", time: "Afternoon", location: "IMG Worlds", durationMin: 150, cost: 3200, icon: "🎢", coords: { lat: 25.1601, lng: 55.4176 } }
        ]
      },
      abudhabi: {
        title: "Abu Dhabi Day Trip",
        headline: "Sheikh Zayed Mosque & Louvre",
        image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800&h=500&fit=crop",
        activities: [
          { title: "Drive to Abu Dhabi", time: "Morning", location: "Dubai → Abu Dhabi", durationMin: 90, cost: null, icon: "🚗", isTransfer: true },
          { title: "Sheikh Zayed Grand Mosque", time: "Morning", location: "Abu Dhabi", durationMin: 90, cost: 0, icon: "🕌", coords: { lat: 24.4128, lng: 54.4750 } },
          { title: "Louvre Abu Dhabi", time: "Afternoon", location: "Saadiyat Island", durationMin: 120, cost: 1800, icon: "🖼️", coords: { lat: 24.5335, lng: 54.3985 } },
          { title: "Corniche waterfront", time: "Evening", location: "Abu Dhabi Corniche", durationMin: 60, cost: 500, icon: "🌅", coords: { lat: 24.4667, lng: 54.3333 } },
          { title: "Drive back to Dubai", time: "Night", location: "Abu Dhabi → Dubai", durationMin: 90, cost: null, icon: "🚗", isTransfer: true }
        ]
      },
      relax: {
        title: "Beach & Marina",
        headline: "A slower, relaxed day",
        image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=500&fit=crop",
        activities: [
          { title: "Beach club morning", time: "Morning", location: "JBR Beach", durationMin: 180, cost: 1200, icon: "🏖️", coords: { lat: 25.0764, lng: 55.1334 } },
          { title: "Spa treatment", time: "Afternoon", location: "Hotel spa", durationMin: 90, cost: 3500, icon: "💆", coords: null },
          { title: "Sunset dhow cruise", time: "Evening", location: "Dubai Marina", durationMin: 120, cost: 2400, icon: "🛥️", coords: { lat: 25.0800, lng: 55.1400 } }
        ],
        extras: [
          { title: "Hot air balloon at sunrise", time: "Morning", location: "Desert conservation area", durationMin: 240, cost: 9500, icon: "🎈", coords: { lat: 24.9800, lng: 55.7500 } }
        ]
      },
      oldDubai: {
        title: "Old Dubai & Souks",
        headline: "Gold, spice and creek culture",
        image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&h=500&fit=crop",
        activities: [
          { title: "Abra ride across the Creek", time: "Morning", location: "Dubai Creek", durationMin: 20, cost: 100, icon: "🛶", coords: { lat: 25.2637, lng: 55.2972 } },
          { title: "Gold Souk", time: "Morning", location: "Deira", durationMin: 60, cost: 0, icon: "✨", coords: { lat: 25.2697, lng: 55.2972 } },
          { title: "Spice Souk", time: "Midday", location: "Deira", durationMin: 45, cost: 0, icon: "🌶️", coords: { lat: 25.2685, lng: 55.2963 } },
          { title: "Al Fahidi historic district", time: "Afternoon", location: "Bur Dubai", durationMin: 90, cost: 300, icon: "🏛️", coords: { lat: 25.2637, lng: 55.2972 } }
        ]
      },
      departure: {
        title: "Departure",
        headline: "Dubai → {from}",
        image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=500&fit=crop",
        activities: [
          { title: "Hotel checkout", time: "Morning", location: "Your hotel", durationMin: 30, cost: 0, icon: "🏨" },
          { title: "Airport transfer", time: "Morning", location: "Hotel → DXB", durationMin: 40, cost: null, icon: "🚕", isTransfer: true },
          { title: "Flight home", time: "Afternoon", location: "In flight", durationMin: null, cost: null, icon: "✈️", isFlight: true },
          { title: "Arrival & home drop", time: "Evening", location: "{from}", durationMin: 30, cost: 0, icon: "🏠" }
        ]
      }
    },

    /* Order the middle-day themes cycle through for trips longer
       than the fixed arrival/city/desert/explore/departure template. */
    middleThemeCycle: ["city", "desert", "explore", "relax", "oldDubai", "abudhabi"],

    /* Named map pins shown on the route map regardless of which
       activities are in the itinerary (airport + hotel are always
       relevant reference points). */
    alwaysOnMap: [
      { id: "airport", label: "Dubai Airport (DXB)", coords: { lat: 25.2532, lng: 55.3657 }, icon: "✈️" }
    ],

    /* Budget-optimization suggestions (polished, low-drama swaps). */
    optimizations: [
      {
        id: "opt-hotel-tier-down",
        label: "Switch to a Standard-tier hotel",
        explain: "Same location quality, one tier down in room finish.",
        appliesIf: function (trip) { return trip.selections.hotelId === "hotel-luxury"; },
        savings: function (trip) { return (48000 - 11800) * trip.duration.nights; },
        apply: function (trip) { trip.selections.hotelId = "hotel-standard"; }
      },
      {
        id: "opt-shared-transfer",
        label: "Use a shared airport transfer instead of private",
        explain: "A little more waiting time, notably cheaper both ways.",
        appliesIf: function (trip) { return trip.selections.transferId === "transfer-private"; },
        savings: function () { return (1600 - 700) * 2; },
        apply: function (trip) { trip.selections.transferId = "transfer-shared"; }
      },
      {
        id: "opt-flight-onestop",
        label: "Take a 1-stop flight via Mumbai instead of direct",
        explain: "Adds roughly 2h20m of travel time, meaningfully cheaper fares.",
        appliesIf: function (trip) { return trip.selections.flightId === "flight-direct"; },
        savings: function (trip) { return (23800 - 11400) * trip.travellers.adults; },
        apply: function (trip) { trip.selections.flightId = "flight-onestop-bom"; }
      },
      {
        id: "opt-drop-shopping",
        label: "Drop one shopping-heavy activity (Dubai Mall)",
        explain: "Keeps the free browsing, removes the priced add-ons inside it.",
        appliesIf: function (trip) { return trip.days.some(function (d) { return d.activities.some(function (a) { return a.title === "Dubai Mall"; }); }); },
        savings: function () { return 1500; },
        apply: function (trip) {
          trip.days.forEach(function (d) {
            d.activities = d.activities.filter(function (a) { return a.title !== "Dubai Mall"; });
          });
        }
      }
    ],

    /* Bindass Mode ideas — unconventional but practical, each with
       an explicit trade-off the user must accept. */
    bindassIdeas: [
      {
        id: "bindass-onestop",
        label: "Fly DEL → BOM → DXB instead of direct",
        savingsLabel: "SAVE ₹" ,
        savings: function (trip) { return (23800 - 11400) * trip.travellers.adults; },
        tradeoff: "+2h 20m extra travel time",
        appliesIf: function (trip) { return trip.selections.flightId === "flight-direct"; },
        apply: function (trip) { trip.selections.flightId = "flight-onestop-bom"; }
      },
      {
        id: "bindass-metro",
        label: "Use Dubai Metro instead of taxis for local transport",
        savings: function (trip) { return (2200 - 750) * trip.duration.nights; },
        tradeoff: "+15–20 min per trip, less convenient with luggage",
        appliesIf: function (trip) { return trip.selections.localTransportId === "local-taxi"; },
        apply: function (trip) { trip.selections.localTransportId = "local-metro"; }
      },
      {
        id: "bindass-hotel-outside-center",
        label: "Stay at Rove (Downtown-adjacent) instead of Marina",
        savings: function (trip) { return (11800 - 5200) * trip.duration.nights; },
        tradeoff: "10–15 min further from the beach clubs",
        appliesIf: function (trip) { return trip.selections.hotelId !== "hotel-budget"; },
        apply: function (trip) { trip.selections.hotelId = "hotel-budget"; }
      },
      {
        id: "bindass-shared-transfer",
        label: "Shared airport shuttle instead of a private car",
        savings: function () { return (1600 - 700) * 2; },
        tradeoff: "~20–30 min shared wait at each end",
        appliesIf: function (trip) { return trip.selections.transferId === "transfer-private"; },
        apply: function (trip) { trip.selections.transferId = "transfer-shared"; }
      }
    ],

    /* Curated "top experiences" gallery for the summary section —
       distinct photography per landmark (never the same generic
       destination shot repeated). */
    experienceGallery: [
      { title: "Burj Khalifa", sub: "At the Top", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop" },
      { title: "Desert Safari", sub: "Dune Bashing, BBQ", image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400&h=300&fit=crop" },
      { title: "Dubai Marina", sub: "Cruise & Dine", image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400&h=300&fit=crop" },
      { title: "Palm Jumeirah", sub: "Iconic Views", image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&h=300&fit=crop" },
      { title: "Dubai Mall", sub: "Shopping & Aquarium", image: "https://images.unsplash.com/photo-1489516408517-0c0a15662682?w=400&h=300&fit=crop" },
      { title: "Global Village", sub: "Culture & Entertainment", image: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=400&h=300&fit=crop" }
    ],

    /* Static inputs for the Trip Experience Score — kept separate
       from live cost math since these are qualitative, not priced. */
    scoreFacts: {
      walking: "Medium",
      weatherByMonth: {
        // 0 = Jan … 11 = Dec. true = comfortable season.
        good: [true, true, true, true, false, false, false, false, false, true, true, true]
      }
    }
  };

  global.TB_DESTINATIONS = { dubai: dubai };
})(window);
