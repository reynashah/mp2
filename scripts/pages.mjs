import { copyFile } from "node:fs/promises";
// GitHub Pages serves this app shell for direct visits to nested React routes.
await copyFile("dist/index.html", "dist/404.html");
