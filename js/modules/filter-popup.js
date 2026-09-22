import { el, clear } from "../utils/dom.js";
import { filtersToParams, navigateWithFilters, saveFilters } from "../utils/filters-query.js";

const MONTH_NAMES_FALLBACK = [
  "ЯНВАРЬ",
  "ФЕВРАЛЬ",
  "МАРТ",
  "АПРЕЛЬ",
  "МАЙ",
  "ИЮНЬ",
  "ИЮЛЬ",
  "АВГУСТ",
  "СЕНТЯБРЬ",
  "ОКТЯБРЬ",
  "НОЯБРЬ",
  "ДЕКАБРЬ",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function makeChip(labels, { icon, emptyLabel, emptyValue, clearKey, action }) {
  const labelEl = el("span", { className: "filter-chip__label", text: emptyLabel || "" });
  const valueEl = el("span", { className: "filter-chip__value", text: emptyValue || "" });
  if (!emptyValue) valueEl.hidden = true;

  const clearBtn = el("button", {
    className: "filter-chip__clear",
    type: "button",
    text: labels.clear || "Очистить",
    "data-clear": clearKey,
  });
  clearBtn.hidden = true;

  const rootEl = el(
    "div",
    {
      className: "filter-chip",
      role: "button",
      tabindex: "0",
      "data-action": action || "",
    },
    [
      el("span", { className: "filter-chip__left" }, [
        el("img", { src: icon, alt: "" }),
        labelEl,
      ]),
      el("span", { className: "filter-chip__right" }, [clearBtn, valueEl]),
    ]
  );

  return {
    root: rootEl,
    setFilled(filledText) {
      const filled = Boolean(filledText);
      if (filled) {
        labelEl.textContent = filledText;
        labelEl.classList.add("is-filled");
        valueEl.textContent = "";
        valueEl.hidden = true;
        clearBtn.hidden = false;
        rootEl.classList.add("is-filled");
      } else {
        labelEl.textContent = emptyLabel || "";
        labelEl.classList.remove("is-filled");
        valueEl.textContent = emptyValue || "";
        valueEl.hidden = !emptyValue;
        clearBtn.hidden = true;
        rootEl.classList.remove("is-filled");
      }
    },
  };
}

function wrapPanel(card) {
  return el("div", { className: "filter-block__panel-wrap" }, [
    el("div", { className: "filter-block__panel-inner" }, [card]),
  ]);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.append(link);
    }

    const existing = document.getElementById("leaflet-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.append(script);
  });
}

export function createFilterPopup({
  searchRoot,
  tabs,
  labels,
  procedures,
  mapPins,
  timeSlots,
  initialFilters = null,
  onSubmit = null,
}) {
  const copy = labels || {};
  const state = {
    open: false,
    panel: "search",
    tab: tabs[0]?.id || "services",
    procedure: null,
    procedureQuery: "",
    date: null,
    timeSlot: timeSlots[0] || null,
    place: null,
    addressPreset: null,
    addressQuery: "",
    calendarCursor: new Date(),
    panelLock: false,
  };

  const homeInput = searchRoot?.querySelector(".search__input");
  const homeTabs = searchRoot?.querySelector('[data-bind="search.tabs"]');

  const root = el("div", {
    className: "filter-popup",
    id: "filter-popup",
    "aria-hidden": "true",
  });

  const backdrop = el("div", { className: "filter-popup__backdrop" });
  const sheet = el("div", { className: "filter-popup__sheet" });

  const tabsEl = el("div", { className: "filter-popup__tabs", role: "tablist" });
  const closeBtn = el(
    "button",
    { className: "filter-popup__tabs-clear", type: "button", "aria-label": "Закрыть" },
    [el("img", { src: "assets/icons/close.svg", alt: "" })]
  );
  const tabsRow = el("div", { className: "filter-popup__tabs-row" }, [tabsEl, closeBtn]);

  const searchCardTitle = el("div", { className: "filter-card__title", text: "" });

  function activeTabLabel() {
    return tabs.find((t) => t.id === state.tab)?.label || copy.servicesTitle || "Услуги";
  }

  function syncCardTitle() {
    searchCardTitle.textContent = activeTabLabel();
  }

  function renderTabs() {
    if (!tabsEl.childElementCount) {
      tabs.forEach((tab) => {
        tabsEl.append(
          el(
            "button",
            {
              className: "filter-popup__tab",
              type: "button",
              role: "tab",
              "aria-selected": "false",
              "data-tab": tab.id,
            },
            [el("span", { className: "filter-popup__tab-label", text: tab.label })]
          )
        );
      });
    }

    tabsEl.querySelectorAll(".filter-popup__tab").forEach((node) => {
      const active = node.getAttribute("data-tab") === state.tab;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", String(active));
    });
    syncCardTitle();
  }

  const body = el("div", { className: "filter-popup__body" });
  const stack = el("div", { className: "filter-stack" });

  const searchFieldInput = el("input", {
    type: "search",
    placeholder:
      copy.procedureSearchPlaceholder || copy.procedurePlaceholder || "Поиск процедур",
    autocomplete: "off",
  });
  const searchFieldClear = el("button", {
    className: "filter-field__clear",
    type: "button",
    text: copy.clear || "Очистить",
    "data-clear": "procedure",
  });
  searchFieldClear.hidden = true;

  const searchField = el("div", { className: "filter-field" }, [
    el("img", { src: "assets/icons/search.svg", alt: "" }),
    searchFieldInput,
    searchFieldClear,
  ]);
  const procList = el("div", { className: "filter-proc-list" });
  const searchCard = el("div", { className: "filter-card" }, [
    searchCardTitle,
    searchField,
    el("div", { className: "filter-card__subtitle", text: copy.recommended || "" }),
    procList,
  ]);
  const searchPanel = wrapPanel(searchCard);

  const procChip = makeChip(copy, {
    icon: "assets/icons/search.svg",
    emptyLabel: copy.procedurePlaceholder,
    emptyValue: "",
    clearKey: "procedure",
    action: "goto-search",
  });
  procChip.root.classList.add("filter-block__chip");

  const whenChip = makeChip(copy, {
    icon: "assets/icons/calendar.svg",
    emptyLabel: copy.when,
    emptyValue: copy.pickDates,
    clearKey: "when",
    action: "goto-calendar",
  });
  whenChip.root.classList.add("filter-block__chip");

  const whereChip = makeChip(copy, {
    icon: "assets/icons/map-pin-outline.svg",
    emptyLabel: copy.where,
    emptyValue: copy.myLocation,
    clearKey: "where",
    action: "goto-map",
  });
  whereChip.root.classList.add("filter-block__chip");

  const calMonthName = el("span", { className: "filter-cal__month-name" });
  const calMonthYear = el("span", { className: "filter-cal__month-year" });
  const calMonthLabel = el("div", { className: "filter-cal__month" }, [
    calMonthName,
    calMonthYear,
  ]);
  const calGrid = el("div", { className: "filter-cal__grid" });
  const calWeek = el("div", { className: "filter-cal__week" });
  (copy.weekdays || ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]).forEach((d) => {
    calWeek.append(el("span", { text: d }));
  });
  const calSlots = el("div", { className: "filter-cal__slots" });
  const calSlide = el("div", { className: "filter-cal__slide" }, [calWeek, calGrid, calSlots]);
  const calViewport = el("div", { className: "filter-cal__viewport" }, [calSlide]);
  const calCard = el("div", { className: "filter-card" }, [
    el("div", { className: "filter-card__title", text: copy.whenAsk || "Когда?" }),
    el("div", { className: "filter-cal__head" }, [
      calMonthLabel,
      el("div", { className: "filter-cal__nav" }, [
        el("button", { type: "button", "data-cal-nav": "-1", "aria-label": "Предыдущий месяц" }, [
          el("img", { src: "assets/icons/chevron-left.svg", alt: "" }),
        ]),
        el("button", { type: "button", "data-cal-nav": "1", "aria-label": "Следующий месяц" }, [
          el("img", { src: "assets/icons/chevron-right.svg", alt: "" }),
        ]),
      ]),
    ]),
    el("hr", { className: "filter-cal__rule" }),
    calViewport,
  ]);
  const calPanel = wrapPanel(calCard);

  const addressInput = el("input", {
    type: "search",
    placeholder: copy.addressPlaceholder || "",
    autocomplete: "off",
  });
  const mapCanvas = el("div", { className: "filter-map__canvas" });
  const mapEl = el("div", { className: "filter-map__leaflet", id: "filter-map" });
  const locateBtn = el(
    "button",
    { className: "filter-map__locate", type: "button", "aria-label": "Моё местоположение" },
    [el("img", { src: "assets/icons/map-direction.svg", alt: "" })]
  );
  mapCanvas.append(mapEl, locateBtn);

  const presetHome = el(
    "button",
    { className: "filter-map__preset", type: "button", "data-preset": "home" },
    [el("img", { src: "assets/icons/home.svg", alt: "" }), el("span", { text: copy.home || "" })]
  );
  const presetWork = el(
    "button",
    { className: "filter-map__preset", type: "button", "data-preset": "work" },
    [
      el("img", { src: "assets/icons/briefcase.svg", alt: "" }),
      el("span", { text: copy.work || "" }),
    ]
  );

  const addressCard = el("div", { className: "filter-card" }, [
    el("div", { className: "filter-card__title", text: copy.addressTitle || "" }),
    el("div", { className: "filter-field filter-field--sm" }, [
      el("img", { src: "assets/icons/search.svg", alt: "" }),
      addressInput,
    ]),
    mapCanvas,
    el("div", { className: "filter-map__addresses" }, [
      el("span", { text: copy.myAddresses || "" }),
      el("button", {
        className: "filter-map__manage",
        type: "button",
        text: copy.manage || "",
      }),
    ]),
    el("div", { className: "filter-map__presets" }, [presetHome, presetWork]),
  ]);
  const mapPanelEl = wrapPanel(addressCard);

  const searchBlock = el(
    "div",
    { className: "filter-block is-expanded", "data-filter": "search" },
    [procChip.root, searchPanel]
  );
  const calendarBlock = el(
    "div",
    { className: "filter-block", "data-filter": "calendar" },
    [whenChip.root, calPanel]
  );
  const mapBlock = el("div", { className: "filter-block", "data-filter": "map" }, [
    whereChip.root,
    mapPanelEl,
  ]);

  stack.append(searchBlock, calendarBlock, mapBlock);
  body.append(stack);

  const blocks = { search: searchBlock, calendar: calendarBlock, map: mapBlock };

  const clearAllBtn = el("button", {
    className: "filter-popup__clear-all",
    type: "button",
    text: copy.clearAll || "Очистить всё",
  });
  const submitBtn = el("button", { className: "filter-popup__submit", type: "button" }, [
    el("span", { text: copy.search || "Искать" }),
    el("img", { src: "assets/icons/search-submit.svg", alt: "" }),
  ]);
  const footer = el("div", { className: "filter-popup__footer" }, [clearAllBtn, submitBtn]);

  sheet.append(tabsRow, body, footer);
  root.append(backdrop, sheet);
  document.body.append(root);

  function procedureLabel() {
    if (state.procedure) return state.procedure.subtitle || state.procedure.title;
    return state.procedureQuery || "";
  }

  function whenFilledLabel() {
    if (!state.date && !(state.timeSlot && state.timeSlot.id !== "any")) return "";
    const parts = [];
    if (state.date) parts.push(formatDateLabel(state.date));
    if (state.timeSlot && state.timeSlot.id !== "any") parts.push(state.timeSlot.label);
    return parts.join(" · ");
  }

  function whereFilledLabel() {
    if (state.place) return state.place.title || state.place.address;
    if (state.addressPreset === "home") return copy.home || "";
    if (state.addressPreset === "work") return copy.work || "";
    return "";
  }

  function syncChips() {
    const proc = procedureLabel();
    procChip.setFilled(proc);
    searchFieldClear.hidden = !proc;
    if (proc) searchFieldInput.value = proc;

    whenChip.setFilled(whenFilledLabel());
    whereChip.setFilled(whereFilledLabel());

    if (homeInput) homeInput.value = proc;
  }

  function clearProcedure() {
    state.procedure = null;
    state.procedureQuery = "";
    searchFieldInput.value = "";
    renderProcedures();
    syncChips();
  }

  function clearWhen() {
    state.date = null;
    state.timeSlot = timeSlots[0] || null;
    renderCalendar();
    syncChips();
  }

  function clearWhere() {
    state.place = null;
    state.addressPreset = null;
    state.addressQuery = "";
    addressInput.value = "";
    presetHome.classList.remove("is-active");
    presetWork.classList.remove("is-active");
    syncPins();
    syncChips();
  }

  function handleClear(key) {
    if (key === "procedure") clearProcedure();
    if (key === "when") clearWhen();
    if (key === "where") clearWhere();
  }

  function renderProcedures() {
    clear(procList);
    const q = state.procedureQuery.trim().toLowerCase();
    const list = (procedures || []).filter((p) => {
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
      );
    });

    list.forEach((item) => {
      const active = state.procedure?.id === item.id;
      procList.append(
        el(
          "button",
          {
            className: `filter-proc${active ? " is-active" : ""}`,
            type: "button",
            "data-proc-id": item.id,
          },
          [
            el("img", { className: "filter-proc__img", src: item.image, alt: "" }),
            el("div", { className: "filter-proc__text" }, [
              el("div", { className: "filter-proc__title", text: item.title }),
              el("div", { className: "filter-proc__sub", text: item.subtitle }),
            ]),
          ]
        )
      );
    });
  }

  function renderCalendar() {
    const months = copy.months || MONTH_NAMES_FALLBACK;
    const year = state.calendarCursor.getFullYear();
    const month = state.calendarCursor.getMonth();
    calMonthName.textContent = months[month];
    calMonthYear.textContent = String(year);
    clear(calGrid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (state.date) {
      const selectedDay = new Date(state.date);
      selectedDay.setHours(0, 0, 0, 0);
      if (selectedDay < today) {
        state.date = null;
        syncChips();
      }
    }

    const first = new Date(year, month, 1);
    let startPad = first.getDay() - 1;
    if (startPad < 0) startPad = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < startPad; i += 1) {
      calGrid.append(
        el("button", {
          className: "filter-cal__day is-muted is-past",
          type: "button",
          text: String(prevDays - startPad + i + 1),
          disabled: "true",
        })
      );
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      const cellDate = new Date(year, month, d);
      const selected =
        state.date &&
        state.date.getFullYear() === year &&
        state.date.getMonth() === month &&
        state.date.getDate() === d;
      const past = cellDate < today;
      const classes = ["filter-cal__day"];
      if (past) classes.push("is-past");
      else if (selected) classes.push("is-selected");
      const attrs = {
        className: classes.join(" "),
        type: "button",
        text: String(d),
      };
      if (past) {
        attrs.disabled = "true";
      } else {
        attrs["data-day"] = String(d);
      }
      calGrid.append(el("button", attrs));
    }

    const cells = startPad + daysInMonth;
    const rest = cells % 7 === 0 ? 0 : 7 - (cells % 7);
    for (let i = 1; i <= rest; i += 1) {
      calGrid.append(
        el("button", {
          className: "filter-cal__day is-muted",
          type: "button",
          text: String(i),
          disabled: "true",
        })
      );
    }

    clear(calSlots);
    (timeSlots || []).forEach((slot) => {
      const active = state.timeSlot?.id === slot.id;
      calSlots.append(
        el("button", {
          className: `filter-cal__slot${active ? " is-active" : ""}`,
          type: "button",
          text: slot.label,
          "data-slot": slot.id,
        })
      );
    });
  }

  function changeMonth(delta) {
    const leave = delta > 0 ? "is-leave-left" : "is-leave-right";
    const enter = delta > 0 ? "is-enter-right" : "is-enter-left";

    calSlide.classList.remove(
      "is-leave-left",
      "is-leave-right",
      "is-enter-left",
      "is-enter-right"
    );
    calSlide.classList.add(leave);

    window.setTimeout(() => {
      state.calendarCursor = new Date(
        state.calendarCursor.getFullYear(),
        state.calendarCursor.getMonth() + delta,
        1
      );
      renderCalendar();
      calSlide.classList.remove(leave);
      calSlide.classList.add(enter);
      void calSlide.offsetWidth;
      requestAnimationFrame(() => {
        calSlide.classList.remove(enter);
      });
    }, 180);
  }

  function fitMapToPins() {
    if (!map || !window.L || !mapPins?.length) return;
    const bounds = window.L.latLngBounds(mapPins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 18,
      animate: true,
    });
  }

  let map = null;
  let mapMarkers = [];
  let leafletReady = false;

  async function ensureMap() {
    if (leafletReady && map) {
      setTimeout(() => {
        map.invalidateSize();
        fitMapToPins();
      }, 50);
      return;
    }

    try {
      const L = await loadLeaflet();

      map = L.map(mapEl, {
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapMarkers = (mapPins || []).map((pin) => {
        const icon = L.divIcon({
          className: "",
          html: `<div class="filter-map-pin"><img src="assets/icons/map-pin.svg" alt="" /></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 16],
        });
        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
        marker.on("click", () => {
          state.place = pin;
          state.addressPreset = null;
          addressInput.value = pin.address || pin.title;
          syncPins();
          syncChips();
          presetHome.classList.remove("is-active");
          presetWork.classList.remove("is-active");
          map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 17), { animate: true });
        });
        marker._pinId = pin.id;
        return marker;
      });

      leafletReady = true;
      setTimeout(() => {
        map.invalidateSize();
        fitMapToPins();
        syncPins();
      }, 100);
    } catch (err) {
      console.error("Map failed to load", err);
    }
  }

  function syncPins() {
    if (!map || !window.L) return;
    mapMarkers.forEach((marker) => {
      const selected = state.place?.id === marker._pinId;
      marker.setIcon(
        window.L.divIcon({
          className: "",
          html: `<div class="filter-map-pin${selected ? " is-selected" : ""}"><img src="assets/icons/map-pin.svg" alt="" /></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 16],
        })
      );
    });
  }

  function setPanel(name, { instant = false } = {}) {
    if (!blocks[name]) return;
    if (state.panel === name && !instant) return;

    const scrollY = stack.scrollTop;
    state.panel = name;
    if (name === "calendar") renderCalendar();
    if (name === "map") ensureMap();

    Object.entries(blocks).forEach(([key, block]) => {
      block.classList.toggle("is-expanded", key === name);
    });

    // Keep scroll locked while accordion animates — avoids jump-to-top
    const restoreScroll = () => {
      stack.scrollTop = scrollY;
    };
    restoreScroll();
    requestAnimationFrame(() => {
      restoreScroll();
      requestAnimationFrame(restoreScroll);
    });

    if (name === "map") {
      requestAnimationFrame(() => {
        if (map) {
          map.invalidateSize();
          fitMapToPins();
        }
      });
    }
    // No auto-focus on panel switch — focus scrolls the field into view and jumps the layout
  }

  function syncHomeTab(tabId) {
    if (!homeTabs) return;
    homeTabs.querySelectorAll(".search__tab").forEach((node) => {
      const active = node.getAttribute("data-tab") === tabId;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", String(active));
    });
  }

  function readHomeTab() {
    const active = homeTabs?.querySelector(".search__tab.is-active");
    return active?.getAttribute("data-tab") || tabs[0]?.id || "services";
  }

  function open() {
    if (state.open) return;
    state.open = true;
    state.tab = readHomeTab();
    state.panelLock = false;
    state.panel = "search";

    setPanel("search", { instant: true });
    renderTabs();
    renderProcedures();
    renderCalendar();
    syncChips();

    root.classList.remove("is-closing", "is-open");
    root.classList.add("is-mounted");
    root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Two frames so the closed state paints before open transition
    void root.offsetWidth;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add("is-open");
        try {
          searchFieldInput.focus({ preventScroll: true });
        } catch {
          searchFieldInput.focus();
        }
      });
    });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    root.classList.remove("is-open");
    root.classList.add("is-closing");
    root.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    syncChips();
    window.setTimeout(() => {
      root.classList.remove("is-closing", "is-mounted");
    }, 380);
  }

  function clearAll() {
    state.procedure = null;
    state.procedureQuery = "";
    state.date = null;
    state.timeSlot = timeSlots[0] || null;
    state.place = null;
    state.addressPreset = null;
    state.addressQuery = "";
    searchFieldInput.value = "";
    addressInput.value = "";
    presetHome.classList.remove("is-active");
    presetWork.classList.remove("is-active");
    renderProcedures();
    renderCalendar();
    syncPins();
    syncChips();
    setPanel("search");
  }

  function submit(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    state.procedureQuery = (searchFieldInput.value || "").trim();
    state.addressQuery = (addressInput.value || "").trim();

    saveFilters(state);

    if (typeof onSubmit === "function") {
      onSubmit(state, filtersToParams(state));
      close();
      return;
    }

    navigateWithFilters(state, "products.html");
  }

  function applyFiltersSnapshot(filters) {
    if (!filters) return;

    if (filters.tab) state.tab = filters.tab;

    if (filters.procedureId) {
      state.procedure = (procedures || []).find((p) => p.id === filters.procedureId) || null;
    }

    const query = filters.q || filters.procedureQuery || "";
    if (query) {
      state.procedureQuery = query;
      searchFieldInput.value = state.procedure?.subtitle || query;
    } else if (state.procedure) {
      searchFieldInput.value = state.procedure.subtitle || state.procedure.title || "";
      state.procedureQuery = searchFieldInput.value;
    }

    if (filters.date) {
      const parsed = new Date(filters.date);
      if (!Number.isNaN(parsed.getTime())) {
        state.date = parsed;
        state.calendarCursor = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }

    if (filters.time) {
      state.timeSlot = (timeSlots || []).find((s) => s.id === filters.time) || state.timeSlot;
    }

    if (filters.placeId) {
      state.place = (mapPins || []).find((p) => p.id === filters.placeId) || null;
      if (state.place) {
        addressInput.value = state.place.address || state.place.title || "";
        state.addressQuery = addressInput.value;
        state.addressPreset = null;
      }
    }

    const address = filters.address;
    if (address === "home" || address === "work") {
      state.addressPreset = address;
      state.place = null;
      addressInput.value = address === "home" ? copy.home || "" : copy.work || "";
      state.addressQuery = addressInput.value;
      presetHome.classList.toggle("is-active", address === "home");
      presetWork.classList.toggle("is-active", address === "work");
    } else if (address && !state.place) {
      state.addressPreset = null;
      state.addressQuery = address;
      addressInput.value = address;
      presetHome.classList.remove("is-active");
      presetWork.classList.remove("is-active");
    }

    renderTabs();
    renderProcedures();
    renderCalendar();
    syncPins();
    syncChips();
  }

  function getState() {
    return state;
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  clearAllBtn.addEventListener("click", clearAll);
  submitBtn.addEventListener("click", submit);

  tabsEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-popup__tab");
    if (!btn) return;
    state.tab = btn.getAttribute("data-tab");
    renderTabs();
    syncHomeTab(state.tab);
  });

  searchFieldClear.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearProcedure();
  });

  searchFieldInput.addEventListener("input", () => {
    state.procedureQuery = searchFieldInput.value;
    if (state.procedure && searchFieldInput.value !== procedureLabel()) {
      state.procedure = null;
      syncChips();
    }
    renderProcedures();
  });

  procList.addEventListener("click", (event) => {
    const btn = event.target.closest(".filter-proc");
    if (!btn) return;
    const id = btn.getAttribute("data-proc-id");
    state.procedure = (procedures || []).find((p) => p.id === id) || null;
    if (state.procedure) {
      searchFieldInput.value = state.procedure.subtitle;
      state.procedureQuery = state.procedure.subtitle;
    }
    renderProcedures();
    syncChips();
    setPanel("calendar");
  });

  root.addEventListener("click", (event) => {
    const clearBtn = event.target.closest("[data-clear]");
    if (clearBtn) {
      event.preventDefault();
      event.stopPropagation();
      handleClear(clearBtn.getAttribute("data-clear"));
      return;
    }

    const chip = event.target.closest("[data-action]");
    if (!chip) return;
    const action = chip.getAttribute("data-action");
    if (typeof chip.blur === "function") chip.blur();
    if (action === "goto-calendar") setPanel("calendar");
    if (action === "goto-map") setPanel("map");
    if (action === "goto-search") setPanel("search");
  });

  calCard.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-cal-nav]");
    if (nav) {
      const delta = Number(nav.getAttribute("data-cal-nav"));
      changeMonth(delta);
      return;
    }

    const dayBtn = event.target.closest("[data-day]");
    if (dayBtn) {
      if (dayBtn.disabled) return;
      const next = new Date(
        state.calendarCursor.getFullYear(),
        state.calendarCursor.getMonth(),
        Number(dayBtn.getAttribute("data-day"))
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (next < today) return;
      state.date = next;
      renderCalendar();
      syncChips();
      setPanel("map");
      return;
    }

    const slotBtn = event.target.closest("[data-slot]");
    if (slotBtn) {
      const id = slotBtn.getAttribute("data-slot");
      state.timeSlot = (timeSlots || []).find((s) => s.id === id) || null;
      renderCalendar();
      syncChips();
    }
  });

  addressInput.addEventListener("input", () => {
    state.addressQuery = addressInput.value;
    if (state.addressPreset) {
      state.addressPreset = null;
      presetHome.classList.remove("is-active");
      presetWork.classList.remove("is-active");
    }
    if (state.place) {
      state.place = null;
      syncPins();
    }
    syncChips();
  });

  locateBtn.addEventListener("click", () => {
    if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => {
        if (mapPins[0]) map.setView([mapPins[0].lat, mapPins[0].lng], 13);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });

  function setAddressPreset(key) {
    if (state.addressPreset === key) {
      state.addressPreset = null;
      state.addressQuery = "";
      addressInput.value = "";
      presetHome.classList.remove("is-active");
      presetWork.classList.remove("is-active");
    } else {
      state.addressPreset = key;
      state.place = null;
      const label = key === "home" ? copy.home || "" : copy.work || "";
      addressInput.value = label;
      state.addressQuery = label;
      presetHome.classList.toggle("is-active", key === "home");
      presetWork.classList.toggle("is-active", key === "work");
    }
    syncPins();
    syncChips();
  }

  presetHome.addEventListener("click", () => setAddressPreset("home"));
  presetWork.addEventListener("click", () => setAddressPreset("work"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) close();
  });

  renderTabs();
  renderProcedures();
  renderCalendar();
  syncChips();

  if (initialFilters) applyFiltersSnapshot(initialFilters);

  return { open, close, root, getState, applyFiltersSnapshot };
}
