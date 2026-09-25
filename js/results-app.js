import { loadResultsPage } from "./services/data.js";
import { bindHeader } from "./modules/header.js";
import { bindSearch } from "./modules/search.js";
import { bindNavbar } from "./modules/navbar.js";
import { createResultsFilters } from "./modules/results-filters.js";
import { createClinicCard } from "./modules/clinics.js";
import { createSpecialistCard } from "./modules/specialists.js";
import {
  createResultsMapView,
  formatResultsMapTitle,
} from "./modules/results-map.js";
import { el, clear } from "./utils/dom.js";
import {
  readFiltersFromLocation,
  filtersToParams,
  saveFilters,
  navigateWithFilters,
  resultsPathForTab,
} from "./utils/filters-query.js";
import {
  loadResultsFilters,
  countActiveFilters,
} from "./utils/results-filters-state.js";
import { bindScrollChrome } from "./utils/scroll-chrome.js";

const MAP_ICON = "assets/icons/map-dark.svg";
const LIST_ICON = "assets/icons/list-light.svg";

const PAGE_FILE = {
  services: "products.html",
  clinics: "clinics.html",
  specialists: "specialists.html",
};

function formatPrice(value) {
  return `${Number(value).toLocaleString("ru-RU")}₽`;
}

function bindStickyFiltersTag(tagsRoot) {
  if (!tagsRoot) return;
  const filtersTag = tagsRoot.querySelector(".results-tag--filters");
  const track = tagsRoot.querySelector(".results-tags__track");
  if (!filtersTag || !track) return;

  const sync = () => {
    filtersTag.classList.toggle("is-compact", track.scrollLeft > 8);
  };

  track.addEventListener("scroll", sync, { passive: true });
  sync();
}

function syncFiltersTagCount(root, count) {
  const btn = root?.querySelector(".results-tag--filters");
  if (!btn) return;
  let badge = btn.querySelector(".results-tag__count");
  if (count > 0) {
    if (!badge) {
      badge = el("span", { className: "results-tag__count" });
      btn.append(badge);
    }
    badge.textContent = String(count);
  } else if (badge) {
    badge.remove();
  }
}

function renderTags(root, tags, { onOpenFilters, activeCount = 0 } = {}) {
  if (!root) return;
  clear(root);

  const filters = (tags || []).find((tag) => tag.id === "filters");
  const others = (tags || []).filter((tag) => tag.id !== "filters");

  if (filters) {
    const label = el("span", { className: "results-tag__label", text: filters.label });
    const children = [
      filters.icon ? el("img", { src: filters.icon, alt: "" }) : null,
      label,
    ];
    if (activeCount > 0) {
      children.push(
        el("span", { className: "results-tag__count", text: String(activeCount) })
      );
    }
    const btn = el(
      "button",
      {
        className: "results-tag results-tag--filters",
        type: "button",
        "data-tag": filters.id,
        "aria-label": filters.label,
      },
      children
    );
    btn.addEventListener("click", () => onOpenFilters?.());
    root.append(btn);
  }

  const track = el("div", { className: "results-tags__track" });
  others.forEach((tag) => {
    const btn = el(
      "button",
      {
        className: "results-tag",
        type: "button",
        "data-tag": tag.id,
      },
      [document.createTextNode(tag.label)]
    );
    btn.addEventListener("click", () => onOpenFilters?.());
    track.append(btn);
  });
  root.append(track);
  bindStickyFiltersTag(root);
}

function setSelectedCard(root, selectedId) {
  if (!root) return;
  root.querySelectorAll(".service-card").forEach((card) => {
    const selected = card.getAttribute("data-id") === selectedId;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
}

function renderServices(root, items, onSelect) {
  if (!root) return;
  clear(root);

  items.forEach((item) => {
    const radio = el("span", { className: "service-card__radio", "aria-hidden": "true" }, [
      el("img", {
        className: "service-card__radio-ring service-card__radio-ring--off",
        src: "assets/icons/radio.svg",
        alt: "",
      }),
      el("img", {
        className: "service-card__radio-ring service-card__radio-ring--on",
        src: "assets/icons/radio-on.svg",
        alt: "",
      }),
      el("img", {
        className: "service-card__radio-check",
        src: "assets/icons/radio-check.svg",
        alt: "",
      }),
    ]);

    const fav = el(
      "button",
      {
        className: "service-card__fav",
        type: "button",
        "aria-label": "В избранное",
      },
      [el("img", { src: "assets/icons/heart-outline.svg", alt: "" })]
    );
    fav.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const card = el(
      "button",
      {
        className: "service-card",
        type: "button",
        "data-id": item.id,
        "aria-pressed": "false",
      },
      [
        el("div", { className: "service-card__top" }, [
          el("div", { className: "service-card__media-wrap" }, [
            el("img", {
              className: "service-card__media",
              src: item.image,
              alt: item.title,
              loading: "lazy",
            }),
          ]),
          el("div", { className: "service-card__body" }, [
            fav,
            el("h3", { className: "service-card__title", text: item.title }),
            el("p", { className: "service-card__category", text: item.category }),
            el("p", { className: "service-card__desc", text: item.description }),
            el("p", { className: "service-card__clinics", text: item.clinicsLabel }),
          ]),
        ]),
        el("div", { className: "service-card__foot" }, [
          el("div", { className: "service-card__meta" }, [
            el("span", { className: "service-card__price", text: item.priceLabel }),
            el("span", { className: "service-card__meta-sep" }),
            el("span", { className: "service-card__duration", text: item.duration }),
          ]),
          radio,
        ]),
      ]
    );

    card.addEventListener("click", () => onSelect(item));
    root.append(card);
  });
}

function renderClinics(root, items, labels) {
  if (!root) return;
  clear(root);
  items.forEach((item) => {
    const card = createClinicCard(item, labels);
    card.setAttribute("data-id", item.id);
    card.classList.add("is-clickable");
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      // Placeholder: clinic single view
      console.info("open clinic", item.id);
    });
    root.append(card);
  });
}

function renderSpecialists(root, items, labels, reviewsFn) {
  if (!root) return;
  clear(root);
  items.forEach((item) => {
    const card = createSpecialistCard(item, reviewsFn);
    card.setAttribute("data-id", item.id);
    card.classList.add("is-clickable");
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      // Placeholder: specialist single view
      console.info("open specialist", item.id);
    });
    root.append(card);
  });
}

function syncBar(barRoot, mainRoot, item) {
  if (!barRoot) return;
  const priceEl = barRoot.querySelector('[data-text="bar.price"]');
  const countEl = barRoot.querySelector('[data-text="bar.count"]');

  if (!item) {
    barRoot.classList.remove("is-open");
    barRoot.setAttribute("aria-hidden", "true");
    mainRoot?.classList.remove("is-bar-open");
    return;
  }

  if (priceEl) priceEl.textContent = formatPrice(item.price);
  if (countEl) countEl.textContent = item.countLabel || "1 позиция";
  barRoot.classList.add("is-open");
  barRoot.setAttribute("aria-hidden", "false");
  mainRoot?.classList.add("is-bar-open");
}

function syncSearchValue(searchRoot, filters, placeholder = "Поиск услуг, клиник, специалистов") {
  const input = searchRoot?.querySelector(".search__input");
  if (!input) return;
  input.placeholder = placeholder;
  input.value = filters?.q || "";
}

function writeFiltersToUrl(state) {
  const params = filtersToParams(state);
  saveFilters(state);
  const url = new URL(window.location.href);
  url.search = "";
  params.forEach((value, key) => url.searchParams.set(key, value));
  window.history.replaceState({}, "", url);
  return readFiltersFromLocation(url.search);
}

/**
 * @param {"services"|"clinics"|"specialists"} mode
 */
export async function initResultsPage(mode = "services") {
  const app = document.querySelector("#app");
  if (!app) return;
  app.classList.add("is-loading");

  try {
    const data = await loadResultsPage(mode);
    let filters = readFiltersFromLocation();
    filters = { ...filters, tab: mode };

    let selectedId = null;
    let selectedItem = null;

    bindHeader(app.querySelector('[data-block="header"]'), data.header);

    const searchRoot = app.querySelector('[data-block="search"]');
    const tagsRoot = app.querySelector('[data-block="tags"]');
    const listRoot = app.querySelector('[data-block="results-list"]');
    const barRoot = app.querySelector('[data-block="bar"]');
    const mainRoot = app.querySelector(".results-main");

    const searchPlaceholder =
      data.search?.placeholder || "Поиск услуг, клиник, специалистов";

    bindSearch(searchRoot, data.search, {
      labels: data.filter,
      procedures: data.procedures,
      clinics: data.searchClinics,
      specialists: data.searchSpecialists,
      mapPins: data.mapPins,
      timeSlots: data.timeSlots,
      initialFilters: filters,
      onSubmit: (state) => {
        const target = resultsPathForTab(state.tab);
        if (target !== PAGE_FILE[mode]) {
          navigateWithFilters(state, target);
          return;
        }
        filters = writeFiltersToUrl(state);
        syncSearchValue(searchRoot, filters, searchPlaceholder);
      },
    });

    const resultsFilters = createResultsFilters({
      initial: loadResultsFilters(),
      onApply: () => {},
      onChange: (count) => {
        syncFiltersTagCount(tagsRoot, count);
      },
    });

    syncSearchValue(searchRoot, filters, searchPlaceholder);
    renderTags(tagsRoot, data.tags, {
      onOpenFilters: () => resultsFilters.open(),
      activeCount: countActiveFilters(resultsFilters.getApplied()),
    });

    bindScrollChrome([app.querySelector('[data-block="header"]')]);

    const navbarRoot = app.querySelector('[data-block="navbar"]');
    if (navbarRoot) bindNavbar(navbarRoot);

    const stageRoot = app.querySelector(".results-stage") || mainRoot;
    let mapMode = false;

    const reviewsFn =
      data.dict?.clinics?.reviews || ((n) => `(${n} отзывов)`);

    if (mode === "services") {
      const onSelect = (item) => {
        if (selectedId === item.id) {
          selectedId = null;
          selectedItem = null;
        } else {
          selectedId = item.id;
          selectedItem = item;
        }
        setSelectedCard(listRoot, selectedId);
        syncBar(barRoot, mainRoot, selectedItem);
      };

      renderServices(listRoot, data.services, onSelect);
      setSelectedCard(listRoot, selectedId);
      syncBar(barRoot, mainRoot, selectedItem);
    } else if (mode === "clinics") {
      renderClinics(listRoot, data.clinics, data.clinicLabels);
    } else if (mode === "specialists") {
      renderSpecialists(listRoot, data.specialists, data.specialistLabels, reviewsFn);
    }

    const mapClinics = data.clinics || [];
    const mapView = createResultsMapView({
      stageRoot,
      pins: data.mapPins || [],
      titleText: formatResultsMapTitle(mapClinics.length, "clinics"),
      renderList: (sheetList) => {
        renderClinics(sheetList, mapClinics, data.clinicLabels);
      },
    });

    const mapBtn = searchRoot?.querySelector(".results-search__map");
    const mapIcon = mapBtn?.querySelector(".results-search__map-icon, img");

    function setMapMode(next) {
      if (mapMode === next) return;
      mapMode = next;
      document.body.classList.toggle("is-map-mode", mapMode);
      document.documentElement.classList.remove("chrome-hidden");
      app.querySelector('[data-block="header"]')?.classList.remove("is-chrome-hidden");
      mapBtn?.classList.toggle("is-map-active", mapMode);
      mapBtn?.setAttribute("aria-label", mapMode ? "Списком" : "На карте");

      if (mapIcon) {
        mapBtn?.classList.add("is-swapping");
        window.setTimeout(() => {
          mapIcon.src = mapMode ? LIST_ICON : MAP_ICON;
          mapBtn?.classList.remove("is-swapping");
        }, 160);
      }

      if (mapMode) {
        window.scrollTo(0, 0);
        mapView.setTitle(formatResultsMapTitle(mapClinics.length, "clinics"));
        mapView.show();
        if (mode === "services") syncBar(barRoot, mainRoot, null);
      } else {
        mapView.hide();
        if (mode === "services") syncBar(barRoot, mainRoot, selectedItem);
      }
    }

    mapBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMapMode(!mapMode);
    });

    if (mode === "services") {
      barRoot?.querySelector(".results-bar__cta")?.addEventListener("click", () => {
        if (!selectedItem) return;
        setMapMode(true);
      });
    }

    if (!filters.fromUrl && (filters.q || filters.date || filters.placeId || filters.address)) {
      writeFiltersToUrl({
        tab: mode,
        procedureQuery: filters.q,
        procedure: filters.procedureId ? { id: filters.procedureId } : null,
        date: filters.date,
        time: filters.time,
        place: filters.placeId
          ? { id: filters.placeId, address: filters.place }
          : null,
        addressPreset: filters.address,
      });
      filters = readFiltersFromLocation();
    } else {
      // Keep tab in URL aligned with page
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== mode) {
        url.searchParams.set("tab", mode);
        window.history.replaceState({}, "", url);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    app.classList.remove("is-loading");
  }
}
