import { el, clear } from "../utils/dom.js";

function specialistCard(item, reviewsFn) {
  return el("article", { className: "specialist-card" }, [
    el("button", { className: "icon-btn specialist-card__fav", type: "button", "aria-label": "В избранное" }, [
      el("img", { src: "assets/icons/heart-cream.svg", alt: "" }),
    ]),
    el("div", { className: "specialist-card__top" }, [
      el("img", {
        className: "specialist-card__avatar",
        src: item.avatar,
        alt: item.name,
      }),
      el("div", { className: "specialist-card__info" }, [
        el("h3", { className: "specialist-card__name", text: item.name }),
        el("p", { className: "specialist-card__role", text: item.role }),
        el("p", {
          className: "specialist-card__services",
          html: `${item.servicesText} <strong>${item.servicesCount}</strong>`,
        }),
        el("div", { className: "rating" }, [
          el("img", { src: "assets/icons/star-clinic.svg", alt: "" }),
          el("span", { text: item.rating }),
          el("span", { text: reviewsFn(item.reviews) }),
        ]),
      ]),
    ]),
    el("div", { className: "specialist-card__bottom" }, [
      el("div", { className: "specialist-card__place" }, [
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
      ]),
      el("button", { className: "btn-arrow", type: "button", "aria-label": "Открыть" }, [
        el("img", { src: "assets/icons/arrow-double.svg", alt: "" }),
      ]),
    ]),
  ]);
}

export function bindSpecialists(root, items, labels, reviewsFn) {
  const title = root.querySelector('[data-text="specialists.title"]');
  const map = root.querySelector('[data-text="specialists.map"]');
  const more = root.querySelector('[data-text="specialists.searchLocation"]');
  const list = root.querySelector('[data-bind="specialists"]');

  if (title) title.textContent = labels.title;
  if (map) map.textContent = labels.map;
  if (more) more.textContent = labels.searchLocation;
  if (!list) return;

  clear(list);
  items.forEach((item) => list.append(specialistCard(item, reviewsFn)));
}
