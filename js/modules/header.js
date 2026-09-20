import { el, clear } from "../utils/dom.js";

export function bindHeader(root, data) {
  const title = root.querySelector('[data-text="header.title"]');
  const count = root.querySelector('[data-text="header.cartCount"]');
  const crumbs = root.querySelector('[data-bind="header.breadcrumbs"]');

  if (title) title.textContent = data.title;
  if (count) count.textContent = String(data.cartCount);

  if (!crumbs) return;
  clear(crumbs);

  data.breadcrumbs.forEach((item, index) => {
    if (index) crumbs.append(el("span", { className: "header__crumb-sep" }));
    crumbs.append(el("span", { text: item }));
  });
}
