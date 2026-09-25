import { el, clear } from "../utils/dom.js";
import { loadLeaflet } from "../utils/leaflet.js";

/** Figma 28:2315 collapsed sheet */
const PEEK = 64;
/** Figma 28:2117 expanded sheet */
const MID = 307;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Results map view under filters + swipeable bottom sheet.
 */
export function createResultsMapView({
  stageRoot,
  pins = [],
  titleText = "",
  renderList,
} = {}) {
  const root = el("div", {
    className: "results-map",
    "aria-hidden": "true",
  });

  const canvas = el("div", { className: "results-map__canvas" });
  const mapEl = el("div", { className: "results-map__leaflet" });
  const locateBtn = el(
    "button",
    {
      className: "results-map__locate",
      type: "button",
      "aria-label": "Моё местоположение",
    },
    [el("img", { src: "assets/icons/map-direction.svg", alt: "" })]
  );
  canvas.append(mapEl);

  const titleEl = el("p", { className: "results-map__sheet-title", text: titleText });
  const listEl = el("div", { className: "results-map__sheet-list clinics__list" });
  const sheet = el("div", { className: "results-map__sheet" }, [
    el("div", { className: "results-map__sheet-head" }, [
      el("span", { className: "results-map__sheet-handle", "aria-hidden": "true" }),
      titleEl,
    ]),
    listEl,
  ]);

  root.append(canvas, locateBtn, sheet);
  stageRoot?.append(root);

  let map = null;
  let markers = [];
  let open = false;
  let sheetH = PEEK;
  let drag = null;
  /** Geographic focus kept centered in the visible area above the sheet */
  let mapCenter = null;
  let mapZoom = null;
  let resizeRaf = 0;
  let syncingView = false;

  function rememberMapView() {
    if (!map || syncingView) return;
    const zoom = map.getZoom();
    // Convert map center → focus point in the visible (non-sheet) area
    const point = map.project(map.getCenter(), zoom);
    point.y -= sheetH / 2;
    mapCenter = map.unproject(point, zoom);
    mapZoom = zoom;
  }

  /**
   * Map stays full-height under the sheet; shift view so focus stays
   * centered in the visible band above the sheet (sheet covers bottom).
   */
  function syncMapSize({ animate = false } = {}) {
    if (!map) return;
    map.invalidateSize({ animate: false });
    if (!mapCenter) return;

    const zoom = mapZoom ?? map.getZoom();
    const point = map.project(mapCenter, zoom);
    point.y += sheetH / 2;
    const target = map.unproject(point, zoom);

    syncingView = true;
    map.setView(target, zoom, { animate: Boolean(animate), duration: 0.32 });
    requestAnimationFrame(() => {
      syncingView = false;
    });
  }

  function startMapResizeLoop() {
    cancelAnimationFrame(resizeRaf);
    const end = performance.now() + 360;
    const tick = (now) => {
      syncMapSize({ animate: false });
      if (now < end && !root.classList.contains("is-dragging")) {
        resizeRaf = requestAnimationFrame(tick);
      }
    };
    resizeRaf = requestAnimationFrame(tick);
  }

  function maxSheet() {
    const h = root.clientHeight || window.innerHeight * 0.6;
    return Math.max(MID, Math.floor(h * 0.85));
  }

  function midSheet() {
    return Math.min(MID, maxSheet());
  }

  function applySheet(h, { animate = true } = {}) {
    if (map && !mapCenter) rememberMapView();
    sheetH = clamp(h, PEEK, maxSheet());
    root.style.setProperty("--sheet-h", `${sheetH}px`);
    sheet.classList.toggle("is-expanded", sheetH > PEEK + 16);
    root.classList.toggle("is-dragging", !animate);
    if (animate) startMapResizeLoop();
    else syncMapSize({ animate: false });
  }

  function onResize() {
    if (!open) return;
    rememberMapView();
    applySheet(sheetH, { animate: false });
  }

  function snapSheet(velocity = 0) {
    const mid = midSheet();
    const max = maxSheet();
    let target = PEEK;
    if (velocity < -0.55) target = sheetH < mid + 20 ? mid : max;
    else if (velocity > 0.55) target = sheetH > mid - 20 ? mid : PEEK;
    else if (sheetH > (mid + max) / 2) target = max;
    else if (sheetH > (PEEK + mid) / 2) target = mid;
    else target = PEEK;
    applySheet(target, { animate: true });
  }

  function bindSheetDrag() {
    const head = sheet.querySelector(".results-map__sheet-head");

    const onStart = (event) => {
      if (!open) return;
      rememberMapView();
      const t = event.touches?.[0] || event;
      drag = {
        y: t.clientY,
        startH: sheetH,
        lastY: t.clientY,
        lastT: performance.now(),
        v: 0,
      };
      root.classList.add("is-dragging");
    };

    const onMove = (event) => {
      if (!drag) return;
      const t = event.touches?.[0] || event;
      const dy = t.clientY - drag.y;
      const now = performance.now();
      const dt = Math.max(16, now - drag.lastT);
      drag.v = (t.clientY - drag.lastY) / dt;
      drag.lastY = t.clientY;
      drag.lastT = now;
      applySheet(drag.startH - dy, { animate: false });
      if (event.cancelable) event.preventDefault();
    };

    const onEnd = () => {
      if (!drag) return;
      const v = drag.v;
      drag = null;
      snapSheet(v);
    };

    head.addEventListener("touchstart", onStart, { passive: true });
    head.addEventListener("touchmove", onMove, { passive: false });
    head.addEventListener("touchend", onEnd);
    head.addEventListener("touchcancel", onEnd);

    head.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      onStart(event);
      head.setPointerCapture?.(event.pointerId);
    });
    head.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || !drag) return;
      onMove(event);
    });
    head.addEventListener("pointerup", (event) => {
      if (event.pointerType === "touch") return;
      onEnd();
    });
  }

  async function ensureMap() {
    if (map) {
      setTimeout(() => {
        syncMapSize({ animate: false });
        fitPins();
      }, 80);
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

      markers = (pins || []).map((pin) => {
        const icon = L.divIcon({
          className: "",
          html: `<div class="results-map-pin"><img src="assets/icons/map-pin.svg" alt="" /></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 16],
        });
        return L.marker([pin.lat, pin.lng], { icon }).addTo(map);
      });

      map.on("moveend", () => {
        if (!root.classList.contains("is-dragging")) rememberMapView();
      });

      locateBtn.addEventListener("click", () => {
        if (!pins.length) return;
        const p = pins[0];
        mapCenter = L.latLng(p.lat, p.lng);
        mapZoom = 16;
        syncMapSize({ animate: true });
      });

      setTimeout(() => {
        map.invalidateSize({ animate: false });
        fitPins();
      }, 140);
    } catch (err) {
      console.error("Results map failed", err);
    }
  }

  function fitPins() {
    if (!map || !window.L || !markers.length) return;
    const group = window.L.featureGroup(markers);
    const bounds = group.getBounds().pad(0.25);
    // Keep pins in the visible area above the sheet; map tiles still fill under it
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: 16,
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, sheetH + 24],
    });
    mapCenter = bounds.getCenter();
    mapZoom = map.getZoom();
  }

  function setTitle(text) {
    titleEl.textContent = text;
  }

  function fillList() {
    clear(listEl);
    renderList?.(listEl);
  }

  function show() {
    open = true;
    root.classList.add("is-open");
    root.setAttribute("aria-hidden", "false");
    fillList();
    applySheet(PEEK, { animate: false });
    requestAnimationFrame(() => {
      applySheet(PEEK, { animate: false });
      ensureMap();
      requestAnimationFrame(() => {
        map?.invalidateSize({ animate: false });
        fitPins();
      });
    });
  }

  function hide() {
    open = false;
    cancelAnimationFrame(resizeRaf);
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    applySheet(PEEK, { animate: false });
  }

  bindSheetDrag();
  applySheet(PEEK, { animate: false });
  window.addEventListener("resize", onResize);

  return {
    root,
    show,
    hide,
    setTitle,
    refreshList: fillList,
    isOpen: () => open,
  };
}

export function formatResultsMapTitle(count, kind = "clinics") {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "клиник";
  if (kind === "specialists") {
    word = "специалистов";
    if (mod10 === 1 && mod100 !== 11) word = "специалист";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "специалиста";
  } else {
    if (mod10 === 1 && mod100 !== 11) word = "клиника";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "клиники";
  }
  return `${n} ${word} по вашему запросу`;
}
