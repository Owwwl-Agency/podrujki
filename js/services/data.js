import { dict } from "../data/dictionary.js";
import { categories } from "../data/categories.js";
import { popularServices } from "../data/popular.js";
import { offers } from "../data/offers.js";
import { clinics } from "../data/clinics.js";
import { newsItems } from "../data/news.js";
import { specialists } from "../data/specialists.js";
import { products } from "../data/products.js";

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
    categories,
    popular: popularServices,
    offers,
    clinics,
    news: newsItems,
    specialists,
    products,
  };
}
