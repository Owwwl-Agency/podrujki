export function bindNavbar(root) {
  const items = [...root.querySelectorAll(".navbar__item")];
  const indicator = root.querySelector(".navbar__indicator");
  let currentX = 0;

  function itemX(target) {
    return target.offsetLeft;
  }

  function place(x, width = 50) {
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function moveIndicator(target, animate = true) {
    if (!indicator || !target) return;

    const nextX = itemX(target);
    const prevX = currentX;
    const dist = Math.abs(nextX - prevX);

    if (!animate || dist < 1) {
      indicator.classList.remove("is-moving");
      place(nextX);
      currentX = nextX;
      return;
    }

    indicator.classList.add("is-moving");

    const goingRight = nextX > prevX;
    const stretch = Math.min(Math.max(dist * 0.4, 12), 42);

    // Stretch toward the destination, then settle on the target.
    if (goingRight) {
      place(prevX, 50 + stretch);
    } else {
      place(prevX - stretch, 50 + stretch);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        place(nextX, 50);
        currentX = nextX;
      });
    });

    const onEnd = (event) => {
      if (event.propertyName !== "transform" && event.propertyName !== "width") return;
      indicator.classList.remove("is-moving");
      indicator.removeEventListener("transitionend", onEnd);
    };

    indicator.addEventListener("transitionend", onEnd);
  }

  const active = root.querySelector(".navbar__item.is-active") || items[0];
  moveIndicator(active, false);

  root.addEventListener("click", (event) => {
    const btn = event.target.closest(".navbar__item");
    if (!btn || btn.classList.contains("is-active")) return;

    items.forEach((node) => node.classList.remove("is-active"));
    btn.classList.add("is-active");
    moveIndicator(btn, true);
  });

  window.addEventListener("resize", () => {
    moveIndicator(root.querySelector(".navbar__item.is-active"), false);
  });
}
