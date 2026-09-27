const img = (n) => `assets/images/welcome/grid/w${n}.webp`;
const bubble = (name) => `assets/images/welcome/bubbles/${name}.webp`;

/** Welcome gallery columns — outer columns scroll up, middle scrolls down. */
export const welcomeGallery = [
  { direction: "up", images: [img("10"), img("08"), img("09"), img("07")] },
  { direction: "down", images: [img("05"), img("04"), img("06"), img("07")] },
  { direction: "up", images: [img("03"), img("01"), img("02"), img("04")] },
];

/**
 * Interest bubbles. x/y are centers and size is the diameter, in the
 * 350×381 design field; tint is the dark glass opacity from the design.
 */
export const welcomeInterests = [
  { id: "laser", label: "Лазерная\nэпиляция", image: bubble("laser"), x: 65, y: 95, size: 126, tint: 0.2 },
  { id: "contour", label: "Коррекция\nфигуры", image: bubble("contour"), x: 187.5, y: 121.5, size: 125, tint: 0.3 },
  { id: "injection", label: "Инъекции\nи филлеры", image: bubble("injection"), x: 300, y: 50, size: 100, tint: 0.2 },
  { id: "hair", label: "Лечение\nволос", image: bubble("hair"), x: 294.5, y: 148.5, size: 97, tint: 0.2 },
  { id: "body", label: "Уход\nза телом", image: bubble("body"), x: 57.5, y: 215.5, size: 115, tint: 0.3 },
  { id: "device", label: "Аппаратная\nкосметология", image: bubble("device"), x: 169, y: 238, size: 112, tint: 0.3 },
  { id: "tattoo", label: "Удаление\nтатуировок", image: bubble("tattoo"), x: 281.5, y: 252.5, size: 115, tint: 0.2 },
  { id: "face", label: "Уход\nза лицом", image: bubble("face"), x: 95.5, y: 323.5, size: 115, tint: 0.2 },
  { id: "massage", label: "Массаж", image: bubble("massage"), x: 213, y: 331, size: 94, tint: 0.3 },
];
