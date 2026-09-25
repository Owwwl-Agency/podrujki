import { dict } from "../data/dictionary.js";
import { categories } from "../data/categories.js";
import { popularServices } from "../data/popular.js";
import { offers } from "../data/offers.js";
import { clinics } from "../data/clinics.js";
import { newsItems } from "../data/news.js";
import { specialists } from "../data/specialists.js";
import { products } from "../data/products.js";
import { procedures } from "../data/procedures.js";
import { searchClinics } from "../data/search-clinics.js";
import { searchSpecialists } from "../data/search-specialists.js";
import { mapPins } from "../data/map-pins.js";
import { timeSlots } from "../data/time-slots.js";
import { serviceResults } from "../data/service-results.js";
import { resultsTags } from "../data/results-tags.js";

/**
 * Single data entry for the page.
 * Swap mock → fetch when backend is ready.
 */
export async function loadHomePage() {
  // Example for backend later:
  // const res = await fetch("/api/home");
  // if (!res.ok) throw new Error("Failed to load home");
  // return res.json();

  return {
    dict,
    header: {
      title: dict.header.title,
      breadcrumbs: dict.header.breadcrumbs,
      cartCount: 37,
    },
    search: dict.search,
    filter: dict.filter,
    procedures,
    searchClinics,
    searchSpecialists,
    mapPins,
    timeSlots,
    categories,
    popular: popularServices,
    offers,
    clinics,
    news: newsItems,
    specialists,
    products,
  };
}

export async function loadProductsPage() {
  return {
    dict,
    header: {
      title: dict.header.title,
      breadcrumbs: dict.header.breadcrumbs,
      cartCount: 37,
    },
    search: {
      placeholder: dict.search.placeholder,
      tabs: dict.search.tabs,
    },
    filter: dict.filter,
    procedures,
    searchClinics,
    searchSpecialists,
    mapPins,
    timeSlots,
    services: serviceResults,
    tags: resultsTags,
  };
}
