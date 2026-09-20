import { el, clear } from "../utils/dom.js";

const AUTOPLAY_MS = 5000;

function offerCard(item, labels) {
  const bg = el("div", {
    className: "offer-card__bg",
    role: "img",
    "aria-label": item.title.replace(/\n/g, " "),
  });
  bg.style.background = `linear-gradient(44deg, rgba(0, 0, 0, 0.3) 15.51%, rgba(102, 102, 102, 0) 43.55%), url("${item.image}") lightgray 50% / cover no-repeat`;

  return el("article", { className: "offer-card", "data-offer": item.id }, [
    bg,
    el("div", { className: "offer-card__content" }, [
      el("h3", { className: "offer-card__title", text: item.title }),
      el("p", { className: "offer-card__subtitle", text: item.subtitle }),
      el(
        "div",
        { className: "offer-card__badges" },
        item.badges.map((badge) =>
          el("span", { className: "offer-card__badge" }, [
            el("img", { src: badge.icon, alt: "" }),
            el("span", { text: badge.text }),
          ])
        )
      ),
      el("div", { className: "offer-card__actions" }, [
        el("button", {
          className: "btn btn--cream",
          type: "button",
          text: labels?.book || "Записаться",
        }),
        el("button", { className: "icon-btn offer-card__fav", type: "button", "aria-label": "В избранное" }, [
          el("img", { src: "assets/icons/heart-cream.svg", alt: "" }),
        ]),
      ]),
    ]),
  ]);
}

function initOffersSlider(slider, count) {
  const cards = [...slider.querySelectorAll(".offer-card")];
  const dots = [...slider.querySelectorAll(".offer-card__progress span")];
  if (cards.length < 2) return;

  let index = 0;
  let timer = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let locked = false;
  let moved = false;

  const setActive = (next) => {
    index = ((next % count) + count) % count;

    cards.forEach((card, i) => {
      card.classList.toggle("is-active", i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.remove("is-active", "is-done", "is-animating");
      if (i < index) dot.classList.add("is-done");
      if (i === index) {
        // restart fill animation
        void dot.offsetWidth;
        dot.classList.add("is-active", "is-animating");
      }
    });
  };

  const stopAuto = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const scheduleAuto = () => {
    stopAuto();
    timer = setTimeout(() => {
      setActive(index + 1);
      scheduleAuto();
    }, AUTOPLAY_MS);
  };

  const goTo = (next) => {
    setActive(next);
    scheduleAuto();
  };

  const onDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    locked = false;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    stopAuto();
    slider.setPointerCapture?.(event.pointerId);
  };

  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!locked && Math.abs(dx) + Math.abs(dy) > 8) {
      locked = Math.abs(dx) > Math.abs(dy);
      if (!locked) {
        dragging = false;
        scheduleAuto();
        return;
      }
    }

    if (locked && Math.abs(dx) > 6) {
      moved = true;
      if (event.cancelable) event.preventDefault();
    }
  };

  const onUp = (event) => {
    if (!dragging && !moved) return;
    dragging = false;
    slider.releasePointerCapture?.(event.pointerId);

    const dx = event.clientX - startX;
    if (moved && Math.abs(dx) > 40) {
      goTo(dx < 0 ? index + 1 : index - 1);
    } else {
      scheduleAuto();
    }
  };

  slider.addEventListener("pointerdown", onDown);
  slider.addEventListener("pointermove", onMove, { passive: false });
  slider.addEventListener("pointerup", onUp);
  slider.addEventListener("pointercancel", onUp);

  slider.addEventListener(
    "click",
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    },
    true
  );

  // Tap left/right thirds like stories (optional nicety)
  slider.addEventListener("click", (event) => {
    if (moved) return;
    if (event.target.closest("button")) return;
    const rect = slider.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < rect.width * 0.28) goTo(index - 1);
    else if (x > rect.width * 0.72) goTo(index + 1);
  });

  setActive(0);
  scheduleAuto();
}

export function bindOffers(root, items, labels) {
  const title = root.querySelector('[data-text="offers.title"]');
  const host = root.querySelector('[data-bind="offers"]');

  if (title && labels?.title) title.textContent = labels.title;
  if (!host || !items?.length) return;

  clear(host);

  const slides = el(
    "div",
    { className: "offers__slides" },
    items.map((item, i) => {
      const card = offerCard(item, labels);
      if (i === 0) card.classList.add("is-active");
      return card;
    })
  );

  const progress = el(
    "div",
    { className: "offer-card__progress", "aria-hidden": "true" },
    items.map(() => el("span", {}, [el("i")]))
  );

  const slider = el("div", { className: "offers__slider" }, [slides, progress]);
  host.append(slider);

  initOffersSlider(slider, items.length);
}
