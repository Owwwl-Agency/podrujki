const img = (n) => `assets/images/welcome/grid/w${n}.webp`;

/** Welcome gallery columns — outer columns scroll up, middle scrolls down. */
export const welcomeGallery = [
  { direction: "up", images: [img("10"), img("08"), img("09"), img("07")] },
  { direction: "down", images: [img("05"), img("04"), img("06"), img("07")] },
  { direction: "up", images: [img("03"), img("01"), img("02"), img("04")] },
];
