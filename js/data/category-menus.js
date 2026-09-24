/** Category drill-down menus — keyed by home category id */

const ALL = { id: "all", title: "Все категории", leaf: true };

function leaf(id, title) {
  return { id, title, leaf: true };
}

function branch(id, title, children) {
  return { id, title, children: [ALL, ...children] };
}

export const categoryMenus = {
  laser: {
    id: "laser",
    title: "Лазерная эпиляция",
    children: [
      ALL,
      branch("face-neck", "Лицо и шея", [
        leaf("upper-lip", "Верхняя губа"),
        leaf("chin", "Подбородок"),
        leaf("cheeks", "Щеки"),
        leaf("forehead", "Лоб"),
        leaf("sideburns", "Виски"),
        leaf("neck", "Шея"),
        leaf("face-full", "Лицо полностью"),
      ]),
      branch("intimate", "Интимные зоны", [
        leaf("classic-bikini", "Классическое бикини"),
        leaf("deep-bikini", "Глубокое бикини"),
        leaf("intergluteal", "Межъягодичная зона"),
      ]),
      branch("armpits", "Подмышки", [
        leaf("armpits-full", "Подмышки полностью"),
      ]),
      branch("arms", "Руки", [
        leaf("forearms", "Предплечья"),
        leaf("hands", "Кисти"),
        leaf("arms-full", "Руки полностью"),
      ]),
      branch("legs", "Ноги", [
        leaf("shins", "Голени"),
        leaf("thighs", "Бёдра"),
        leaf("legs-full", "Ноги полностью"),
      ]),
      branch("body", "Тело", [
        leaf("abdomen", "Живот"),
        leaf("back", "Спина"),
        leaf("chest", "Грудь"),
        leaf("buttocks", "Ягодицы"),
      ]),
      branch("complexes", "Комплексы", [
        leaf("complex-face", "Комплекс «Лицо»"),
        leaf("complex-body", "Комплекс «Тело»"),
        leaf("complex-full", "Комплекс «Всё тело»"),
      ]),
    ],
  },

  injections: {
    id: "injections",
    title: "Инъекции и филлеры",
    children: [
      ALL,
      branch("botox", "Ботулотоксин", [
        leaf("botox-forehead", "Лоб"),
        leaf("botox-eyes", "Область глаз"),
        leaf("botox-lips", "Губы"),
      ]),
      branch("fillers", "Филлеры", [
        leaf("filler-lips", "Увеличение губ"),
        leaf("filler-cheekbones", "Скулы"),
        leaf("filler-chin", "Подбородок"),
      ]),
      branch("biorevital", "Биоревитализация", [
        leaf("bio-face", "Лицо"),
        leaf("bio-neck", "Шея"),
        leaf("bio-decollete", "Декольте"),
      ]),
      branch("mesotherapy", "Мезотерапия", [
        leaf("meso-face", "Лицо"),
        leaf("meso-scalp", "Кожа головы"),
        leaf("meso-body", "Тело"),
      ]),
    ],
  },

  face: {
    id: "face",
    title: "Уход за лицом",
    children: [
      ALL,
      branch("cleansing", "Чистка", [
        leaf("mechanical", "Механическая"),
        leaf("ultrasonic", "Ультразвуковая"),
        leaf("combined", "Комбинированная"),
      ]),
      branch("peels", "Пилинги", [
        leaf("chemical", "Химический"),
        leaf("enzyme", "Ферментативный"),
        leaf("retinol", "Ретиноловый"),
      ]),
      branch("care", "Уходовые процедуры", [
        leaf("mask", "Маски"),
        leaf("massage-face", "Массаж лица"),
        leaf("alon", "Альгинатные маски"),
      ]),
      branch("antiage", "Anti-age", [
        leaf("rf-lifting", "RF-лифтинг"),
        leaf("smas", "SMAS-лифтинг"),
      ]),
    ],
  },

  body: {
    id: "body",
    title: "Уход за телом",
    children: [
      ALL,
      branch("massage", "Массаж", [
        leaf("classic-massage", "Классический"),
        leaf("anticellulite", "Антицеллюлитный"),
        leaf("lymph", "Лимфодренажный"),
      ]),
      branch("wraps", "Обертывания", [
        leaf("wrap-cold", "Холодное"),
        leaf("wrap-hot", "Горячее"),
        leaf("wrap-algae", "Водорослевое"),
      ]),
      branch("sculpt", "Коррекция фигуры", [
        leaf("cavitation", "Кавитация"),
        leaf("pressotherapy", "Прессотерапия"),
        leaf("emsculpt", "Миостимуляция"),
      ]),
    ],
  },

  tattoo: {
    id: "tattoo",
    title: "Сведение тату",
    children: [
      ALL,
      branch("laser-removal", "Лазерное сведение", [
        leaf("tattoo-small", "Маленький рисунок"),
        leaf("tattoo-medium", "Средний рисунок"),
        leaf("tattoo-large", "Большой рисунок"),
      ]),
      branch("permanent", "Перманентный макияж", [
        leaf("pm-brows", "Брови"),
        leaf("pm-lips", "Губы"),
        leaf("pm-eyes", "Веки"),
      ]),
    ],
  },

  hardware: {
    id: "hardware",
    title: "Аппаратная косметология",
    children: [
      ALL,
      branch("laser-hw", "Лазерные процедуры", [
        leaf("fractional", "Фракционный лазер"),
        leaf("pico", "Пикосекундный лазер"),
        leaf("vascular", "Сосудистый лазер"),
      ]),
      branch("rf-hw", "RF и ультразвук", [
        leaf("rf-face", "RF-лицо"),
        leaf("ultrasound", "УЗ-терапия"),
        leaf("hifu", "HIFU"),
      ]),
      branch("light", "Световые технологии", [
        leaf("ipl", "IPL"),
        leaf("led", "LED-терапия"),
      ]),
    ],
  },

  hair: {
    id: "hair",
    title: "Лечение волос",
    children: [
      ALL,
      branch("trichology", "Трихология", [
        leaf("consultation", "Консультация трихолога"),
        leaf("trichoscopy", "Трихоскопия"),
      ]),
      branch("scalp-care", "Уход за кожей головы", [
        leaf("peeling-scalp", "Пилинг кожи головы"),
        leaf("meso-hair", "Мезотерапия волос"),
        leaf("plasma", "Плазмотерапия"),
      ]),
      branch("restoration", "Восстановление", [
        leaf("keratin", "Кератиновый уход"),
        leaf("botox-hair", "Ботокс для волос"),
      ]),
    ],
  },

  selection: {
    id: "selection",
    title: "Подбор процедур",
    children: [
      ALL,
      branch("by-goal", "По цели", [
        leaf("goal-antiage", "Омоложение"),
        leaf("goal-acne", "Проблемная кожа"),
        leaf("goal-sculpt", "Коррекция фигуры"),
      ]),
      branch("by-zone", "По зоне", [
        leaf("zone-face", "Лицо"),
        leaf("zone-body", "Тело"),
        leaf("zone-hair", "Волосы"),
      ]),
    ],
  },
};

export function getCategoryMenu(categoryId) {
  return categoryMenus[categoryId] || null;
}
