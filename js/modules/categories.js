import { el, clear } from "../utils/dom.js";
import { getCategoryMenu } from "../data/category-menus.js";
import { createCategoryMenu } from "./category-menu.js";

export function bindCategories(root, items, labels, options = {}) {
  const grid = root.querySelector('[data-bind="categories"]');
  const cta = root.querySelector('[data-text="categories.cta"] span');

  if (cta && labels?.cta) cta.textContent = labels.cta;
  if (!grid) return null;

  clear(grid);

  const menu = createCategoryMenu({
    cartCount: options.cartCount ?? 37,
    onSelect: options.onSelect,
  });

  items.forEach((item) => {
    const card = el(
      "button",
      { className: "category-card", type: "button", "data-id": item.id },
      [
        el("span", { className: "category-card__media" }, [
          el("img", {
            className: "category-card__image",
            src: item.image,
            alt: item.title.replace(/\n/g, " "),
          }),
        ]),
        el("span", { className: "category-card__title", text: item.title }),
      ]
    );

    card.addEventListener("click", () => {
      // «Все услуги» — no submenu for now
      if (item.id === "all") return;

      const tree = getCategoryMenu(item.id);
      if (!tree) return;
      menu.open(tree);
    });

    grid.append(card);
  });

  return menu;
}
