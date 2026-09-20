import { el, clear } from "../utils/dom.js";

const AUTOPLAY_MS = 5000;

function initNewsTabs(card, items) {
  const menuButtons = [...card.querySelectorAll(".news-card__item")];
  const panels = [...card.querySelectorAll(".news-card__panel")];
  const slides = [...card.querySelectorAll(".news-card__slide")];
  if (!menuButtons.length || !panels.length) return;

  let index = 0;
  let timer = null;

  const setActive = (next) => {
    const nextIndex = ((next % items.length) + items.length) % items.length;
    if (nextIndex === index) return;
    index = nextIndex;

    menuButtons.forEach((btn, i) => {
      btn.classList.toggle("is-active", i === index);
      btn.querySelector(".news-card__dot")?.classList.toggle("is-active", i === index);
    });

    panels.forEach((panel, i) => {
      panel.classList.toggle("is-active", i === index);
    });

    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
    });
  };

  const stopAuto = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(() => {
      setActive(index + 1);
    }, AUTOPLAY_MS);
  };

  menuButtons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      setActive(i);
      startAuto();
    });
  });

  startAuto();
}

export function bindNews(root, items, labels) {
  const title = root.querySelector('[data-text="news.title"]');
  const host = root.querySelector('[data-bind="news"]');

  if (title) title.textContent = labels.title;
  if (!host || !items?.length) return;

  clear(host);

  const menu = el(
    "div",
    { className: "news-card__menu" },
    items.map((item, i) =>
      el(
        "button",
        {
          className: `news-card__item${i === 0 ? " is-active" : ""}`,
          type: "button",
          "data-id": item.id,
        },
        [
          el("span", { className: "news-card__label", text: item.title }),
          el("span", { className: `news-card__dot${i === 0 ? " is-active" : ""}` }),
        ]
      )
    )
  );

  const slides = el(
    "div",
    { className: "news-card__slides" },
    items.map((item, i) => {
      const bg = el("div", {
        className: "news-card__bg",
        role: "img",
        "aria-label": item.title,
      });
      bg.style.background = `linear-gradient(56.5deg, rgba(0, 0, 0, 0.26) 15.5%, rgba(102, 102, 102, 0) 43.5%), linear-gradient(90deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url("${item.image}") lightgray 50% / cover no-repeat`;

      return el("div", { className: `news-card__slide${i === 0 ? " is-active" : ""}` }, [bg]);
    })
  );

  const panels = el(
    "div",
    { className: "news-card__panels" },
    items.map((item, i) =>
      el("div", { className: `news-card__panel${i === 0 ? " is-active" : ""}` }, [
        el("p", { className: "news-card__text", text: item.description }),
        el("a", {
          className: "btn btn--cream",
          href: item.href,
          text: labels.cta || "Перейти к новинкам",
        }),
      ])
    )
  );

  const card = el("article", { className: "news-card" }, [slides, menu, panels]);
  host.append(card);
  initNewsTabs(card, items);
}
