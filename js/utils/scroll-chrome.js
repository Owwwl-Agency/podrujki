/** Shared scroll chrome: hide on scroll down, show on scroll up */
export function bindScrollChrome(elements = []) {
  const nodes = (Array.isArray(elements) ? elements : [elements]).filter(Boolean);
  if (!nodes.length) return () => {};

  let lastY = window.scrollY || 0;
  let hidden = false;
  let locked = false;
  const threshold = 10;
  const minY = 40;

  const setHidden = (next) => {
    if (hidden === next || locked) return;
    hidden = next;
    document.documentElement.classList.toggle("chrome-hidden", next);
    nodes.forEach((node) => node.classList.toggle("is-chrome-hidden", next));

    // Prevent rapid flip-flops while the settle animation runs
    locked = true;
    window.setTimeout(() => {
      locked = false;
    }, 320);
  };

  const onScroll = () => {
    const y = window.scrollY || 0;
    const dy = y - lastY;

    if (y <= minY) {
      setHidden(false);
    } else if (dy > threshold) {
      setHidden(true);
    } else if (dy < -threshold) {
      setHidden(false);
    }

    lastY = y;
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
    window.removeEventListener("scroll", onScroll);
    setHidden(false);
  };
}
