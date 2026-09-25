import { el, clear } from "../utils/dom.js";

const AUTOPLAY_MS = 4000;

function initClinicCarousel(media) {
  const viewport = media.querySelector(".clinic-card__viewport");
  const track = media.querySelector(".clinic-card__track");
  const slides = [...media.querySelectorAll(".clinic-card__slide")];
  const dots = [...media.querySelectorAll(".clinic-card__dots span")];
  if (!viewport || !track || slides.length < 2) return;

  let index = 0;
  let timer = null;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let dragX = 0;
  let dragging = false;
  let locked = false;
  let moved = false;

  const maxIndex = () => slides.length - 1;
  const step = () => viewport.clientWidth;

  const setX = (x, animate) => {
    track.classList.toggle("is-dragging", !animate);
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const goTo = (next, animate = true) => {
    const max = maxIndex();
    if (next > max) index = 0;
    else if (next < 0) index = max;
    else index = next;
    setX(-index * step(), animate);
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };

  const stopAuto = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(() => {
      if (dragging) return;
      goTo(index + 1, true);
    }, AUTOPLAY_MS);
  };

  const onDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    dragging = true;
    locked = false;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    baseX = -index * step();
    dragX = 0;
    track.classList.add("is-dragging");
    stopAuto();
    track.setPointerCapture?.(event.pointerId);
  };

  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!locked && Math.abs(dx) + Math.abs(dy) > 8) {
      locked = Math.abs(dx) > Math.abs(dy);
      if (!locked) {
        dragging = false;
        track.classList.remove("is-dragging");
        startAuto();
        return;
      }
    }

    if (!locked) return;
    dragX = dx;
    if (Math.abs(dragX) > 6) moved = true;

    let x = baseX + dragX;
    const max = maxIndex() * step();
    if (x > 0) x *= 0.35;
    else if (x < -max) x = -max + (x + max) * 0.35;
    setX(x, false);

    if (moved && event.cancelable) event.preventDefault();
  };

  const onUp = (event) => {
    if (!dragging && !moved) return;
    dragging = false;
    track.classList.remove("is-dragging");
    track.releasePointerCapture?.(event.pointerId);

    const threshold = Math.min(50, step() * 0.2);
    if (dragX < -threshold) goTo(index + 1, true);
    else if (dragX > threshold) goTo(index - 1, true);
    else goTo(index, true);

    dragX = 0;
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

function clinicCard(item, labels) {
  const images = item.images?.length ? item.images : [item.image];

  const media = el("div", { className: "clinic-card__media" }, [
    el(
      "div",
      { className: "clinic-card__viewport" },
      el(
        "div",
        { className: "clinic-card__track" },
        images.map((src) => {
          const slide = el("div", {
            className: "clinic-card__slide",
            role: "img",
            "aria-label": item.title,
          });
          slide.style.background = `linear-gradient(248deg, rgba(0, 0, 0, 0.21) 1.52%, rgba(102, 102, 102, 0.21) 41.07%), url("${src}") lightgray 50% / cover no-repeat`;
          return slide;
        })
      )
    ),
    el("div", { className: "clinic-card__actions" }, [
      el("button", { className: "icon-btn", type: "button", "aria-label": "Поделиться" }, [
        el("img", { src: "assets/icons/share-light.svg", alt: "" }),
      ]),
      el("button", { className: "icon-btn", type: "button", "aria-label": "В избранное" }, [
        el("img", { src: "assets/icons/heart-dark.svg", alt: "" }),
      ]),
    ]),
    el(
      "div",
      { className: "clinic-card__dots" },
      images.map((_, i) => el("span", { className: i === 0 ? "is-active" : "" }))
    ),
  ]);

  const card = el("article", { className: "clinic-card" }, [
    media,
    el("div", { className: "clinic-card__body" }, [
      el("h3", { className: "clinic-card__title", text: item.title }),
      el("div", { className: "clinic-card__meta" }, [
        el("div", { className: "location" }, [
          el("img", { src: "assets/icons/location.svg", alt: "" }),
          el("span", { text: item.address }),
        ]),
        el("div", { className: "metro" }, [
          el("img", { className: "metro__icon", src: "assets/icons/metro.svg", alt: "" }),
          el("div", { className: "metro__list" }, [
            el("span", { text: item.metro[0] }),
            el("span", { className: "metro__sep" }),
            el("span", { text: item.metro[1] }),
          ]),
        ]),
        el("div", { className: "rating" }, [
          el("img", { src: "assets/icons/star-clinic.svg", alt: "" }),
          el("span", { text: item.rating }),
          el("span", { text: labels.reviews(item.reviews) }),
        ]),
      ]),
      el("div", { className: "clinic-card__footer" }, [
        el("p", {
          className: "clinic-card__services",
          html: `${item.servicesText} <strong>${item.servicesCount}</strong>`,
        }),
        el("button", { className: "btn-arrow", type: "button", "aria-label": "Открыть" }, [
          el("img", { src: "assets/icons/arrow-double.svg", alt: "" }),
        ]),
      ]),
    ]),
  ]);

  initClinicCarousel(media);
  return card;
}

export function createClinicCard(item, labels) {
  return clinicCard(item, labels);
}

export function bindClinics(root, items, labels) {
  const title = root.querySelector('[data-text="clinics.title"]');
  const map = root.querySelector('[data-text="clinics.map"]');
  const more = root.querySelector('[data-text="clinics.searchLocation"]');
  const list = root.querySelector('[data-bind="clinics"]');

  if (title) title.textContent = labels.title;
  if (map) map.textContent = labels.map;
  if (more) more.textContent = labels.searchLocation;
  if (!list) return;

  clear(list);
  items.forEach((item) => list.append(clinicCard(item, labels)));
}
