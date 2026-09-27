import { welcomeGallery } from "./data/welcome.js";
import { el } from "./utils/dom.js";

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

renderGallery(document.querySelector('[data-block="welcome-gallery"]'), welcomeGallery);
