import { welcomeGallery, welcomeInterests } from "./data/welcome.js";
import { createInterestBubbles } from "./modules/interest-bubbles.js";
import { createLocationPicker } from "./modules/location-picker.js";
import { el } from "./utils/dom.js";
import { completeOnboarding, getOnboarding, saveInterests, saveLocations } from "./utils/onboarding-storage.js";

const STEPS = ["intro", "interests", "locations"];
const STEP_HASH = { interests: "#interests", locations: "#locations" };
const HOME_URL = "index.html";
/** 55°45'24.9"N 37°36'54.6"E */
const DEFAULT_CENTER = [55.756917, 37.615167];

function createCard(src, hidden) {
  return el("div", { className: "welcome-gallery__card", "aria-hidden": hidden ? "true" : null }, [
    el("img", { src, alt: "", decoding: "async", draggable: "false" }),
  ]);
}

function renderGallery(root, columns) {
  if (!root) return;

  columns.forEach(({ direction, images }) => {
    // Two identical sets so the -50% translate loops seamlessly.
    const cards = [
      ...images.map((src) => createCard(src, false)),
      ...images.map((src) => createCard(src, true)),
    ];
    const track = el("div", { className: "welcome-gallery__track" }, cards);
    root.append(
      el("div", { className: `welcome-gallery__col welcome-gallery__col--${direction}` }, [track])
    );
  });
}

function setProgress(ring, count, total) {
  const bar = ring?.querySelector(".welcome-progress__bar");
  if (!bar) return;
  const value = total ? Math.min(count / total, 1) : 0;
  bar.style.strokeDashoffset = String(100 - value * 100);
  ring.setAttribute("aria-valuenow", String(Math.round(value * 100)));
}

function initWelcome() {
  const root = document.querySelector(".welcome");
  if (!root) return;

  const stored = getOnboarding();
  const steps = Object.fromEntries(STEPS.map((name) => [name, root.querySelector(`[data-step="${name}"]`)]));
  const ring = root.querySelector('[data-block="welcome-progress"]');
  let current = "intro";

  renderGallery(root.querySelector('[data-block="welcome-gallery"]'), welcomeGallery);

  const initialInterests = Array.isArray(stored.interests) ? stored.interests : [];
  const bubbles = createInterestBubbles(
    root.querySelector('[data-block="interest-bubbles"]'),
    welcomeInterests,
    {
      initial: initialInterests,
      onChange: (selected) => setProgress(ring, selected.length, welcomeInterests.length),
    }
  );
  setProgress(ring, bubbles.getSelected().length, welcomeInterests.length);

  const picker = createLocationPicker(
    root.querySelector('[data-block="location-picker"]'),
    root.querySelector('[data-block="location-types"]'),
    { center: DEFAULT_CENTER, initial: stored.locations }
  );

  function show(name) {
    const index = STEPS.indexOf(name);
    STEPS.forEach((key, i) => {
      const node = steps[key];
      if (!node) return;
      const active = i === index;
      node.classList.toggle("is-active", active);
      // Earlier steps park to the left, later ones to the right, so navigation slides the right way
      node.classList.toggle("is-before", i < index);
      node.toggleAttribute("inert", !active);
      node.setAttribute("aria-hidden", String(!active));
    });
    current = name;

    if (name === "interests") bubbles.start();
    else bubbles.stop();
    // Warm the map up one step early so tiles are ready when the locations screen slides in
    if (name === "interests" || name === "locations") picker.activate();
  }

  function go(name) {
    history.pushState({ welcomeStep: name }, "", STEP_HASH[name]);
    show(name);
  }

  function back() {
    if (history.state?.welcomeStep === current) {
      history.back();
      return;
    }
    const prev = STEPS[Math.max(0, STEPS.indexOf(current) - 1)];
    if (prev === "intro") history.replaceState(null, "", location.pathname + location.search);
    else history.replaceState({ welcomeStep: prev }, "", STEP_HASH[prev]);
    show(prev);
  }

  function finish() {
    completeOnboarding();
    root.classList.add("is-leaving");
    window.setTimeout(() => window.location.assign(HOME_URL), 320);
  }

  const actions = {
    setup: () => go("interests"),
    back,
    "skip-interests": () => {
      // Skipping discards unsaved picks: only Продолжить writes to storage
      const saved = getOnboarding().interests;
      bubbles.setSelected(Array.isArray(saved) ? saved : []);
      go("locations");
    },
    "save-interests": () => {
      saveInterests(bubbles.getSelected());
      go("locations");
    },
    "skip-locations": finish,
    "save-locations": () => {
      saveLocations(picker.getLocations());
      finish();
    },
  };

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    actions[button?.dataset.action]?.();
  });

  const stepFromHash = () => STEPS.find((name) => STEP_HASH[name] === location.hash) || "intro";

  window.addEventListener("popstate", () => show(stepFromHash()));
  // Coming back from home via the back/forward cache would otherwise restore the faded-out page
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) root.classList.remove("is-leaving");
  });

  // First paint without the slide so a reload on a later step doesn't animate.
  root.classList.add("is-instant");
  show(stepFromHash());
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("is-instant")));
}

initWelcome();
