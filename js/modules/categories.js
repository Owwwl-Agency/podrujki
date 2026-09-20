import { el, clear } from "../utils/dom.js";

export function bindCategories(root, items, labels) {
  const grid = root.querySelector('[data-bind="categories"]');
  const cta = root.querySelector('[data-text="categories.cta"] span');

  if (cta && labels?.cta) cta.textContent = labels.cta;
  if (!grid) return;

  clear(grid);

  items.forEach((item) => {
    grid.append(
      el("button", { className: "category-card", type: "button", "data-id": item.id }, [
        el("span", { className: "category-card__media" }, [
          el("img", {
            className: "category-card__image",
            src: item.image,
            alt: item.title.replace(/\n/g, " "),
          }),
        ]),
        el("span", { className: "category-card__title", text: item.title }),
      ])
    );
  });
}
