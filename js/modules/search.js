import { el, clear } from "../utils/dom.js";

export function bindSearch(root, data) {
  const input = root.querySelector(".search__input");
  const tabs = root.querySelector('[data-bind="search.tabs"]');

  if (input) input.placeholder = data.placeholder;
  if (!tabs) return;

  clear(tabs);

  data.tabs.forEach((tab, index) => {
    const isActive = index === 0;
    tabs.append(
      el(
        "button",
        {
          className: `search__tab${isActive ? " is-active" : ""}`,
          type: "button",
          role: "tab",
          "aria-selected": String(isActive),
          "data-tab": tab.id,
        },
        [el("span", { className: "search__tab-label", text: tab.label })]
      )
    );
  });

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".search__tab");
    if (!btn) return;

    tabs.querySelectorAll(".search__tab").forEach((node) => {
      node.classList.remove("is-active");
      node.setAttribute("aria-selected", "false");
    });

    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
  });
}
