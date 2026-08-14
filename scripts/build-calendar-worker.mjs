import { mkdir, readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = async (path) => readFile(new URL(path, root), "utf8");

let publicHtml = await read("outputs/prohlada-preview.html");
const calendarSection = await read("assets/calendar-section.html");
const calendarCss = await read("assets/calendar.css");
const publicJs = await read("assets/calendar.js");
let adminHtml = await read("assets/admin.html");
const adminJs = await read("assets/admin.js");
const runtime = await read("worker/calendar-runtime.js");
const photoFiles = {
  "/prohlada-pool-cottage.jpg": "public/prohlada-pool-cottage.jpg",
  "/prohlada-loungers.jpg": "public/prohlada-loungers.jpg",
  "/prohlada-gazebo.jpg": "public/prohlada-gazebo.jpg",
  "/prohlada-night.jpg": "public/prohlada-night.jpg",
  "/prohlada-chan-empty.jpg": "public/prohlada-chan-empty.jpg"
};
const photoAssets = Object.fromEntries(await Promise.all(
  Object.entries(photoFiles).map(async ([route, file]) => [
    route,
    { type: "image/jpeg", data: (await readFile(new URL(file, root))).toString("base64") }
  ])
));

publicHtml = publicHtml.replaceAll("../public/", "/");
publicHtml = publicHtml.replace(
  '<a href="#prices">Цены</a>',
  '<a href="#calendar">Свободные даты</a><a href="#prices">Цены</a>'
);
publicHtml = publicHtml.replace(
  '<section class="booking" id="contacts">',
  calendarSection + '\n<section class="booking" id="contacts">'
);
publicHtml = publicHtml.replace(
  "</head>",
  `<style>\n${calendarCss}\n</style>\n</head>`
);
publicHtml = publicHtml.replace(
  "</body>",
  `<script>\n${publicJs}\n</script>\n</body>`
);

// Keep the booking UI reliable even when the hosting edge does not forward
// standalone CSS or JavaScript asset requests to the Worker.
adminHtml = adminHtml
  .replace(
    '<link rel="stylesheet" href="/calendar.css">',
    `<style>\n${calendarCss}\n</style>`
  )
  .replace(
    '<script src="/admin.js"></script>',
    `<script>\n${adminJs}\n</script>`
  );

const favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#2d382d"/><text x="32" y="42" text-anchor="middle" font-size="34" fill="#d6aa83">✣</text></svg>';
const constants = [
  "const PUBLIC_HTML = " + JSON.stringify(publicHtml) + ";",
  "const ADMIN_HTML = " + JSON.stringify(adminHtml) + ";",
  "const CALENDAR_CSS = " + JSON.stringify(calendarCss) + ";",
  "const PUBLIC_JS = " + JSON.stringify(publicJs) + ";",
  "const ADMIN_JS = " + JSON.stringify(adminJs) + ";",
  "const PHOTO_ASSETS = " + JSON.stringify(photoAssets) + ";",
  "const FAVICON = " + JSON.stringify(favicon) + ";"
].join("\n");

const outputRoot = process.env.PROHLADA_BUILD_ROOT || fileURLToPath(root);
const outputDir = join(outputRoot, "dist", "server");
await mkdir(outputDir, { recursive: true });
const output = join(outputDir, "index.js");
writeFileSync(output, constants + "\n" + runtime);
