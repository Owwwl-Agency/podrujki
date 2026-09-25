/** Results-page filters & sort options (Figma Filters canvas) */

export const resultsFilterCopy = {
  sortReset: "Отсортировать",
  clearAll: "Сбросить фильтры",
  reset: "Сбросить",
  sortTitle: "Сортировка",
  filtersTitle: "Фильтры",
  showResults: "Показать результаты",
  searchPlaceholder: "Поиск",
  priceFrom: "От, ₽",
  priceTo: "До, ₽",
  priceMinPlaceholder: "Минимальная",
  priceMaxPlaceholder: "Максимальная",
};

export const sortOptions = [
  { id: "recommended", label: "Рекомендуемые" },
  { id: "popular", label: "По популярности" },
  { id: "price-asc", label: "Сначала дешевле" },
  { id: "price-desc", label: "Сначала Дороже" },
];

export const filterLinks = [
  { id: "procedures", label: "Процедуры" },
  { id: "gender", label: "Пол" },
  { id: "master", label: "Мастер" },
  { id: "devices", label: "Аппарат" },
  { id: "radius", label: "Радиус поиска" },
  { id: "price", label: "Диапазон цен" },
  { id: "sales", label: "Скидки" },
];

export const procedureOptions = [
  { id: "anti-cellulite", label: "Антицеллюлитный массаж" },
  { id: "biorevital", label: "Биоревитализация Коллост" },
  { id: "botox-relatox", label: "Ботулинотерапия с Релатокс" },
  { id: "hydrafacial", label: "Гидропилинг на аппарате HydraFacial" },
  { id: "classic-massage", label: "Классический массаж" },
  { id: "classic-face", label: "Классический массаж лица" },
  { id: "collagen-nitia", label: "Коллагенотерапия Нития" },
  { id: "holy-land", label: "Комбинированная чистка Holy Land" },
  { id: "stylage-m", label: "Контурная пластика Стилаж М (Stylage M)" },
  { id: "cryolipolysis", label: "Криолиполиз: абдоминальная зона" },
  { id: "lymph-massage", label: "Лимфодренажный массаж" },
  { id: "mesoline", label: "Мезотерапия лица Мезолайн Клир" },
  { id: "microvibro", label: "Микровибрационный массаж тела" },
  { id: "bikini-classic", label: "Бикини классическое" },
  { id: "bikini-deep", label: "Бикини глубокое" },
  { id: "bikini-complex", label: "Комплексы, включающие глубокое бикини" },
];

export const genderOptions = [
  { id: "all", label: "Все" },
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
];

export const masterOptions = [
  { id: "all", label: "Все" },
  { id: "master", label: "Мастер" },
  { id: "top", label: "Топ-мастер" },
];

export const deviceOptions = [
  { id: "magic-one", label: "Magic One" },
  { id: "candela", label: "Candela / Cynosure" },
  { id: "noblex", label: "Noblex" },
  { id: "lightsheer", label: "LightSheer Duet" },
  { id: "deka", label: "Deka" },
  { id: "cynosure-22", label: "Cynosure 22 мм" },
];

export const radiusOptions = [
  { id: "1", label: "До 1 км" },
  { id: "3", label: "До 3 км" },
  { id: "5", label: "До 5 км" },
  { id: "10", label: "До 10 км" },
  { id: "city", label: "Весь город" },
];

export const salesOptions = [
  { id: "none", label: "Без скидок" },
  { id: "15", label: "До 15%" },
  { id: "30", label: "До 30%" },
  { id: "30-50", label: "30-50%" },
  { id: "club", label: "По клубной цене" },
];

export const RESULTS_FILTERS_BASE_COUNT = 1217;

export function createDefaultResultsFilters() {
  return {
    sort: "recommended",
    procedures: [],
    gender: "all",
    master: "all",
    devices: [],
    radius: "city",
    priceMin: "",
    priceMax: "",
    sales: [],
  };
}
