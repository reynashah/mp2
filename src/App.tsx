import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ingredients, loadCollection, loadMeal, selectMeals } from "./api";
import type { Collection, Meal } from "./api";

function Icon({
  name,
}: {
  name: "search" | "grid" | "list" | "arrow" | "pot";
}) {
  const paths = {
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    list: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
    arrow: "M4 12h16M14 6l6 6-6 6",
    pot: "M5 10h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5zM2 11h3m14 0h3M9 2v4m6-4v4M4 10h16",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function MealImage({ meal, eager = false }: { meal: Meal; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed || !meal.strMealThumb ? (
    <div className="image-fallback">
      <Icon name="pot" />
      <span>Made to be discovered</span>
    </div>
  ) : (
    <img
      src={meal.strMealThumb}
      alt={meal.strMeal}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
function Status({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="status">
      <Icon name="pot" />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function App() {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    void loadCollection().then((data) => {
      if (active) setCollection(data);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const params = new URLSearchParams(location.search);
  params.delete("from");
  const query = params.toString() ? `?${params}` : "";
  async function retry() {
    setRefreshing(true);
    setCollection(await loadCollection(true));
    setRefreshing(false);
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to recipes
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/gallery" className="brand" aria-label="At the table home">
            <span className="brand-icon">
              <Icon name="pot" />
            </span>
            at the table<span className="brand-dot">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link
              className={location.pathname === "/gallery" ? "active" : ""}
              to={`/gallery${query}`}
            >
              Discover
            </Link>
            <Link
              className={location.pathname === "/list" ? "active" : ""}
              to={`/list${query}`}
            >
              Recipe index
            </Link>
          </nav>
          <span className="header-note">GOOD FOOD. NEW FAVORITES.</span>
        </div>
      </header>
      <main id="main">
        {collection?.offline && (
          <div className="offline" role="status">
            The recipe service is unavailable. You’re browsing a saved recipe
            collection.{" "}
            <button onClick={() => void retry()} disabled={refreshing}>
              {refreshing ? "Trying…" : "Try live data again"}
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/gallery" replace />} />
          <Route
            path="/gallery"
            element={<Explore collection={collection} view="gallery" />}
          />
          <Route
            path="/list"
            element={<Explore collection={collection} view="list" />}
          />
          <Route
            path="/recipe/:id"
            element={<Detail key={location.pathname} collection={collection} />}
          />
          <Route
            path="*"
            element={
              <Status title="This page isn’t on the menu.">
                <Link className="button" to="/gallery">
                  Explore recipes
                </Link>
              </Status>
            }
          />
        </Routes>
      </main>
      <footer>
        <Link className="brand footer-brand" to="/gallery">
          at the table.
        </Link>
        <p>A little inspiration for your next meal.</p>
        <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">
          Recipes & photography by TheMealDB ↗
        </a>
      </footer>
    </>
  );
}
function Explore({
  collection,
  view,
}: {
  collection: Collection | null;
  view: "gallery" | "list";
}) {
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(24);
  const meals = useMemo(
    () => selectMeals(collection?.meals ?? [], params),
    [collection, params],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          (collection?.meals ?? []).map((m) => m.strCategory ?? "Other"),
        ),
      ].sort(),
    [collection],
  );
  const selected = params.getAll("category");
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(24);
  }
  function toggle(category?: string) {
    const next = new URLSearchParams(params);
    next.delete("category");
    if (category)
      (selected.includes(category)
        ? selected.filter((c) => c !== category)
        : [...selected, category]
      ).forEach((c) => next.append("category", c));
    setParams(next, { replace: true });
    setLimit(24);
  }
  function detailUrl(id: string) {
    const next = new URLSearchParams(params);
    next.set("from", view);
    return `/recipe/${id}?${next}`;
  }
  const featured =
    collection?.meals.find(
      (m) => m.strMeal.toLowerCase().includes("chicken") && m.strMealThumb,
    ) ?? collection?.meals[0];
  return (
    <div className="page-container">
      <section className={`hero ${view === "list" ? "hero-compact" : ""}`}>
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> A WORLD OF RECIPES, ONE TABLE
          </p>
          <h1>
            {view === "gallery" ? (
              <>
                Find your next
                <br />
                <em>“that was delicious.”</em>
              </>
            ) : (
              <>
                The recipe <em>index.</em>
              </>
            )}
          </h1>
          <p className="hero-description">
            {view === "gallery"
              ? "From everyday comforts to something a little unexpected. Discover a recipe worth gathering around."
              : "A good meal starts with a little inspiration. Search, sort, and find something you’ll love to cook."}
          </p>
          <div className="hero-meta">
            <span className="tiny-stars">✳</span> Real recipes. A world of
            flavor. Always room for one more.
          </div>
        </div>
        {view === "gallery" && featured && (
          <Link to={detailUrl(featured.idMeal)} className="hero-feature">
            <MealImage meal={featured} eager />
            <span className="feature-label">SOMETHING TO TRY</span>
            <span className="feature-caption">
              <span>
                <small>
                  {[featured.strArea, featured.strCategory].filter(Boolean).join(" · ")}
                </small>
                <strong>{featured.strMeal}</strong>
              </span>
              <span className="round-arrow">
                <Icon name="arrow" />
              </span>
            </span>
          </Link>
        )}
      </section>
      <section className="recipe-section" aria-labelledby="collection-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2 id="collection-title">A little of everything.</h2>
          </div>
          <span className="collection-count">
            {collection
              ? `${collection.meals.length} recipes to explore`
              : "Finding your next favorite…"}
          </span>
        </div>
        <div className="toolbar">
          <label className="search">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Search recipes"
              placeholder="What sounds good? Search recipes…"
              value={params.get("q") ?? ""}
              onChange={(e) => update("q", e.target.value)}
            />
          </label>
          <div className="sort-controls">
            <label>
              Sort by
              <select
                aria-label="Sort by"
                value={params.get("sort") ?? "name"}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="name">Recipe name</option>
                <option value="cuisine">Cuisine</option>
                <option value="category">Category</option>
                <option value="ingredients">Ingredient count</option>
              </select>
            </label>
            <select
              aria-label="Sort direction"
              value={params.get("direction") ?? "asc"}
              onChange={(e) => update("direction", e.target.value)}
            >
              <option value="asc">Ascending ↑</option>
              <option value="desc">Descending ↓</option>
            </select>
          </div>
          <div className="view-toggle" aria-label="Recipe view">
            <Link
              aria-label="Gallery view"
              aria-current={view === "gallery" ? "page" : undefined}
              to={`/gallery?${params}`}
            >
              <Icon name="grid" />
            </Link>
            <Link
              aria-label="List view"
              aria-current={view === "list" ? "page" : undefined}
              to={`/list?${params}`}
            >
              <Icon name="list" />
            </Link>
          </div>
        </div>
        <div className="filters" aria-label="Filter by recipe category">
          <button
            className={!selected.length ? "selected" : ""}
            aria-pressed={!selected.length}
            onClick={() => toggle()}
          >
            All recipes
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={selected.includes(c) ? "selected" : ""}
              aria-pressed={selected.includes(c)}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="results-summary">
          <p role="status">
            {collection
              ? `${meals.length} ${meals.length === 1 ? "recipe" : "recipes"}${params.get("q") ? ` matching “${params.get("q")}”` : " · made for your table"}`
              : "Loading recipes…"}
          </p>
          {(selected.length > 0 || params.get("q")) && (
            <button
              className="text-button"
              onClick={() => {
                setParams({}, { replace: true });
                setLimit(24);
              }}
            >
              Clear filters ×
            </button>
          )}
        </div>
        {!collection ? (
          <Status title="Setting the table…">
            <p>Loading recipes from TheMealDB.</p>
          </Status>
        ) : !meals.length ? (
          <Status title="Nothing on the menu just yet.">
            <p>Try another recipe name or clear a category filter.</p>
            <button className="button" onClick={() => setParams({})}>
              Reset search & filters
            </button>
          </Status>
        ) : (
          <>
            <div className={view === "gallery" ? "recipe-grid" : "recipe-list"}>
              {meals.slice(0, limit).map((meal, i) => (
                <Link
                  className="recipe-card"
                  key={meal.idMeal}
                  to={detailUrl(meal.idMeal)}
                >
                  <div className="card-image">
                    <MealImage meal={meal} eager={i < 4} />
                    <span className="category-badge">{meal.strCategory}</span>
                  </div>
                  <div className="card-body">
                    <p className="card-kicker">
                      {meal.strArea || "Around the world"}
                      <span>•</span>
                      {ingredients(meal).length} ingredients
                    </p>
                    <h3>{meal.strMeal}</h3>
                    <span className="card-link">
                      Let’s cook <Icon name="arrow" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {meals.length > limit && (
              <div className="load-more">
                <button
                  className="button button-outline"
                  onClick={() => setLimit((n) => n + 24)}
                >
                  More good things <span>↓</span>
                </button>
                <p>
                  Showing {Math.min(limit, meals.length)} of {meals.length}{" "}
                  recipes
                </p>
              </div>
            )}
          </>
        )}
        <p className="scope-note">
          A curated alphabet collection: recipes beginning with A, B, C, and S.
          Search and filters apply to this collection. Select multiple
          categories to include any of them.
        </p>
      </section>
    </div>
  );
}
function Detail({ collection }: { collection: Collection | null }) {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const [extra, setExtra] = useState<Meal | null>(null);
  const [lookup, setLookup] = useState<"loading" | "done" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const found = collection?.meals.find((m) => m.idMeal === id);
  useEffect(() => {
    if (!collection || found) return;
    let active = true;
    void loadMeal(id)
      .then((m) => {
        if (active) {
          setExtra(m);
          setLookup("done");
        }
      })
      .catch(() => {
        if (active) setLookup("error");
      });
    return () => {
      active = false;
    };
  }, [collection, found, id, retry]);
  const meal = found ?? extra;
  const sequence = selectMeals(collection?.meals ?? [], params);
  const index = sequence.findIndex((m) => m.idMeal === id);
  const previous = index > 0 ? sequence[index - 1] : null;
  const next =
    index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null;
  const backParams = new URLSearchParams(params);
  backParams.delete("from");
  const back = `/${params.get("from") === "list" ? "list" : "gallery"}?${backParams}`;
  if (!collection || (!meal && lookup === "loading"))
    return <Status title="Opening the recipe…" />;
  if (!meal)
    return (
      <Status
        title={
          lookup === "error"
            ? "The recipe couldn’t be loaded."
            : "We couldn’t find that recipe."
        }
      >
        <p>
          {lookup === "error"
            ? "Check your connection and try again."
            : "This recipe ID may no longer be available."}
        </p>
        {lookup === "error" && (
          <button
            className="button"
            onClick={() => {
              setLookup("loading");
              setRetry((r) => r + 1);
            }}
          >
            Try again
          </button>
        )}
        <Link className="text-button" to={back}>
          Back to recipes
        </Link>
      </Status>
    );
  const steps = (meal.strInstructions ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((step) => Boolean(step) && !/^step\s+\d+[:.]?$/i.test(step));
  function safeUrl(value: string | null | undefined) {
    if (!value) return undefined;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
    } catch {
      return undefined;
    }
  }
  const video = safeUrl(meal.strYoutube);
  const source = safeUrl(meal.strSource);
  return (
    <article className="page-container detail-page">
      <div className="detail-top">
        <Link to={back} className="back-link">
          ← Back to recipes
        </Link>
        <span>
          {index >= 0
            ? `Recipe ${index + 1} of ${sequence.length}`
            : "From TheMealDB"}
        </span>
      </div>
      <div className="detail-hero">
        <div className="detail-photo">
          <MealImage meal={meal} eager />
        </div>
        <div className="detail-title">
          <p className="eyebrow">SOMETHING GOOD STARTS HERE</p>
          <div className="detail-tags">
            <span>{meal.strCategory}</span>
            {meal.strArea && <span>{meal.strArea}</span>}
          </div>
          <h1>{meal.strMeal}</h1>
          <p className="detail-intro">
            {meal.strArea ? `Bring a little ${meal.strArea} inspiration to your table.` : "Bring something new to your table."}
          </p>
          <div className="detail-facts">
            <div>
              <strong>{ingredients(meal).length}</strong>
              <span>Ingredients</span>
            </div>
            <div>
              <strong>{meal.strCategory || "Recipe"}</strong>
              <span>Category</span>
            </div>
          </div>
          <a className="button" href="#method">
            Let’s get cooking <Icon name="arrow" />
          </a>
          {video && (
            <a
              className="video-link"
              href={video}
              target="_blank"
              rel="noreferrer"
            >
              Watch recipe video ↗
            </a>
          )}
        </div>
      </div>
      <div className="recipe-content">
        <aside className="ingredients">
          <p className="eyebrow">YOUR SHOPPING LIST</p>
          <h2>What you’ll need</h2>
          <ul>
            {ingredients(meal).map((item, i) => (
              <li key={i}>
                <span>{item.name}</span>
                <strong>{item.measure}</strong>
              </li>
            ))}
          </ul>
        </aside>
        <section className="method" id="method">
          <p className="eyebrow">ONE STEP AT A TIME</p>
          <h2>Make something delicious.</h2>
          {steps.length ? (
            <ol>
              {steps.map((step, i) => (
                <li key={i}>
                  <span className="step-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p>Instructions aren’t available for this recipe.</p>
          )}
          {source && (
            <a
              className="source-link"
              href={source}
              target="_blank"
              rel="noreferrer"
            >
              Visit the original recipe ↗
            </a>
          )}
        </section>
      </div>
      <nav className="recipe-pagination" aria-label="Recipe navigation">
        {previous ? (
          <Link
            to={`/recipe/${previous.idMeal}?${params}`}
            aria-label={`Previous recipe: ${previous.strMeal}`}
          >
            <span>← PREVIOUS RECIPE</span>
            <strong>{previous.strMeal}</strong>
          </Link>
        ) : (
          <button disabled>
            <span>← PREVIOUS RECIPE</span>
            <strong>You’re at the first recipe</strong>
          </button>
        )}
        {next ? (
          <Link
            to={`/recipe/${next.idMeal}?${params}`}
            aria-label={`Next recipe: ${next.strMeal}`}
          >
            <span>NEXT RECIPE →</span>
            <strong>{next.strMeal}</strong>
          </Link>
        ) : (
          <button disabled>
            <span>NEXT RECIPE →</span>
            <strong>You’re at the last recipe</strong>
          </button>
        )}
      </nav>
    </article>
  );
}
export default App;
