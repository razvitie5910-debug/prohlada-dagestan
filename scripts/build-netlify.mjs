import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build as viteBuild } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "netlify-dist");
const functionsOutput = join(root, "netlify-functions-bundled");
const read = (path) => readFile(join(root, path), "utf8");

await rm(output, { recursive: true, force: true });
await rm(functionsOutput, { recursive: true, force: true });
await mkdir(join(output, "admin"), { recursive: true });
await mkdir(functionsOutput, { recursive: true });

let publicHtml = (await read("outputs/prohlada-preview.html")).replaceAll("../public/", "/");
const publicPricing = await read("assets/public-pricing.js");
publicHtml = publicHtml.replace("</body>", `<script>\n${publicPricing}\n</script>\n</body>`);

let adminHtml = await read("assets/price-admin.html");
const adminJs = await read("assets/price-admin.js");
adminHtml = adminHtml.replace('<script src="/price-admin.js"></script>', `<script>\n${adminJs}\n</script>`);

await writeFile(join(output, "index.html"), publicHtml);
await writeFile(join(output, "admin", "index.html"), adminHtml);
await writeFile(join(output, "_headers"), "/admin/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n/api/*\n  Cache-Control: no-store\n");

for (const entry of await readdir(join(root, "public"), { withFileTypes: true })) {
  await cp(join(root, "public", entry.name), join(output, entry.name), { recursive: entry.isDirectory() });
}

await viteBuild({
  configFile: false,
  logLevel: "warn",
  build: {
    ssr: join(root, "netlify", "functions", "pricing.mjs"),
    outDir: functionsOutput,
    emptyOutDir: false,
    target: "node20",
    minify: false,
    rollupOptions: {
      output: { entryFileNames: "pricing.mjs" },
    },
  },
  ssr: { noExternal: true },
});

console.log("Netlify output ready:", output);
console.log("Netlify functions ready:", functionsOutput);
