import { el, clear } from "../utils/dom.js";
import { createFilterPopup } from "./filter-popup.js";
import { readFiltersFromLocation } from "../utils/filters-query.js";

export function bindSearch(root, data, filterData = {}) {
  if (!root) return null;

  const input = root.querySelector(".search__input");
  const tabs = root.querySelector('[data-bind="search.tabs"]');
  const field = root.querySelector(".search__field");

  if (input) input.placeholder = data.placeholder;

  if (tabs) {
    clear(tabs);

    (data.tabs || []).forEach((tab, index) => {
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

  let popup = null;
  try {
    popup = createFilterPopup({
      searchRoot: root,
      tabs: data.tabs || [],
      labels: filterData.labels || {},
      procedures: filterData.procedures || [],
      mapPins: filterData.mapPins || [],
      timeSlots: filterData.timeSlots || [],
      initialFilters: filterData.initialFilters || null,
      onSubmit: filterData.onSubmit || null,
    });
  } catch (error) {
    console.error("Filter popup failed to init", error);
  }

  const openPopup = (event) => {
    if (!popup) return;
    event.preventDefault();
    event.stopPropagation();
    if (input) input.blur();
    popup.open();
  };

  if (field && popup) {
    field.addEventListener("click", openPopup);
  }
  if (input && popup) {
    input.setAttribute("readonly", "true");
    input.setAttribute("inputmode", "none");
    input.addEventListener("mousedown", openPopup);
  }

  return popup;
}

export { readFiltersFromLocation };
