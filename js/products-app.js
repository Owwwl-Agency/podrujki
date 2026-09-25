import { loadProductsPage } from "./services/data.js";
import { bindHeader } from "./modules/header.js";
import { bindSearch } from "./modules/search.js";
import { createResultsFilters } from "./modules/results-filters.js";
import { el, clear } from "./utils/dom.js";
import {
  readFiltersFromLocation,
  filtersToParams,
  saveFilters,
} from "./utils/filters-query.js";
import {
  loadResultsFilters,
  countActiveFilters,
} from "./utils/results-filters-state.js";
import { bindScrollChrome } from "./utils/scroll-chrome.js";

const app = document.querySelector("#app");

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

async function init() {
  if (!app) return;
  app.classList.add("is-loading");

  try {
    const data = await loadProductsPage();
    let filters = readFiltersFromLocation();
    let selectedId = null;
    let selectedItem = null;

    bindHeader(app.querySelector('[data-block="header"]'), data.header);

    const searchRoot = app.querySelector('[data-block="search"]');
    const tagsRoot = app.querySelector('[data-block="tags"]');
    const listRoot = app.querySelector('[data-block="services"]');
    const barRoot = app.querySelector('[data-block="bar"]');
    const mainRoot = app.querySelector(".results-main");

    const searchPlaceholder =
      data.search?.placeholder || "Поиск услуг, клиник, специалистов";

    const popup = bindSearch(searchRoot, data.search, {
      labels: data.filter,
      procedures: data.procedures,
      clinics: data.searchClinics,
      specialists: data.searchSpecialists,
      mapPins: data.mapPins,
      timeSlots: data.timeSlots,
      initialFilters: filters,
      onSubmit: (state) => {
        filters = writeFiltersToUrl(state);
        syncSearchValue(searchRoot, filters, searchPlaceholder);
      },
    });

    const resultsFilters = createResultsFilters({
      initial: loadResultsFilters(),
      onApply: () => {
        /* applied state persists in session; list filtering later */
      },
      onChange: (count) => {
        syncFiltersTagCount(tagsRoot, count);
      },
    });

    syncSearchValue(searchRoot, filters, searchPlaceholder);
    renderTags(tagsRoot, data.tags, {
      onOpenFilters: () => resultsFilters.open(),
      activeCount: countActiveFilters(resultsFilters.getApplied()),
    });

    bindScrollChrome([
      app.querySelector('[data-block="header"]'),
    ]);

    const mapBtn = searchRoot?.querySelector(".results-search__map");
    mapBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      popup?.open();
    });

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

    barRoot?.querySelector(".results-bar__cta")?.addEventListener("click", () => {
      if (!selectedItem) return;
      // Placeholder for next step in booking flow
      console.info("continue", selectedItem.id, filters);
    });

    // Ensure URL reflects current filters when landing with session-only state
    if (!filters.fromUrl && (filters.q || filters.date || filters.placeId || filters.address)) {
      const url = new URL(window.location.href);
      const params = new URLSearchParams();
      if (filters.tab) params.set("tab", filters.tab);
      if (filters.q) params.set("q", filters.q);
      if (filters.procedureId) params.set("procedureId", filters.procedureId);
      if (filters.date) {
        const d = new Date(filters.date);
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          params.set("date", `${y}-${m}-${day}`);
        }
      }
      if (filters.time) params.set("time", filters.time);
      if (filters.placeId) params.set("placeId", filters.placeId);
      if (filters.place) params.set("place", filters.place);
      if (filters.address) params.set("address", filters.address);
      url.search = params.toString();
      window.history.replaceState({}, "", url);
      filters = readFiltersFromLocation(url.search);
    }
  } catch (error) {
    console.error(error);
  } finally {
    app.classList.remove("is-loading");
  }
}

init();
