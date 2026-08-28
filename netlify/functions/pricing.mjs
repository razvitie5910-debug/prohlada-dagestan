import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const DEFAULT_PRICING = Object.freeze({
  dayPrice: 15000,
  dayGuests: 10,
  dayExtra: 500,
  overnightPrice: 15000,
  overnightGuests: 5,
  overnightExtra: 1000
});

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function passwordMatches(value) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || typeof value !== "string") return false;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function validInteger(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function normalizePricing(value) {
  const pricing = {
    dayPrice: Number(value.dayPrice),
    dayGuests: Number(value.dayGuests),
    dayExtra: Number(value.dayExtra),
    overnightPrice: Number(value.overnightPrice),
    overnightGuests: Number(value.overnightGuests),
    overnightExtra: Number(value.overnightExtra)
  };
  if (!validInteger(pricing.dayPrice, 0, 10000000)
    || !validInteger(pricing.overnightPrice, 0, 10000000)
    || !validInteger(pricing.dayExtra, 0, 10000000)
    || !validInteger(pricing.overnightExtra, 0, 10000000)
    || !validInteger(pricing.dayGuests, 1, 100)
    || !validInteger(pricing.overnightGuests, 1, 100)) return null;
  return pricing;
}

async function currentPricing() {
  const store = getStore({ name: "prohlada-pricing", consistency: "strong" });
  const saved = await store.get("current", { type: "json" });
  return normalizePricing(saved || {}) || { ...DEFAULT_PRICING };
}

export default async function pricing(request) {
  try {
    if (request.method === "GET") return json(await currentPricing());
    if (request.method !== "POST" && request.method !== "PUT") return json({ error: "Метод не поддерживается" }, 405);
    if (!process.env.ADMIN_PASSWORD) return json({ error: "Пароль администратора ещё не настроен в Netlify" }, 503);
    if (!passwordMatches(request.headers.get("x-admin-password"))) return json({ error: "Неверный пароль" }, 401);
    if (request.method === "POST") return json({ authenticated: true });

    const body = await request.json().catch(() => null);
    const normalized = body && normalizePricing(body);
    if (!normalized) return json({ error: "Проверьте значения цен и количества гостей" }, 400);
    const store = getStore({ name: "prohlada-pricing", consistency: "strong" });
    await store.setJSON("current", normalized);
    return json(normalized);
  } catch (error) {
    console.error("pricing function failed", error);
    return json({ error: "Временная ошибка сохранения цен" }, 500);
  }
}