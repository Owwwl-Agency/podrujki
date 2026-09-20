import { el, clear } from "../utils/dom.js";

function productPrice(item) {
  const nodes = [];

  if (item.oldPrice) {
    nodes.push(el("span", { className: "price-line__old", text: item.oldPrice }));
    nodes.push(el("span", { className: "price-line__current", text: `/${item.price}` }));
  } else {
    nodes.push(el("span", { className: "price-line__current", text: item.price }));
  }

  return el("div", { className: "product-card__price" }, nodes);
}

export function bindProducts(root, items, labels) {
  const title = root.querySelector('[data-text="products.title"]');
  const more = root.querySelector('[data-text="products.cta"]');
  const grid = root.querySelector('[data-bind="products"]');

  if (title) title.textContent = labels.title;
  if (more) more.textContent = labels.cta;
  if (!grid) return;

  clear(grid);

  items.forEach((item) => {
    grid.append(
      el("article", { className: "product-card" }, [
        el("div", { className: "product-card__media" }, [
          el("img", { src: item.image, alt: item.title }),
          el("button", { className: "icon-btn product-card__fav", type: "button", "aria-label": "В избранное" }, [
            el("img", { src: "assets/icons/heart-cream.svg", alt: "" }),
          ]),
        ]),
        el("span", { className: "product-card__category", text: item.category }),
        el("h3", { className: "product-card__title", text: item.title }),
        el("p", { className: "product-card__subtitle", text: item.subtitle }),
        productPrice(item),
      ])
    );
  });
}
