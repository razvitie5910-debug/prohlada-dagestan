import { mkdir, readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";

const css = (await readFile(new URL("../app/globals.css", import.meta.url), "utf8"))
  .replace('@import "tailwindcss";', "");
const photo = await readFile(new URL("../public/prohlada-cottage.png", import.meta.url));
const photoBase64 = photo.toString("base64");

const amenities = [
  ["01", "Коттеджи у воды", "Уютные дома с видом на водопад и 20 комфортными спальными местами."],
  ["02", "Бассейны", "Большой бассейн с водопадом и отдельный безопасный бассейн для детей."],
  ["03", "Баня и чан", "Банный комплекс и лечебный чан для глубокого отдыха в любое время года."],
  ["04", "Всё для застолья", "Просторные беседки, топчан, мангальная зона, очаг и необходимая посуда."],
  ["05", "Для всей семьи", "Качели, детская площадка, шезлонги и волейбольная площадка."],
  ["06", "Полная приватность", "Вся большая территория — только для вашей компании, без посторонних."],
];

const amenityCards = amenities
  .map(
    ([number, title, text]) => `
      <article class="amenity-card">
        <span>${number}</span>
        <div><h3>${title}</h3><p>${text}</p></div>
      </article>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="description" content="Приватный семейный отдых: коттеджи, бассейн с водопадом, баня, чан и вся территория только для вашей компании.">
    <meta name="theme-color" content="#2d382d">
    <title>Прохлада — гостевой дом в Дагестане</title>
    <style>${css}</style>
  </head>
  <body>
    <main>
      <header class="site-header">
        <a class="brand" href="#top" aria-label="Прохлада — на главную">
          <span class="brand-mark" aria-hidden="true">✣</span>
          <span><strong>ПРОХЛАДА</strong><small>ГОСТЕВОЙ ДОМ · ДАГЕСТАН</small></span>
        </a>
        <nav aria-label="Основная навигация">
          <a href="#about">О месте</a><a href="#amenities">Удобства</a>
          <a href="#prices">Цены</a><a href="#contacts">Контакты</a>
        </nav>
        <a class="header-cta" href="tel:+79673999188">Забронировать</a>
      </header>

      <section class="hero" id="top">
        <div class="hero-copy">
          <p class="eyebrow">Приватный отдых на природе</p>
          <h1>Место, где<em>становится тише</em></h1>
          <p class="hero-lead">Гостевой дом «Прохлада» — отдельная территория с коттеджами, бассейном и водопадом для отдыха в кругу близких.</p>
          <div class="hero-actions">
            <a class="button button-dark" href="tel:+79673999188">Узнать свободные даты <span aria-hidden="true">↗</span></a>
            <a class="text-link" href="#prices">Посмотреть цены <span aria-hidden="true">↓</span></a>
          </div>
          <div class="hero-facts" aria-label="Ключевые преимущества">
            <div><strong>20</strong><span>спальных мест</span></div>
            <div><strong>100%</strong><span>территории для вас</span></div>
            <div><strong>2</strong><span>бассейна</span></div>
          </div>
        </div>
        <div class="hero-media">
          <img src="/prohlada-cottage.png" alt="Коттедж гостевого дома Прохлада у бассейна с водопадом">
          <div class="hero-badge"><span>Вода</span><strong>Свежая и чистая</strong></div>
          <div class="hero-caption"><span>Гостевой дом</span><strong>«Прохлада»</strong></div>
        </div>
      </section>

      <section class="intro" id="about">
        <p class="section-kicker">О месте</p>
        <div class="intro-grid">
          <h2>Отдых без соседей, суеты и лишних планов</h2>
          <div class="intro-copy">
            <p>Здесь можно собрать семью или друзей и на время получить целое пространство только для себя: плавать, готовить на огне, париться в бане и слушать воду и птиц.</p>
            <p>Мы собрали всё необходимое на одной территории, чтобы вам оставалось только выбрать дату и приехать.</p>
          </div>
        </div>
        <div class="values">
          <div><span aria-hidden="true">◇</span><strong>Приватность</strong><p>Никаких посторонних на территории во время вашего отдыха.</p></div>
          <div><span aria-hidden="true">≋</span><strong>Живая вода</strong><p>Бассейн с водопадом и свежей чистой водой.</p></div>
          <div><span aria-hidden="true">♨</span><strong>Тепло круглый год</strong><p>Баня, лечебный чан и уютные коттеджи.</p></div>
          <div><span aria-hidden="true">⌂</span><strong>Для большой компании</strong><p>До 20 комфортных спальных мест.</p></div>
        </div>
      </section>

      <section class="amenities-section" id="amenities">
        <div class="section-heading">
          <div><p class="section-kicker">Всё включено в отдых</p><h2>Одна территория.<br>Много сценариев.</h2></div>
          <p>От спокойного дня у воды до большого семейного праздника — пространство легко подстраивается под вашу компанию.</p>
        </div>
        <div class="amenities-grid">${amenityCards}</div>
      </section>

      <section class="feature-band">
        <div class="feature-image" role="img" aria-label="Водопад у бассейна гостевого дома Прохлада"></div>
        <div class="feature-copy">
          <p class="section-kicker">Главное впечатление</p>
          <h2>Свой маленький водопад</h2>
          <p>Вода задаёт ритм всему пространству: освежает днём, успокаивает вечером и создаёт ту самую атмосферу «Прохлады».</p>
          <ul><li>бассейн с пресной чистой водой</li><li>отдельная зона для детей</li><li>шезлонги и места для отдыха рядом</li></ul>
        </div>
      </section>

      <section class="pricing" id="prices">
        <div class="section-heading pricing-heading">
          <div><p class="section-kicker">Простые условия</p><h2>Стоимость всей территории</h2></div>
          <p>Без скрытых доплат за отдельные зоны. Актуальность цены и свободные даты уточняйте при бронировании.</p>
        </div>
        <div class="price-grid">
          <article class="price-card">
            <p class="price-eyebrow">День на территории</p><h3>Без ночлега</h3>
            <div class="price-value">15 000 ₽</div><p class="price-note">до 10 гостей</p>
            <div class="price-divider"></div><p>+ 500 ₽ за каждого следующего гостя</p>
            <a href="tel:+79673999188">Выбрать дату <span aria-hidden="true">↗</span></a>
          </article>
          <article class="price-card featured">
            <p class="price-eyebrow">Отдых с размещением</p><h3>С ночлегом</h3>
            <div class="price-value">15 000 ₽</div><p class="price-note">до 5 гостей</p>
            <div class="price-divider"></div><p>+ 1 000 ₽ за каждого следующего гостя</p>
            <a href="tel:+79673999188">Выбрать дату <span aria-hidden="true">↗</span></a>
          </article>
          <article class="capacity-card">
            <p class="price-eyebrow">Размещение</p><strong>20</strong>
            <h3>комфортных<br>спальных мест</h3>
            <p>Для большой семьи, компании друзей или камерного события.</p>
          </article>
        </div>
      </section>

      <section class="booking" id="contacts">
        <div>
          <p class="section-kicker">Бронирование</p><h2>Ваш отдых начинается с одной даты</h2>
          <p>Позвоните или напишите в Instagram — расскажем о свободных датах, ответим на вопросы и поможем всё спланировать.</p>
        </div>
        <div class="booking-actions">
          <a class="button button-light" href="tel:+79673999188">+7 967 399-91-88 <span aria-hidden="true">↗</span></a>
          <a class="button button-outline" href="https://www.instagram.com/prohlada.dagestan/" target="_blank" rel="noreferrer">@prohlada.dagestan <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer>
        <a class="brand footer-brand" href="#top">
          <span class="brand-mark" aria-hidden="true">✣</span>
          <span><strong>ПРОХЛАДА</strong><small>ГОСТЕВОЙ ДОМ · ДАГЕСТАН</small></span>
        </a>
        <p>Уют · комфорт · полный отдых</p>
        <a href="https://www.instagram.com/prohlada.dagestan/" target="_blank" rel="noreferrer">Instagram <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  </body>
</html>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#2d382d"/><text x="32" y="42" text-anchor="middle" font-size="34" fill="#d6aa83">✣</text></svg>`;
const worker = `const html=${JSON.stringify(html)};const favicon=${JSON.stringify(favicon)};const photo=${JSON.stringify(photoBase64)};
export default {async fetch(request){const url=new URL(request.url);if(url.pathname==="/favicon.svg"){return new Response(favicon,{headers:{"content-type":"image/svg+xml; charset=utf-8","cache-control":"public, max-age=86400"}})}if(url.pathname==="/prohlada-cottage.png"){const bytes=Uint8Array.from(atob(photo),c=>c.charCodeAt(0));return new Response(bytes,{headers:{"content-type":"image/png","cache-control":"public, max-age=31536000, immutable"}})}return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin"}})}};`;

await mkdir(new URL("../dist/server/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/server/index.js", import.meta.url), worker);
