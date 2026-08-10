import { mkdir, readFile } from "node:fs/promises";
import { renameSync, rmSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = async (path) => readFile(new URL(path, root), "utf8");

let publicHtml = await read("outputs/prohlada-preview.html");
const calendarSection = await read("assets/calendar-section.html");
const calendarCss = await read("assets/calendar.css");
const publicJs = await read("assets/calendar.js");
const adminHtml = await read("assets/admin.html");
const adminJs = await read("assets/admin.js");
const runtime = await read("worker/calendar-runtime.js");
const photo = await readFile(new URL("public/prohlada-cottage.png", root));

publicHtml = publicHtml.replaceAll("../public/prohlada-cottage.png", "/prohlada-cottage.png");
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
  '<link rel="stylesheet" href="/calendar.css">\n</head>'
);
publicHtml = publicHtml.replace(
  "</body>",
  '<script src="/calendar.js"></script>\n</body>'
);

const favicon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#2d382d"/><text x="32" y="42" text-anchor="middle" font-size="34" fill="#d6aa83">✣</text></svg>';
const constants = [
  "const PUBLIC_HTML = " + JSON.stringify(publicHtml) + ";",
  "const ADMIN_HTML = " + JSON.stringify(adminHtml) + ";",
  "const CALENDAR_CSS = " + JSON.stringify(calendarCss) + ";",
  "const PUBLIC_JS = " + JSON.stringify(publicJs) + ";",
  "const ADMIN_JS = " + JSON.stringify(adminJs) + ";",
  "const PHOTO_BASE64 = " + JSON.stringify(photo.toString("base64")) + ";",
  "const FAVICON = " + JSON.stringify(favicon) + ";"
].join("\n");

const outputDir = new URL("dist/server/", root);
await mkdir(outputDir, { recursive: true });
const temporary = new URL("dist/server/index.calendar.tmp", root);
const output = new URL("dist/server/index.js", root);
writeFileSync(temporary, constants + "\n" + runtime);
rmSync(output, { force: true });
renameSync(temporary, output);
