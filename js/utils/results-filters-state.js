import {
  createDefaultResultsFilters,
  RESULTS_FILTERS_BASE_COUNT,
} from "../data/results-filters.js";

const STORAGE_KEY = "podrujki.resultsFilters";

export function cloneFilters(state) {
  const base = createDefaultResultsFilters();
  const src = state || {};
  return {
    sort: src.sort || base.sort,
    procedures: Array.isArray(src.procedures) ? [...src.procedures] : [],
    gender: src.gender || base.gender,
    master: src.master || base.master,
    devices: Array.isArray(src.devices) ? [...src.devices] : [],
    radius: src.radius || base.radius,
    priceMin: src.priceMin != null ? String(src.priceMin) : "",
    priceMax: src.priceMax != null ? String(src.priceMax) : "",
    sales: Array.isArray(src.sales) ? [...src.sales] : [],
  };
}

export function saveResultsFilters(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cloneFilters(state)));
  } catch {
    /* ignore */
  }
}

export function loadResultsFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultResultsFilters();
    return cloneFilters(JSON.parse(raw));
  } catch {
    return createDefaultResultsFilters();
  }
}

/** How many filter categories are actively applied (sort excluded). */
export function countActiveFilters(state) {
  const s = cloneFilters(state);
  let n = 0;
  if (s.procedures.length) n += 1;
  if (s.gender !== "all") n += 1;
  if (s.master !== "all") n += 1;
  if (s.devices.length) n += 1;
  if (s.radius && s.radius !== "city") n += 1;
  if (s.priceMin !== "" || s.priceMax !== "") n += 1;
  if (s.sales.length) n += 1;
  return n;
}

/** Rough result estimate so the CTA number reacts to draft changes. */
export function estimateResultsCount(state, base = RESULTS_FILTERS_BASE_COUNT) {
  const s = cloneFilters(state);
  let n = base;
  let weight = 1;

  if (s.procedures.length) {
    weight *= Math.max(0.04, 0.22 / Math.sqrt(s.procedures.length));
  }
  if (s.gender !== "all") weight *= 0.72;
  if (s.master === "master") weight *= 0.8;
  if (s.master === "top") weight *= 0.45;
  if (s.devices.length) {
    weight *= Math.max(0.12, 0.55 / Math.sqrt(s.devices.length));
  }
  if (s.radius === "1") weight *= 0.35;
  else if (s.radius === "3") weight *= 0.5;
  else if (s.radius === "5") weight *= 0.65;
  else if (s.radius === "10") weight *= 0.8;

  const min = Number(s.priceMin);
  const max = Number(s.priceMax);
  if (Number.isFinite(min) && s.priceMin !== "") weight *= 0.7;
  if (Number.isFinite(max) && s.priceMax !== "") weight *= 0.7;

  if (s.sales.length) {
    weight *= Math.max(0.2, 0.6 / Math.sqrt(s.sales.length));
  }

  n = Math.round(n * weight);
  return Math.max(1, Math.min(base, n));
}
