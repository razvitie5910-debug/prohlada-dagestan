import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (path) => readFile(new URL(path, root), "utf8");
let publicHtml = await read("outputs/prohlada-preview.html");
const calendarSection = await read("assets/calendar-section.html");
const calendarCss = await read("assets/calendar.css");
const publicJs = await read("assets/calendar.js");
let adminHtml = await read("assets/admin.html");
const adminJs = await read("assets/admin.js");

publicHtml = publicHtml.replaceAll("../public/prohlada-cottage.png", "/prohlada-cottage.png");
publicHtml = publicHtml.replace('<a href="#prices">Цены</a>', '<a href="#calendar">Свободные даты</a><a href="#prices">Цены</a>');
publicHtml = publicHtml.replace('<section class="booking" id="contacts">', calendarSection + '\n<section class="booking" id="contacts">');
publicHtml = publicHtml.replace("</head>", `<style>\n${calendarCss}\n</style>\n</head>`);
publicHtml = publicHtml.replace("</body>", `<script>\n${publicJs}\n</script>\n</body>`);
adminHtml = adminHtml.replace('<link rel="stylesheet" href="/calendar.css">', `<style>\n${calendarCss}\n</style>`).replace('<script src="/admin.js"></script>', `<script>\n${adminJs}\n</script>`);

process.stdout.write("export const PUBLIC_HTML_V12 = " + JSON.stringify(publicHtml) + ";\nexport const ADMIN_HTML_V12 = " + JSON.stringify(adminHtml) + ";\n");
