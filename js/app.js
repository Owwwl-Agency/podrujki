import { loadHomePage } from "./services/data.js";
import { bindHeader } from "./modules/header.js";
import { bindSearch } from "./modules/search.js";
import { bindCategories } from "./modules/categories.js";
import { bindPopular } from "./modules/popular.js";
import { bindOffers } from "./modules/offers.js";
import { bindClinics } from "./modules/clinics.js";
import { bindNews } from "./modules/news.js";
import { bindSpecialists } from "./modules/specialists.js";
import { bindProducts } from "./modules/products.js";
import { bindNavbar } from "./modules/navbar.js";

const app = document.querySelector("#app");

async function init() {
  if (!app) return;

  app.classList.add("is-loading");

  try {
    const data = await loadHomePage();
    const { dict } = data;

    bindHeader(app.querySelector('[data-block="header"]'), data.header);
    bindSearch(app.querySelector('[data-block="search"]'), data.search, {
      labels: data.filter,
      procedures: data.procedures,
      mapPins: data.mapPins,
      timeSlots: data.timeSlots,
    });
    bindCategories(app.querySelector('[data-block="categories"]'), data.categories, dict.categories, {
      cartCount: data.header.cartCount,
    });
    bindPopular(app.querySelector('[data-block="popular"]'), data.popular, dict.popular);
    bindOffers(app.querySelector('[data-block="offers"]'), data.offers, dict.offers);
    bindClinics(app.querySelector('[data-block="clinics"]'), data.clinics, dict.clinics);
    bindNews(app.querySelector('[data-block="news"]'), data.news, dict.news);
    bindSpecialists(
      app.querySelector('[data-block="specialists"]'),
      data.specialists,
      dict.specialists,
      dict.clinics.reviews
    );
    bindProducts(app.querySelector('[data-block="products"]'), data.products, dict.products);
    bindNavbar(app.querySelector('[data-block="navbar"]'));
  } catch (error) {
    console.error(error);
  } finally {
    app.classList.remove("is-loading");
  }
}

init();
