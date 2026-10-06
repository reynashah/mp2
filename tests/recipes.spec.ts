import { test, expect } from "@playwright/test";
import snapshot from "../src/data/meals.json" with { type: "json" };
const fixtures = [
  {
    ...snapshot[0],
    idMeal: "1",
    strMeal: "Apple supper",
    strCategory: "Vegan",
    strArea: "Turkish",
  },
  {
    ...snapshot[1],
    idMeal: "2",
    strMeal: "Bean bowl",
    strCategory: "Vegetarian",
    strArea: "American",
  },
  {
    ...snapshot[2],
    idMeal: "3",
    strMeal: "Chicken curry",
    strCategory: "Chicken",
    strArea: "British",
  },
];
test.beforeEach(async ({ page }) => {
  await page.route("**/api/json/v1/1/search.php*", (route) =>
    route.fulfill({ json: { meals: fixtures } }),
  );
});
test("live search, two sort properties in both directions, and empty state", async ({
  page,
}) => {
  await page.goto("list");
  const titles = page.locator(".recipe-card h3");
  await expect(titles).toHaveText([
    "Apple supper",
    "Bean bowl",
    "Chicken curry",
  ]);
  await page.getByLabel("Sort direction").selectOption("desc");
  await expect(titles).toHaveText([
    "Chicken curry",
    "Bean bowl",
    "Apple supper",
  ]);
  await page.getByLabel("Sort by", { exact: true }).selectOption("cuisine");
  await expect(titles).toHaveText(["Apple supper", "Chicken curry", "Bean bowl"]);
  await page.getByLabel("Sort direction").selectOption("asc");
  await expect(titles).toHaveText(["Bean bowl", "Chicken curry", "Apple supper"]);
  await page.getByRole("searchbox").fill("bean");
  await expect(titles).toHaveText(["Bean bowl"]);
  await page.getByRole("searchbox").fill("zzzz");
  await expect(
    page.getByRole("heading", { name: "Nothing on the menu just yet." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset search & filters" }).click();
  await expect(titles).toHaveCount(3);
});
test("multi-category filters, gallery details, previous/next boundaries and refresh", async ({
  page,
}) => {
  await page.goto("gallery");
  await page.getByRole("button", { name: "Vegan", exact: true }).click();
  await page.getByRole("button", { name: "Vegetarian", exact: true }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(2);
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Apple supper",
  );
  await expect(
    page.getByRole("button", { name: /PREVIOUS RECIPE/ }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Next recipe: Bean bowl" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bean bowl");
  await expect(
    page.getByRole("button", { name: /NEXT RECIPE/ }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bean bowl");
  await page
    .getByRole("link", { name: "Previous recipe: Apple supper" })
    .click();
  await page.getByRole("link", { name: "Back to recipes" }).click();
  await expect(page.locator(".recipe-card")).toHaveCount(2);
});
test("list navigation preserves query, and detail URL opens independently", async ({
  page,
}) => {
  await page.goto("list?q=Chicken");
  await page.locator(".recipe-card").click();
  await expect(page).toHaveURL(/recipe\/3/);
  await expect(
    page.getByRole("heading", { name: "What you’ll need" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to recipes" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Chicken");
  await page.goto("recipe/2");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bean bowl");
});
test("API failure uses clearly labeled fallback; unknown ID gives a useful state", async ({
  page,
}) => {
  await page.route("**/api/json/v1/1/search.php*", (route) => route.abort());
  await page.route("**/api/json/v1/1/lookup.php*", (route) =>
    route.fulfill({ json: { meals: null } }),
  );
  await page.goto("gallery");
  await expect(
    page.getByText(/You’re browsing a saved recipe collection/),
  ).toBeVisible();
  await expect(page.locator(".recipe-card")).toHaveCount(24);
  await page.goto("recipe/99999999");
  await expect(
    page.getByRole("heading", { name: "We couldn’t find that recipe." }),
  ).toBeVisible();
});
test("mobile layout fits viewport and image failures retain a usable card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/images/media/meals/**", (route) => route.abort());
  await page.goto("gallery");
  await expect(page.locator(".recipe-card").first()).toBeVisible();
  await expect(
    page.locator(".recipe-card .image-fallback").first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator(".recipe-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
