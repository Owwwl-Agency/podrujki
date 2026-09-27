import { clear, el } from "../utils/dom.js";
import { loadLeaflet } from "../utils/leaflet.js";

const GEOCODER = "https://nominatim.openstreetmap.org";
const SEARCH_DELAY = 400;
const MIN_QUERY = 3;
const FOCUS_ZOOM = 16;

export const LOCATION_TYPES = {
  home: { label: "Дом", icon: "assets/icons/home.svg" },
  work: { label: "Работа", icon: "assets/icons/briefcase.svg" },
  other: { label: "Другое", icon: "assets/icons/map-marker.svg" },
};

function describe(result) {
  const a = result.address || {};
  const road = a.road || a.pedestrian || a.footway || a.path || a.square || a.residential || a.quarter;
  const city = a.city || a.town || a.village || a.municipality || a.state || "";
  let title = road ? [road, a.house_number].filter(Boolean).join(", ") : result.name;
  if (!title) {
    // No street (e.g. a courtyard building): take the leading named parts of the full address
    const parts = (result.display_name || "").split(",").map((part) => part.trim());
    title = parts.slice(0, /^\d/.test(parts[0]) ? 2 : 1).join(", ");
  }
  const subtitle = [a.suburb || a.city_district, city].filter((part) => part && part !== title).join(", ");
  return { title, subtitle, address: [title, city].filter(Boolean).join(", ") };
}

async function geocode(path, params, signal) {
  const url = new URL(path, GEOCODER);
  Object.entries({ format: "jsonv2", addressdetails: "1", "accept-language": "ru", ...params }).forEach(
    ([key, value]) => url.searchParams.set(key, value)
  );
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Geocoder ${res.status}`);
  return res.json();
}

/**
 * Map with address search: pick a point (search, tap or locate), then save it as Дом / Работа / Другое.
 * @returns {{ activate(): Promise<void>, getLocations(): Record<string, { lat: number, lng: number, address: string }> }}
 */
export function createLocationPicker(root, chipsRoot, { center, zoom = FOCUS_ZOOM, initial, onChange } = {}) {
  const mapEl = root.querySelector('[data-role="map"]');
  const input = root.querySelector('[data-role="search"]');
  const suggest = root.querySelector('[data-role="suggest"]');
  const locateBtn = root.querySelector('[data-role="locate"]');
  const chips = [...chipsRoot.querySelectorAll("[data-location-type]")];

  const saved = {};
  Object.keys(LOCATION_TYPES).forEach((type) => {
    const loc = initial?.[type];
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) saved[type] = { ...loc };
  });

  let L = null;
  let map = null;
  let draft = null;
  let draftMarker = null;
  const savedMarkers = {};
  let searchTimer = 0;
  let searchAbort = null;
  let reverseAbort = null;
  let results = [];

  function pinIcon(type) {
    if (type === "draft") {
      return L.divIcon({
        className: "",
        html: '<div class="welcome-pin welcome-pin--draft"><img src="assets/icons/map-pin.svg" alt="" /></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
    }
    return L.divIcon({
      className: "",
      html: `<div class="welcome-pin"><img src="${LOCATION_TYPES[type].icon}" alt="" /></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function syncChips() {
    chips.forEach((chip) => {
      const isSaved = Boolean(saved[chip.dataset.locationType]);
      chip.classList.toggle("is-saved", isSaved);
      chip.setAttribute("aria-pressed", String(isSaved));
    });
    chipsRoot.classList.toggle("is-ready", Boolean(draft));
  }

  function syncSavedMarkers() {
    if (!map) return;
    Object.keys(LOCATION_TYPES).forEach((type) => {
      const loc = saved[type];
      if (!loc) {
        savedMarkers[type]?.remove();
        delete savedMarkers[type];
        return;
      }
      if (savedMarkers[type]) savedMarkers[type].setLatLng([loc.lat, loc.lng]);
      else savedMarkers[type] = L.marker([loc.lat, loc.lng], { icon: pinIcon(type), keyboard: false }).addTo(map);
    });
  }

  function flyTo(lat, lng) {
    map?.flyTo([lat, lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.8 });
  }

  function clearDraft() {
    draft = null;
    reverseAbort?.abort();
    draftMarker?.remove();
    draftMarker = null;
    syncChips();
  }

  async function reverse(point) {
    reverseAbort?.abort();
    reverseAbort = new AbortController();
    try {
      const data = await geocode("/reverse", { lat: point.lat, lon: point.lng, zoom: "18" }, reverseAbort.signal);
      if (draft !== point || data.error) return;
      point.address = describe(data).address;
      input.value = point.address;
    } catch (err) {
      if (err.name !== "AbortError") console.warn("Reverse geocoding failed", err);
    }
  }

  function setDraft(lat, lng, address = "") {
    draft = { lat, lng, address };
    input.value = address;
    if (map) {
      if (draftMarker) draftMarker.setLatLng([lat, lng]);
      else draftMarker = L.marker([lat, lng], { icon: pinIcon("draft"), keyboard: false }).addTo(map);
    }
    if (!address) reverse(draft);
    syncChips();
  }

  function hideSuggest() {
    suggest.hidden = true;
    clear(suggest);
    results = [];
  }

  function renderSuggest() {
    clear(suggest);
    if (!results.length) {
      suggest.append(el("li", { className: "welcome-map__empty", text: "Ничего не найдено" }));
    }
    results.forEach((item, index) => {
      suggest.append(
        el("li", { role: "option" }, [
          el("button", { className: "welcome-map__option", type: "button", "data-index": String(index) }, [
            el("span", { className: "welcome-map__option-title", text: item.title }),
            item.subtitle ? el("span", { className: "welcome-map__option-sub", text: item.subtitle }) : null,
          ]),
        ])
      );
    });
    suggest.hidden = false;
  }

  async function search(query) {
    searchAbort?.abort();
    searchAbort = new AbortController();
    const params = { q: query, limit: "5" };
    if (map) {
      const b = map.getBounds().pad(4);
      params.viewbox = [b.getWest(), b.getNorth(), b.getEast(), b.getSouth()].join(",");
    }
    try {
      const data = await geocode("/search", params, searchAbort.signal);
      const seen = new Set();
      results = data
        .map((r) => ({ ...describe(r), lat: Number(r.lat), lng: Number(r.lon) }))
        .filter((item) => {
          const key = `${item.title}|${item.subtitle}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      if (document.activeElement === input) renderSuggest();
    } catch (err) {
      if (err.name !== "AbortError") console.warn("Address search failed", err);
    }
  }

  function pick(index) {
    const item = results[index];
    if (!item) return;
    hideSuggest();
    input.blur();
    setDraft(item.lat, item.lng, item.address);
    flyTo(item.lat, item.lng);
  }

  input.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    const query = input.value.trim();
    if (query.length < MIN_QUERY) {
      searchAbort?.abort();
      hideSuggest();
      return;
    }
    searchTimer = window.setTimeout(() => search(query), SEARCH_DELAY);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (results.length) pick(0);
    } else if (event.key === "Escape") {
      hideSuggest();
    }
  });

  input.addEventListener("blur", () => window.setTimeout(hideSuggest, 150));

  // pointerdown keeps the input focused long enough for the click to land
  suggest.addEventListener("pointerdown", (event) => event.preventDefault());
  suggest.addEventListener("click", (event) => {
    const option = event.target.closest(".welcome-map__option");
    if (option) pick(Number(option.dataset.index));
  });

  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft(pos.coords.latitude, pos.coords.longitude);
        flyTo(pos.coords.latitude, pos.coords.longitude);
      },
      () => map?.flyTo(center, zoom, { duration: 0.8 }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  chipsRoot.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-location-type]");
    if (!chip) return;
    const type = chip.dataset.locationType;

    if (saved[type]) {
      delete saved[type];
    } else if (draft) {
      saved[type] = { lat: draft.lat, lng: draft.lng, address: draft.address };
      clearDraft();
      input.value = "";
    } else {
      input.focus();
      return;
    }
    syncSavedMarkers();
    syncChips();
    onChange?.(getLocations());
  });

  async function activate() {
    if (map) {
      map.invalidateSize();
      return;
    }
    try {
      L = await loadLeaflet();
    } catch (err) {
      console.error("Map failed to load", err);
      return;
    }
    if (map) return;

    map = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    map.on("click", (event) => setDraft(event.latlng.lat, event.latlng.lng));
    syncSavedMarkers();
    if (draft) setDraft(draft.lat, draft.lng, draft.address);
  }

  function getLocations() {
    return Object.fromEntries(Object.entries(saved).map(([type, loc]) => [type, { ...loc }]));
  }

  syncChips();

  return { activate, getLocations };
}
