/** Serialize / restore filter popup state via URL + sessionStorage */

const STORAGE_KEY = "podrujki.filters";

export function filtersToParams(state = {}) {
  const params = new URLSearchParams();
  if (state.tab) params.set("tab", state.tab);

  if (state.procedure) {
    params.set("q", state.procedure.subtitle || state.procedure.title || "");
    params.set("procedureId", state.procedure.id);
  } else if (state.procedureQuery) {
    params.set("q", state.procedureQuery);
  }

  if (state.date instanceof Date && !Number.isNaN(state.date.getTime())) {
    const y = state.date.getFullYear();
    const m = String(state.date.getMonth() + 1).padStart(2, "0");
    const d = String(state.date.getDate()).padStart(2, "0");
    params.set("date", `${y}-${m}-${d}`);
  } else if (typeof state.date === "string" && state.date) {
    params.set("date", state.date);
  }

  if (state.timeSlot?.id) params.set("time", state.timeSlot.id);
  else if (typeof state.time === "string" && state.time) params.set("time", state.time);

  if (state.place) {
    params.set("placeId", state.place.id);
    if (state.place.lat != null) params.set("lat", String(state.place.lat));
    if (state.place.lng != null) params.set("lng", String(state.place.lng));
    const placeLabel = state.place.address || state.place.title;
    if (placeLabel) params.set("place", placeLabel);
  }

  if (state.addressPreset) params.set("address", state.addressPreset);
  else if (state.addressQuery) params.set("address", state.addressQuery);

  return params;
}

export function saveFilters(state) {
  try {
    const snapshot = {
      tab: state.tab || "services",
      procedureId: state.procedure?.id || null,
      procedureQuery: state.procedureQuery || "",
      date:
        state.date instanceof Date && !Number.isNaN(state.date.getTime())
          ? state.date.toISOString()
          : state.date || null,
      time: state.timeSlot?.id || state.time || null,
      placeId: state.place?.id || null,
      addressPreset: state.addressPreset || null,
      addressQuery: state.addressQuery || "",
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function loadSavedFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readFiltersFromLocation(search = window.location.search) {
  const params = new URLSearchParams(search);
  const saved = loadSavedFilters() || {};
  const hasUrl = [...params.keys()].length > 0;

  return {
    tab: params.get("tab") || saved.tab || "services",
    q: params.get("q") || saved.procedureQuery || "",
    procedureId: params.get("procedureId") || saved.procedureId || null,
    date: params.get("date") || saved.date || null,
    time: params.get("time") || saved.time || null,
    placeId: params.get("placeId") || saved.placeId || null,
    place: params.get("place") || null,
    lat: params.get("lat"),
    lng: params.get("lng"),
    address: params.get("address") || saved.addressPreset || saved.addressQuery || null,
    fromUrl: hasUrl,
  };
}

export function navigateWithFilters(state, path = "products.html") {
  const params = filtersToParams(state);
  saveFilters(state);
  const url = new URL(path, window.location.href);
  url.search = "";
  params.forEach((value, key) => url.searchParams.set(key, value));
  window.location.assign(url.href);
}
