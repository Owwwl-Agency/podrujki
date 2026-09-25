import { el, clear } from "../utils/dom.js";
import {
  resultsFilterCopy,
  sortOptions,
  filterLinks,
  procedureOptions,
  genderOptions,
  masterOptions,
  deviceOptions,
  radiusOptions,
  salesOptions,
  createDefaultResultsFilters,
  RESULTS_FILTERS_BASE_COUNT,
} from "../data/results-filters.js";
import {
  cloneFilters,
  countActiveFilters,
  estimateResultsCount,
  saveResultsFilters,
} from "../utils/results-filters-state.js";

function makeRadio() {
  return el("span", { className: "rf-radio", "aria-hidden": "true" }, [
    el("span", { className: "rf-radio__ring" }),
    el("span", { className: "rf-radio__dot" }),
  ]);
}

function makeCheck() {
  return el("span", { className: "rf-check", "aria-hidden": "true" }, [
    el("img", { src: "assets/icons/check-dark.svg", alt: "" }),
  ]);
}

/**
 * Full-screen results filters (Figma Filters).
 * Opens like category menu (RTL); swipe / back dismisses draft without apply.
 */
export function createResultsFilters({
  baseCount = RESULTS_FILTERS_BASE_COUNT,
  initial = null,
  onApply = null,
  onChange = null,
} = {}) {
  const copy = resultsFilterCopy;
  let applied = cloneFilters(initial || createDefaultResultsFilters());
  let draft = cloneFilters(applied);

  const root = el("div", {
    className: "results-filters",
    "aria-hidden": "true",
  });
  const stackEl = el("div", { className: "results-filters__stack" });
  root.append(stackEl);
  document.body.append(root);

  /** @type {{ id: string, panel: HTMLElement }[]} */
  const stack = [];
  let swipe = null;
  let animating = false;
  /** Live refresh hooks for open panels */
  const panelHooks = new Map();

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    root.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("results-filters-open", open);
  }

  function syncSubmit() {
    const count = estimateResultsCount(draft, baseCount);
    const text = `${copy.showResults}: ${count.toLocaleString("ru-RU")}`;
    root.querySelectorAll(".results-filters__submit").forEach((btn) => {
      btn.textContent = text;
    });
  }

  function makeFooter() {
    const btn = el("button", {
      className: "results-filters__submit",
      type: "button",
    });
    btn.addEventListener("click", () => {
      btn.blur();
      applyAndClose();
    });
    const foot = el("div", { className: "results-filters__footer" }, [btn]);
    return foot;
  }

  function notify() {
    syncSubmit();
    panelHooks.forEach((fn) => fn?.());
  }

  function bindSwipe(panel) {
    panel.addEventListener(
      "touchstart",
      (event) => {
        if (animating || event.touches.length !== 1) return;
        const t = event.touches[0];
        swipe = { x: t.clientX, y: t.clientY, dx: 0, active: true, panel };
        panel.style.transition = "none";
      },
      { passive: true }
    );

    panel.addEventListener(
      "touchmove",
      (event) => {
        if (!swipe?.active) return;
        const t = event.touches[0];
        const dx = t.clientX - swipe.x;
        const dy = t.clientY - swipe.y;
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          swipe.active = false;
          panel.style.transform = "";
          panel.style.transition = "";
          return;
        }
        if (dx <= 0) {
          swipe.dx = 0;
          panel.style.transform = "translateX(0)";
          return;
        }
        swipe.dx = dx;
        panel.style.transform = `translateX(${dx}px)`;
      },
      { passive: true }
    );

    const endSwipe = () => {
      if (!swipe?.active && swipe?.dx == null) {
        swipe = null;
        return;
      }
      const dx = swipe?.dx || 0;
      const p = swipe?.panel || panel;
      swipe = null;
      p.style.transition = "";
      if (dx > Math.min(120, window.innerWidth * 0.28)) {
        back();
      } else {
        p.style.transform = "";
      }
    };

    panel.addEventListener("touchend", endSwipe);
    panel.addEventListener("touchcancel", endSwipe);
  }

  function pushPanel(id, panel) {
    if (animating) return;
    stack.push({ id, panel });
    stackEl.append(panel);
    panel.classList.add("is-entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.classList.remove("is-entering");
        panel.classList.add("is-active");
      });
    });
    if (stack.length === 1) setOpen(true);
  }

  function back() {
    if (animating || !stack.length) return;
    const current = stack.pop();
    const panel = current.panel;
    panelHooks.delete(current.id);
    animating = true;
    panel.classList.remove("is-active");
    panel.classList.add("is-leaving");
    panel.style.transform = "";

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      panel.removeEventListener("transitionend", done);
      panel.remove();
      animating = false;
      if (!stack.length) {
        // Closing without apply — restore draft from applied
        draft = cloneFilters(applied);
        setOpen(false);
      } else {
        notify();
      }
    };
    panel.addEventListener("transitionend", done);
    setTimeout(done, 560);
  }

  function closeAll({ apply = false } = {}) {
    while (stack.length) {
      const { id, panel } = stack.pop();
      panelHooks.delete(id);
      panel.remove();
    }
    animating = false;
    if (apply) {
      applied = cloneFilters(draft);
      saveResultsFilters(applied);
      onApply?.(cloneFilters(applied));
      onChange?.(countActiveFilters(applied), cloneFilters(applied));
    } else {
      draft = cloneFilters(applied);
    }
    setOpen(false);
  }

  function dismiss() {
    closeAll({ apply: false });
  }

  function applyAndClose() {
    closeAll({ apply: true });
  }

  /* ——— row builders ——— */

  function radioRow(option, selected, onPick) {
    const row = el(
      "button",
      {
        className: `rf-row rf-row--radio${selected ? " is-selected" : ""}`,
        type: "button",
        "data-id": option.id,
      },
      [
        el("span", { className: "rf-row__label", text: option.label }),
        makeRadio(),
      ]
    );
    row.addEventListener("click", () => {
      row.blur();
      onPick(option.id);
    });
    return row;
  }

  function checkRow(option, selected, onToggle) {
    const row = el(
      "button",
      {
        className: `rf-row rf-row--check${selected ? " is-selected" : ""}`,
        type: "button",
        "data-id": option.id,
      },
      [
        el("span", { className: "rf-row__label", text: option.label }),
        makeCheck(),
      ]
    );
    row.addEventListener("click", () => {
      row.blur();
      onToggle(option.id);
    });
    return row;
  }

  function linkRow(item, onOpen) {
    const row = el(
      "button",
      {
        className: "rf-row rf-row--link",
        type: "button",
        "data-id": item.id,
      },
      [
        el("span", { className: "rf-row__label", text: item.label }),
        el("img", {
          className: "rf-row__chevron",
          src: "assets/icons/chevron-right.svg",
          alt: "",
        }),
      ]
    );
    row.addEventListener("click", () => {
      row.blur();
      onOpen(item.id);
    });
    return row;
  }

  function pillBtn(text, onClick) {
    const btn = el("button", { className: "rf-pill", type: "button", text });
    btn.addEventListener("click", () => {
      btn.blur();
      onClick();
    });
    return btn;
  }

  function detailHeader(title, onReset) {
    const backBtn = el(
      "button",
      {
        className: "header__back rf-header__back",
        type: "button",
        "aria-label": "Назад",
      },
      [el("img", { src: "assets/icons/arrow-left.svg", alt: "" })]
    );
    backBtn.addEventListener("click", () => {
      backBtn.blur();
      back();
    });

    return el("div", { className: "rf-header rf-header--detail" }, [
      backBtn,
      el("p", { className: "rf-header__title", text: title }),
      pillBtn(copy.reset, onReset),
    ]);
  }

  /* ——— panels ——— */

  function buildRootPanel() {
    const panel = el("div", {
      className: "results-filters__panel",
      role: "dialog",
      "aria-label": "Фильтры",
    });

    const closeBtn = el(
      "button",
      {
        className: "rf-header__close",
        type: "button",
        "aria-label": "Закрыть",
      },
      [el("img", { src: "assets/icons/close.svg", alt: "" })]
    );
    closeBtn.addEventListener("click", () => {
      closeBtn.blur();
      dismiss();
    });

    const header = el("div", { className: "rf-header rf-header--root" }, [
      el("div", { className: "rf-header__actions" }, [
        pillBtn(copy.sortReset, () => {
          draft.sort = "recommended";
          notify();
        }),
        pillBtn(copy.clearAll, () => {
          const sort = draft.sort;
          draft = createDefaultResultsFilters();
          draft.sort = sort;
          notify();
        }),
      ]),
      closeBtn,
    ]);

    const sortList = el("div", { className: "rf-list" });
    const filtersList = el("div", { className: "rf-list" });

    const body = el("div", { className: "rf-body" }, [
      el("section", { className: "rf-section" }, [
        el("h2", { className: "rf-section__title", text: copy.sortTitle }),
        sortList,
      ]),
      el("section", { className: "rf-section" }, [
        el("h2", { className: "rf-section__title", text: copy.filtersTitle }),
        filtersList,
      ]),
    ]);

    function renderRoot() {
      if (!sortList.childElementCount) {
        sortOptions.forEach((opt) => {
          sortList.append(
            radioRow(opt, false, (id) => {
              draft.sort = id;
              notify();
            })
          );
        });
      }
      sortList.querySelectorAll(".rf-row--radio").forEach((row) => {
        row.classList.toggle("is-selected", row.getAttribute("data-id") === draft.sort);
      });

      if (!filtersList.childElementCount) {
        filterLinks.forEach((item) => {
          filtersList.append(linkRow(item, openDetail));
        });
      }
    }

    panelHooks.set("root", renderRoot);
    renderRoot();
    panel.append(header, body, makeFooter());
    bindSwipe(panel);
    return panel;
  }

  function buildRadioDetail(id, title, options, getValue, setValue, resetValue) {
    const panel = el("div", {
      className: "results-filters__panel",
      role: "dialog",
      "aria-label": title,
    });
    const list = el("div", { className: "rf-list" });
    const body = el("div", { className: "rf-body rf-body--detail" }, [list]);

    function render() {
      if (!list.childElementCount) {
        options.forEach((opt) => {
          list.append(
            radioRow(opt, false, (optId) => {
              setValue(optId);
              notify();
            })
          );
        });
      }
      list.querySelectorAll(".rf-row--radio").forEach((row) => {
        row.classList.toggle("is-selected", row.getAttribute("data-id") === getValue());
      });
    }

    panelHooks.set(id, render);
    render();
    panel.append(
      detailHeader(title, () => {
        setValue(resetValue);
        notify();
      }),
      body,
      makeFooter()
    );
    bindSwipe(panel);
    return panel;
  }

  function buildMultiDetail(id, title, options, { searchable = false } = {}) {
    const panel = el("div", {
      className: "results-filters__panel",
      role: "dialog",
      "aria-label": title,
    });

    const keyMap = {
      procedures: "procedures",
      devices: "devices",
      sales: "sales",
    };
    const selectedKey = keyMap[id];
    if (!selectedKey) {
      console.warn("Unknown multi filter id:", id);
    }
    if (!Array.isArray(draft[selectedKey])) {
      draft[selectedKey] = [];
    }

    const chipsEl = el("div", { className: "rf-chips" });
    chipsEl.hidden = true;

    const searchWrap = searchable
      ? el("div", { className: "rf-search" }, [
          el("div", { className: "rf-search__field" }, [
            el("img", { src: "assets/icons/search.svg", alt: "" }),
            el("input", {
              className: "rf-search__input",
              type: "search",
              placeholder: copy.searchPlaceholder,
            }),
          ]),
          chipsEl,
        ])
      : null;

    const list = el("div", { className: "rf-list" });
    const bodyChildren = searchable ? [list] : [chipsEl, list];
    const body = el(
      "div",
      {
        className: `rf-body rf-body--detail${searchable ? " rf-body--under-search" : ""}`,
      },
      bodyChildren
    );

    let query = "";

    function selected() {
      const cur = draft[selectedKey];
      return Array.isArray(cur) ? cur : [];
    }

    function setSelected(next) {
      draft[selectedKey] = Array.isArray(next) ? next : [];
    }

    function toggle(optId) {
      const cur = selected();
      if (cur.includes(optId)) {
        setSelected(cur.filter((x) => x !== optId));
      } else {
        setSelected([...cur, optId]);
      }
      notify();
    }

    function renderChips() {
      clear(chipsEl);
      const ids = selected();
      chipsEl.hidden = ids.length === 0;
      ids.forEach((optId) => {
        const opt = options.find((o) => o.id === optId);
        if (!opt?.label) return;
        const chip = el("button", { className: "rf-chip", type: "button" }, [
          el("span", { text: opt.label }),
          el("img", { src: "assets/icons/chip-close.svg", alt: "" }),
        ]);
        chip.addEventListener("click", () => {
          chip.blur();
          toggle(optId);
        });
        chipsEl.append(chip);
      });
    }

    function renderList() {
      const q = query.trim().toLowerCase();
      const filtered = q
        ? options.filter((o) => o.label.toLowerCase().includes(q))
        : options;
      const sel = selected();
      const ids = filtered.map((o) => o.id).join("|");
      const prev = list.getAttribute("data-ids");

      if (prev !== ids) {
        clear(list);
        list.setAttribute("data-ids", ids);
        filtered.forEach((opt) => {
          list.append(checkRow(opt, false, toggle));
        });
        requestAnimationFrame(() => {
          list.querySelectorAll(".rf-row--check").forEach((row) => {
            row.classList.toggle(
              "is-selected",
              sel.includes(row.getAttribute("data-id"))
            );
          });
        });
        return;
      }

      list.querySelectorAll(".rf-row--check").forEach((row) => {
        row.classList.toggle(
          "is-selected",
          sel.includes(row.getAttribute("data-id"))
        );
      });
    }

    function render() {
      renderChips();
      renderList();
    }

    if (searchWrap) {
      const input = searchWrap.querySelector(".rf-search__input");
      input.addEventListener("input", () => {
        query = input.value;
        renderList();
      });
    }

    panelHooks.set(id, render);
    render();
    const parts = [
      detailHeader(title, () => {
        setSelected([]);
        query = "";
        if (searchWrap) {
          const input = searchWrap.querySelector(".rf-search__input");
          if (input) input.value = "";
        }
        notify();
      }),
    ];
    if (searchWrap) parts.push(searchWrap);
    parts.push(body, makeFooter());
    panel.append(...parts);
    bindSwipe(panel);
    return panel;
  }

  function buildPriceDetail() {
    const id = "price";
    const title = "Диапазон цен";
    const panel = el("div", {
      className: "results-filters__panel",
      role: "dialog",
      "aria-label": title,
    });

    const minInput = el("input", {
      className: "rf-price__input",
      type: "number",
      inputmode: "numeric",
      placeholder: copy.priceMinPlaceholder,
      min: "0",
    });
    const maxInput = el("input", {
      className: "rf-price__input",
      type: "number",
      inputmode: "numeric",
      placeholder: copy.priceMaxPlaceholder,
      min: "0",
    });

    function syncInputs() {
      minInput.value = draft.priceMin;
      maxInput.value = draft.priceMax;
    }

    minInput.addEventListener("input", () => {
      draft.priceMin = minInput.value;
      notify();
    });
    maxInput.addEventListener("input", () => {
      draft.priceMax = maxInput.value;
      notify();
    });

    const body = el("div", { className: "rf-body rf-body--detail rf-body--price" }, [
      el("div", { className: "rf-price" }, [
        el("div", { className: "rf-price__field" }, [
          el("label", { className: "rf-price__label", text: copy.priceFrom }),
          minInput,
        ]),
        el("div", { className: "rf-price__field" }, [
          el("label", { className: "rf-price__label", text: copy.priceTo }),
          maxInput,
        ]),
      ]),
    ]);

    panelHooks.set(id, syncInputs);
    syncInputs();
    panel.append(
      detailHeader(title, () => {
        draft.priceMin = "";
        draft.priceMax = "";
        notify();
      }),
      body,
      makeFooter()
    );
    bindSwipe(panel);
    return panel;
  }

  function openDetail(filterId) {
    if (animating) return;
    let panel = null;
    if (filterId === "procedures") {
      panel = buildMultiDetail("procedures", "Процедуры", procedureOptions, {
        searchable: true,
      });
    } else if (filterId === "gender") {
      panel = buildRadioDetail(
        "gender",
        "Пол",
        genderOptions,
        () => draft.gender,
        (v) => {
          draft.gender = v;
        },
        "all"
      );
    } else if (filterId === "master") {
      panel = buildRadioDetail(
        "master",
        "Мастер",
        masterOptions,
        () => draft.master,
        (v) => {
          draft.master = v;
        },
        "all"
      );
    } else if (filterId === "devices") {
      panel = buildMultiDetail("devices", "Аппарат", deviceOptions);
    } else if (filterId === "radius") {
      panel = buildRadioDetail(
        "radius",
        "Радиус поиска",
        radiusOptions,
        () => draft.radius,
        (v) => {
          draft.radius = v;
        },
        "city"
      );
    } else if (filterId === "price") {
      panel = buildPriceDetail();
    } else if (filterId === "sales") {
      panel = buildMultiDetail("sales", "Скидки", salesOptions);
    }
    if (panel) {
      pushPanel(filterId, panel);
      syncSubmit();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!root.classList.contains("is-open")) return;
    if (stack.length > 1) back();
    else dismiss();
  });

  function open() {
    if (root.classList.contains("is-open") || animating) return;
    while (stack.length) {
      const { id, panel } = stack.pop();
      panelHooks.delete(id);
      panel.remove();
    }
    animating = false;
    draft = cloneFilters(applied);
    pushPanel("root", buildRootPanel());
    syncSubmit();
  }

  function getApplied() {
    return cloneFilters(applied);
  }

  function setApplied(state) {
    applied = cloneFilters(state);
    draft = cloneFilters(applied);
    saveResultsFilters(applied);
    onChange?.(countActiveFilters(applied), cloneFilters(applied));
  }

  return {
    open,
    close: dismiss,
    apply: applyAndClose,
    back,
    root,
    getApplied,
    setApplied,
    count: () => countActiveFilters(applied),
  };
}
