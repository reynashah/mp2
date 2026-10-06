import axios from "axios";
import snapshot from "./data/meals.json";

export interface Meal {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strYoutube: string | null;
  strSource: string | null;
  [key: string]: string | null | undefined;
}
export interface Collection {
  meals: Meal[];
  offline: boolean;
}
const client = axios.create({
  baseURL: "https://www.themealdb.com/api/json/v1/1/",
  timeout: 12000,
});
const CACHE_KEY = "at-the-table-collection-v1";
let pending: Promise<Collection> | undefined;
export function loadCollection(force = false): Promise<Collection> {
  if (!force && pending) return pending;
  pending = (async () => {
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
        if (
          cached &&
          Date.now() - cached.time < 86400000 &&
          Array.isArray(cached.meals) &&
          cached.meals.length
        ) {
          return { meals: cached.meals as Meal[], offline: false };
        }
      } catch {
        /* Storage may be unavailable; live requests still work. */
      }
    }
    try {
      const responses = await Promise.all(
        ["a", "b", "c", "s"].map((f) =>
          client.get<{ meals: Meal[] | null }>("search.php", { params: { f } }),
        ),
      );
      const meals = [
        ...new Map(
          responses
            .flatMap((r) => r.data.meals ?? [])
            .map((m) => [m.idMeal, m]),
        ).values(),
      ];
      if (!meals.length) throw new Error("No recipes returned");
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ meals, time: Date.now() }),
        );
      } catch {
        /* Caching is optional. */
      }
      return { meals, offline: false };
    } catch {
      return { meals: snapshot as Meal[], offline: true };
    }
  })();
  return pending;
}
export async function loadMeal(id: string): Promise<Meal | null> {
  const { data } = await client.get<{ meals: Meal[] | null }>("lookup.php", {
    params: { i: id },
  });
  return data.meals?.[0] ?? null;
}
export function ingredients(meal: Meal) {
  return Array.from({ length: 20 }, (_, i) => ({
    name: meal[`strIngredient${i + 1}`]?.trim(),
    measure: meal[`strMeasure${i + 1}`]?.trim(),
  })).filter(
    (item): item is { name: string; measure: string | undefined } =>
      !!item.name,
  );
}
export function selectMeals(meals: Meal[], params: URLSearchParams) {
  const q = (params.get("q") ?? "").trim().toLocaleLowerCase();
  const categories = params.getAll("category");
  const sort = params.get("sort") ?? "name";
  const direction = params.get("direction") === "desc" ? -1 : 1;
  return meals
    .filter(
      (m) =>
        m.strMeal.toLocaleLowerCase().includes(q) &&
        (!categories.length || categories.includes(m.strCategory ?? "Other")),
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sort === "ingredients")
        comparison = ingredients(a).length - ingredients(b).length;
      else {
        const field =
          sort === "cuisine"
            ? "strArea"
            : sort === "category"
              ? "strCategory"
              : "strMeal";
        comparison = (a[field] ?? "").localeCompare(b[field] ?? "", undefined, {
          sensitivity: "base",
        });
      }
      return (
        direction *
        (comparison ||
          a.strMeal.localeCompare(b.strMeal) ||
          a.idMeal.localeCompare(b.idMeal))
      );
    });
}
