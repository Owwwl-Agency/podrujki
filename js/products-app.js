import { loadProductsPage } from "./services/data.js";
import { bindHeader } from "./modules/header.js";
import { bindSearch } from "./modules/search.js";
import { el, clear } from "./utils/dom.js";
import {
  readFiltersFromLocation,
  filtersToParams,
  saveFilters,
} from "./utils/filters-query.js";

const app = document.querySelector("#app");

function formatPrice(value) {
  return `${Number(value).toLocaleString("ru-RU")}₽`;
}

function renderTags(root, tags, onOpenFilters) {
  if (!root) return;
  clear(root);

  (tags || []).forEach((tag) => {
    const children = [];
    if (tag.icon) {
      children.push(el("img", { src: tag.icon, alt: "" }));
    }
    children.push(document.createTextNode(tag.label));

    const btn = el(
      "button",
      {
        className: "results-tag",
        type: "button",
        "data-tag": tag.id,
      },
      children
    );

    btn.addEventListener("click", () => {
      onOpenFilters?.();
    });

    root.append(btn);
  });
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

function syncSearchValue(searchRoot, filters) {
  const input = searchRoot?.querySelector(".search__input");
  if (!input) return;
  if (filters.q) {
    input.value = filters.q;
    input.placeholder = filters.q;
  }
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

    const popup = bindSearch(searchRoot, data.search, {
      labels: data.filter,
      procedures: data.procedures,
      mapPins: data.mapPins,
      timeSlots: data.timeSlots,
      initialFilters: filters,
      onSubmit: (state) => {
        filters = writeFiltersToUrl(state);
        syncSearchValue(searchRoot, filters);
      },
    });

    syncSearchValue(searchRoot, filters);
    renderTags(tagsRoot, data.tags, () => popup?.open());

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
