import { el } from "../utils/dom.js";

/**
 * Full-screen category drill-down menu.
 * Slides in from the right; swipe/back closes left→right.
 * Navbar stays visible (higher z-index).
 */
export function createCategoryMenu({ cartCount = 37, onSelect } = {}) {
  const root = el("div", {
    className: "category-menu",
    "aria-hidden": "true",
  });

  const stackEl = el("div", { className: "category-menu__stack" });
  root.append(stackEl);
  document.body.append(root);

  /** @type {{ node: object, title: string, crumbs: string[] }[]} */
  const stack = [];
  let swipe = null;
  let animating = false;

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    root.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("category-menu-open", open);
  }

  function buildTitle(crumbs) {
    return el("p", {
      className: "category-menu__title",
      text: crumbs.join(" | "),
    });
  }

  function buildPanel(node, crumbs) {
    const panel = el("div", {
      className: "category-menu__panel",
      role: "dialog",
      "aria-label": node.title,
    });

    const backBtn = el(
      "button",
      {
        className: "header__back category-menu__back",
        type: "button",
        "aria-label": "Назад",
      },
      [el("img", { src: "assets/icons/arrow-left.svg", alt: "" })]
    );
    backBtn.addEventListener("click", () => {
      backBtn.blur();
      back();
    });

    const titlebar = el("div", { className: "header category-menu__titlebar" }, [
      backBtn,
      el("div", { className: "header__center" }, [buildTitle(crumbs)]),
      el("div", { className: "header__cart", "aria-hidden": "true" }, [
        el("span", { className: "header__cart-count", text: String(cartCount) }),
        el("img", { src: "assets/icons/bag.svg", alt: "" }),
      ]),
    ]);

    const list = el("div", { className: "category-menu__list" });
    (node.children || []).forEach((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      const isLeaf = item.leaf || !hasChildren;

      const row = el(
        "button",
        {
          className: "category-menu__item",
          type: "button",
          "data-id": item.id,
        },
        [
          el("span", { className: "category-menu__item-label", text: item.title }),
          el("img", {
            className: "category-menu__item-chevron",
            src: "assets/icons/chevron-right.svg",
            alt: "",
          }),
        ]
      );

      row.addEventListener("click", () => {
        row.blur();
        if (isLeaf) {
          onSelect?.({
            path: [...crumbs, item.title],
            categoryId: stack[0]?.node.id,
            item,
          });
          closeAll();
          return;
        }
        push(item, [...crumbs, item.title]);
      });

      list.append(row);
    });

    panel.append(
      titlebar,
      el("div", { className: "category-menu__body" }, [
        el("h2", { className: "category-menu__heading", text: node.title }),
        list,
      ])
    );

    bindSwipe(panel);
    return panel;
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

  function push(node, crumbs) {
    if (animating) return;
    const panel = buildPanel(node, crumbs);
    stack.push({ node, title: node.title, crumbs, panel });
    stackEl.append(panel);

    // Enter from right
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
      if (!stack.length) setOpen(false);
    };
    panel.addEventListener("transitionend", done);
    setTimeout(done, 560);
  }

  function closeAll() {
    while (stack.length) {
      const { panel } = stack.pop();
      panel.remove();
    }
    animating = false;
    setOpen(false);
  }

  function open(rootNode) {
    if (!rootNode) return;
    closeAll();
    push(rootNode, [rootNode.title]);
  }

  return { open, back, close: closeAll, root };
}
