import { el } from "../utils/dom.js";

const DESIGN_W = 350;
const DESIGN_H = 381;
/** Extra vertical room so selected bubbles have space to push into */
const DESIGN_H_ROOM = 400;
/** Selected bubbles grow from their own size, so they keep their relative differences */
const SELECTED_GROW = 1.28;
const GAP = 2;
/** Max share of the field the bubbles may cover before all of them shrink; above ~0.62 circles can't pack without overlapping */
const MAX_FILL = 0.63;
const SELECTED_WEIGHT = 4;
/** Float radius around the home position, in design px */
const FLOAT_AMP = 8;
/** Longest label line may take up this share of the bubble diameter */
const LABEL_FIT = 0.82;
const COLLISION_PASSES = 12;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Floating, selectable interest bubbles that push each other apart.
 * @returns {{ start(): void, stop(): void, getSelected(): string[], setSelected(ids: string[]): void }}
 */
export function createInterestBubbles(root, items, { onChange, initial = [] } = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const bubbles = items.map((item) => {
    const selected = initial.includes(item.id);
    const label = el("span", { className: "interest-bubble__label", text: item.label });
    const node = el(
      "button",
      {
        className: `interest-bubble${selected ? " is-selected" : ""}`,
        type: "button",
        "aria-pressed": String(selected),
        "data-id": item.id,
        style: `--tint: ${item.tint}`,
      },
      [
        el("img", { className: "interest-bubble__img", src: item.image, alt: "", draggable: "false" }),
        el("span", { className: "interest-bubble__tint", "aria-hidden": "true" }),
        el("span", { className: "interest-bubble__shade", "aria-hidden": "true" }),
        label,
      ]
    );
    root.append(node);

    return {
      item,
      node,
      label,
      labelW: 0,
      selected,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: 0,
      rTarget: 0,
      hx: 0,
      hy: 0,
      drawnD: 0,
      // Each bubble drifts on its own orbit; the second pair of waves keeps the path from looking like an ellipse
      w1: rand(0.75, 1.1),
      w2: rand(0.75, 1.1),
      w3: rand(1.35, 1.9),
      w4: rand(1.35, 1.9),
      p1: rand(0, Math.PI * 2),
      p2: rand(0, Math.PI * 2),
      p3: rand(0, Math.PI * 2),
      p4: rand(0, Math.PI * 2),
      px: 0,
      py: 0,
    };
  });

  let W = 0;
  let H = 0;
  let scale = 1;
  let ready = false;
  let running = false;
  let raf = 0;
  let lastT = 0;

  function computeTargets() {
    const radii = bubbles.map((b) => ((b.selected ? b.item.size * SELECTED_GROW : b.item.size) / 2) * scale);
    const area = radii.reduce((sum, r) => sum + Math.PI * r * r, 0);
    const limit = MAX_FILL * W * H;
    const fit = area > limit ? Math.sqrt(limit / area) : 1;
    bubbles.forEach((b, i) => {
      b.rTarget = radii[i] * fit;
    });
  }

  function layout() {
    W = root.clientWidth;
    H = root.clientHeight;
    if (!W || !H) return;

    scale = Math.min(W / DESIGN_W, H / DESIGN_H_ROOM);
    bubbles.forEach((b) => {
      b.hx = (b.item.x - DESIGN_W / 2) * scale + W / 2;
      b.hy = (b.item.y - DESIGN_H / 2) * scale + H / 2;
    });
    computeTargets();

    if (!ready) {
      bubbles.forEach((b) => {
        b.x = b.hx;
        b.y = b.hy;
        b.r = b.rTarget;
      });
      ready = true;
      settle(40);
      draw();
    }
  }

  function resolveCollisions() {
    for (let i = 0; i < bubbles.length; i += 1) {
      const a = bubbles[i];
      for (let j = i + 1; j < bubbles.length; j += 1) {
        const b = bubbles[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const min = a.r + b.r + GAP;
        if (dist >= min) continue;
        if (dist < 0.01) {
          dx = 0.01;
          dy = 0;
          dist = 0.01;
        }
        const overlap = min - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const ma = a.r * a.r * (a.selected ? SELECTED_WEIGHT : 1);
        const mb = b.r * b.r * (b.selected ? SELECTED_WEIGHT : 1);
        const shareA = mb / (ma + mb);
        const shareB = ma / (ma + mb);
        a.x -= nx * overlap * shareA;
        a.y -= ny * overlap * shareA;
        b.x += nx * overlap * shareB;
        b.y += ny * overlap * shareB;
      }
    }
    bubbles.forEach((b) => {
      b.x = clamp(b.x, b.r, W - b.r);
      b.y = clamp(b.y, b.r, H - b.r);
    });
  }

  function step(dt, t) {
    const frames = dt * 60;
    const grow = 1 - Math.pow(1 - 0.12, frames);
    const damping = Math.pow(0.84, frames);
    const amp = reduceMotion ? 0 : FLOAT_AMP * scale;

    bubbles.forEach((b) => {
      b.r += (b.rTarget - b.r) * grow;
      const fx = b.hx + (Math.sin(t * b.w1 + b.p1) * 0.75 + Math.sin(t * b.w3 + b.p3) * 0.25) * amp;
      const fy = b.hy + (Math.cos(t * b.w2 + b.p2) * 0.75 + Math.cos(t * b.w4 + b.p4) * 0.25) * amp;
      b.vx = (b.vx + (fx - b.x) * 0.02 * frames) * damping;
      b.vy = (b.vy + (fy - b.y) * 0.02 * frames) * damping;
      b.x += b.vx * frames;
      b.y += b.vy * frames;
      b.px = b.x;
      b.py = b.y;
    });

    for (let k = 0; k < COLLISION_PASSES; k += 1) resolveCollisions();

    // Drop the velocity the collisions cancelled, otherwise the home spring keeps driving bubbles into each other
    bubbles.forEach((b) => {
      b.vx += (b.x - b.px) / frames;
      b.vy += (b.y - b.py) / frames;
    });
  }

  function settle(iterations) {
    for (let i = 0; i < iterations; i += 1) step(1 / 60, 0);
  }

  function draw() {
    bubbles.forEach((b) => {
      const d = b.r * 2;
      if (Math.abs(d - b.drawnD) > 0.1) {
        b.node.style.width = `${d}px`;
        b.node.style.height = `${d}px`;
        if (b.labelW) {
          b.node.style.setProperty("--label-scale", Math.min(1, (d * LABEL_FIT) / b.labelW).toFixed(3));
        }
        b.drawnD = d;
      }
      b.node.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
    });
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - lastT) / 1000 || 1 / 60, 1 / 30);
    lastT = now;
    if (ready) {
      step(dt, now / 1000);
      draw();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function getSelected() {
    return bubbles.filter((b) => b.selected).map((b) => b.item.id);
  }

  function applySelected(bubble, selected) {
    bubble.selected = selected;
    bubble.node.classList.toggle("is-selected", selected);
    bubble.node.setAttribute("aria-pressed", String(selected));
  }

  function setSelected(ids) {
    bubbles.forEach((b) => applySelected(b, ids.includes(b.item.id)));
    computeTargets();
    onChange?.(getSelected());
  }

  root.addEventListener("click", (event) => {
    const node = event.target.closest(".interest-bubble");
    const bubble = node && bubbles.find((b) => b.node === node);
    if (!bubble) return;
    applySelected(bubble, !bubble.selected);
    computeTargets();
    onChange?.(getSelected());
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (running) {
      lastT = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  function measureLabels() {
    bubbles.forEach((b) => {
      b.labelW = b.label.offsetWidth;
      b.drawnD = 0;
    });
    if (ready) draw();
  }

  new ResizeObserver(layout).observe(root);
  layout();
  measureLabels();
  document.fonts?.ready.then(measureLabels);

  return { start, stop, getSelected, setSelected };
}
