import { writeFile } from "node:fs/promises";
const meals = new Map();
for (const letter of ["a", "b", "c", "s"]) {
  const response = await fetch(
    `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`,
  );
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const data = await response.json();
  for (const meal of data.meals ?? []) meals.set(meal.idMeal, meal);
}
const counts = new Map();
const sample = [...meals.values()].filter((meal) => {
  const count = (counts.get(meal.strCategory) ?? 0) + 1;
  counts.set(meal.strCategory, count);
  return count <= 4;
});
await writeFile("src/data/meals.json", JSON.stringify(sample, null, 2));
console.log(
  `Saved ${sample.length} API recipes for an explicitly labeled offline fallback.`,
);
