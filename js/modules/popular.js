import { el, clear } from "../utils/dom.js";

function priceBlock(item) {
  const priceNodes = [];

  if (item.oldPrice) {
    priceNodes.push(el("span", { className: "price-line__old", text: item.oldPrice }));
    priceNodes.push(el("span", { className: "price-line__current", text: `/${item.price}` }));
  } else {
    priceNodes.push(el("span", { className: "price-line__current", text: item.price }));
  }

  return el("div", { className: "price-line" }, [
    el("div", { className: "price-line__prices" }, priceNodes),
    el("span", { className: "price-line__sep" }),
    el("span", { className: "price-line__duration", text: item.duration }),
  ]);
}

function initCarousel(viewport, track) {
  const cards = [...track.querySelectorAll(".service-card")];
  if (cards.length < 2) return;

  let index = 0;
  let timer = null;
  let startX = 0;
  let baseX = 0;
  let dragX = 0;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let raf = 0;

  const edge = 20;
  const step = () => cards[0].offsetWidth + 10;
  const maxOffset = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  // Start & middle: active card inset 20px from left. End: right spacer only.
  const offsetForIndex = (i) => {
    const max = maxOffset();
    if (i <= 0) return 0;
    if (i >= cards.length - 1) return max;
    return Math.min(Math.max(0, cards[i].offsetLeft - edge), max);
  };

  const maxIndex = () => cards.length - 1;
  const clampIndex = (i) => Math.max(0, Math.min(i, maxIndex()));

  const setX = (x, animate) => {
    track.classList.toggle("is-dragging", !animate);
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const goTo = (next, animate = true) => {
    index = clampIndex(next);
    setX(-offsetForIndex(index), animate);
  };

  const stopAuto = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(() => {
      if (dragging) return;
      goTo(index >= maxIndex() ? 0 : index + 1, true);
    }, 4000);
  };

  const onDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    lastX = startX;
    lastT = performance.now();
    velocity = 0;
    baseX = -offsetForIndex(index);
    dragX = 0;
    track.classList.add("is-dragging");
    stopAuto();
    track.setPointerCapture?.(event.pointerId);
  };

  const onMove = (event) => {
    if (!dragging) return;
    const now = performance.now();
    const clientX = event.clientX;
    const dt = now - lastT;

    if (dt > 0) {
      velocity = ((clientX - lastX) / dt) * 1000;
      lastX = clientX;
      lastT = now;
    }

    dragX = clientX - startX;
    if (Math.abs(dragX) > 6) moved = true;

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const max = maxOffset();
      let x = baseX + dragX;
      if (x > 0) x *= 0.35;
      else if (x < -max) x = -max + (x + max) * 0.35;
      setX(x, false);
    });

    if (moved && event.cancelable) event.preventDefault();
  };

  const onUp = (event) => {
    if (!dragging) return;
    dragging = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    track.classList.remove("is-dragging");
    track.releasePointerCapture?.(event.pointerId);

    const s = step();
    let next = index;

    if (Math.abs(velocity) > 400) {
      next = velocity < 0 ? index + 1 : index - 1;
    } else if (Math.abs(dragX) > Math.min(50, s * 0.18)) {
      next = dragX < 0 ? index + 1 : index - 1;
    }

    goTo(next, true);
    dragX = 0;
    velocity = 0;
    startAuto();
  };

  track.addEventListener("pointerdown", onDown);
  track.addEventListener("pointermove", onMove, { passive: false });
  track.addEventListener("pointerup", onUp);
  track.addEventListener("pointercancel", onUp);

  track.addEventListener(
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

  window.addEventListener("resize", () => goTo(index, false));

  goTo(0, false);
  startAuto();
}

export function bindPopular(root, items, labels) {
  const title = root.querySelector('[data-text="popular.title"]');
  const track = root.querySelector('[data-bind="popular"]');
  const viewport = root.querySelector(".popular__viewport");

  if (title && labels?.title) title.textContent = labels.title;
  if (!track || !viewport) return;

  clear(track);

  track.append(el("div", { className: "popular__spacer", "aria-hidden": "true" }));

  items.forEach((item) => {
    track.append(
      el("article", { className: "service-card" }, [
        el("div", { className: "service-card__media" }, [
          el("img", { src: item.image, alt: item.title }),
          el("span", { className: "service-card__tag", text: item.tag }),
          el("button", { className: "icon-btn service-card__share", type: "button", "aria-label": "Поделиться" }, [
            el("img", { src: "assets/icons/share.svg", alt: "" }),
          ]),
        ]),
        el("div", { className: "service-card__body" }, [
          el("div", { className: "service-card__top" }, [
            el("h3", { className: "service-card__title", text: item.title }),
            el("div", { className: "rating" }, [
              el("img", { src: "assets/icons/star.svg", alt: "" }),
              el("span", { text: item.rating }),
            ]),
          ]),
          el("div", { className: "service-card__actions" }, [
            priceBlock(item),
            el("div", { className: "service-card__cta" }, [
              el("button", { className: "icon-btn service-card__fav", type: "button", "aria-label": "В избранное" }, [
                el("img", { src: "assets/icons/heart-dark.svg", alt: "" }),
              ]),
              el("button", {
                className: "btn--dark-sm",
                type: "button",
                text: labels?.book || "Записаться",
              }),
            ]),
          ]),
        ]),
      ])
    );
  });

  track.append(el("div", { className: "popular__spacer", "aria-hidden": "true" }));

  initCarousel(viewport, track);
}
