const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status, extraHeaders) {
  const headers = Object.assign({}, JSON_HEADERS, extraHeaders || {});
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function html(content) {
  return new Response(content, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

function asset(content, type) {
  return new Response(content, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function ensureSchema(env) {
  if (!env.DB) throw new Error("Database binding is missing");
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS availability (date TEXT PRIMARY KEY NOT NULL, status TEXT NOT NULL CHECK (status IN ('available','booked','closed')), updated_at TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, guest_name TEXT NOT NULL, phone TEXT NOT NULL, check_in TEXT NOT NULL, check_out TEXT NOT NULL, adults INTEGER NOT NULL DEFAULT 1, children INTEGER NOT NULL DEFAULT 0, stay_type TEXT NOT NULL DEFAULT 'overnight' CHECK (stay_type IN ('day','overnight')), checkin_time TEXT NOT NULL DEFAULT '', checkout_time TEXT NOT NULL DEFAULT '', deposit INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','paid','cancelled')), notes TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'site' CHECK (source IN ('site','manual','whatsapp','phone')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_bookings_status_check_in ON bookings (status, check_in)").run();
}

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  const parts = raw.split(";");
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(new Uint8Array(signed));
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index % left.length) || 0) ^ (right.charCodeAt(index % right.length) || 0);
  }
  return difference === 0;
}

async function passwordMatches(input, expected) {
  const encoder = new TextEncoder();
  const left = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input || "")));
  const right = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(expected || "")));
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function createSession(env) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = String(expires);
  const signed = await signature(env.ADMIN_SESSION_SECRET, payload);
  return payload + "." + signed;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;
  const token = cookieValue(request, "prohlada_admin");
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expires = Number(parts[0]);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = await signature(env.ADMIN_SESSION_SECRET, parts[0]);
  return safeEqual(parts[1], expected);
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("JSON required");
  return request.json();
}

async function availability(request, env, url) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!validDate(from) || !validDate(to) || from > to) return json({ error: "Некорректный период" }, 400);
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  if ((end - start) / 86400000 > 370) return json({ error: "Слишком большой период" }, 400);
  await ensureSchema(env);
  const manual = await env.DB.prepare(
    "SELECT date, status FROM availability WHERE date >= ?1 AND date <= ?2 ORDER BY date"
  ).bind(from, to).all();
  const confirmed = await env.DB.prepare(
    "SELECT id, check_in, check_out FROM bookings WHERE status IN ('confirmed','paid') AND check_in <= ?2 AND check_out > ?1 ORDER BY check_in"
  ).bind(from, to).all();
  const dates = new Map();
  for (const item of manual.results || []) dates.set(item.date, { date: item.date, status: item.status, source: "manual" });
  for (const booking of confirmed.results || []) {
    let cursor = new Date((booking.check_in < from ? from : booking.check_in) + "T00:00:00Z");
    const endValue = booking.check_out > to ? to : booking.check_out;
    const endDate = new Date(endValue + "T00:00:00Z");
    while (cursor < endDate || (booking.check_out > to && cursor <= endDate)) {
      const value = cursor.toISOString().slice(0, 10);
      if (value > to) break;
      const existing = dates.get(value);
      if (!existing || existing.status === "available") {
        dates.set(value, { date: value, status: "booked", source: "booking", bookingId: booking.id });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return json({ dates: Array.from(dates.values()).sort((a, b) => a.date.localeCompare(b.date)) });
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanInteger(value, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return null;
  return Math.min(max, Math.max(min, number));
}

function normalizeBooking(body, publicRequest) {
  const booking = {
    guestName: cleanText(body.guestName, 100),
    phone: cleanText(body.phone, 40),
    checkIn: cleanText(body.checkIn, 10),
    checkOut: cleanText(body.checkOut, 10),
    adults: cleanInteger(body.adults, 1, 40),
    children: cleanInteger(body.children, 0, 30),
    stayType: ["day", "overnight"].includes(body.stayType) ? body.stayType : "overnight",
    checkinTime: cleanText(body.checkinTime, 5),
    checkoutTime: cleanText(body.checkoutTime, 5),
    deposit: cleanInteger(body.deposit == null ? 0 : body.deposit, 0, 10000000),
    total: cleanInteger(body.total == null ? 0 : body.total, 0, 10000000),
    status: ["new", "confirmed", "paid", "cancelled"].includes(body.status) ? body.status : "new",
    notes: cleanText(body.notes, 1000),
    source: ["site", "manual", "whatsapp", "phone"].includes(body.source) ? body.source : (publicRequest ? "site" : "manual")
  };
  if (publicRequest) {
    booking.status = "new";
    booking.source = "site";
    booking.deposit = 0;
    booking.total = 0;
  }
  if (!booking.guestName || booking.phone.length < 6) return { error: "Укажите фамилию, имя, отчество и номер телефона" };
  if (!validDate(booking.checkIn) || !validDate(booking.checkOut) || booking.checkIn >= booking.checkOut) return { error: "Некорректные даты" };
  if (booking.adults == null || booking.children == null || booking.deposit == null || booking.total == null) return { error: "Некорректные числовые данные" };
  const days = (new Date(booking.checkOut + "T00:00:00Z") - new Date(booking.checkIn + "T00:00:00Z")) / 86400000;
  if (days > 60) return { error: "Период бронирования слишком большой" };
  return { booking };
}

async function conflicts(env, booking, excludeId) {
  const manual = await env.DB.prepare(
    "SELECT date FROM availability WHERE date >= ?1 AND date < ?2 AND status IN ('booked','closed') LIMIT 1"
  ).bind(booking.checkIn, booking.checkOut).first();
  if (manual) return true;
  let query = "SELECT id FROM bookings WHERE status IN ('confirmed','paid') AND check_in < ?2 AND check_out > ?1";
  const values = [booking.checkIn, booking.checkOut];
  if (excludeId) {
    query += " AND id != ?3";
    values.push(excludeId);
  }
  return Boolean(await env.DB.prepare(query + " LIMIT 1").bind(...values).first());
}

async function publicCreateBooking(request, env) {
  let body;
  try { body = await readBody(request); } catch (error) { return json({ error: "Некорректный запрос" }, 400); }
  const normalized = normalizeBooking(body, true);
  if (normalized.error) return json({ error: normalized.error }, 400);
  await ensureSchema(env);
  if (await conflicts(env, normalized.booking)) return json({ error: "Выбранные даты уже заняты" }, 409);
  const item = normalized.booking;
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO bookings (guest_name, phone, check_in, check_out, adults, children, stay_type, checkin_time, checkout_time, deposit, total, status, notes, source, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)"
  ).bind(item.guestName, item.phone, item.checkIn, item.checkOut, item.adults, item.children, item.stayType, item.checkinTime, item.checkoutTime, item.deposit, item.total, item.status, item.notes, item.source, now, now).run();
  return json({ ok: true, id: result.meta && result.meta.last_row_id }, 201);
}

function bookingRow(row) {
  return {
    id: row.id, guestName: row.guest_name, phone: row.phone, checkIn: row.check_in, checkOut: row.check_out,
    adults: row.adults, children: row.children, stayType: row.stay_type, checkinTime: row.checkin_time,
    checkoutTime: row.checkout_time, deposit: row.deposit, total: row.total, status: row.status,
    notes: row.notes, source: row.source, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

async function adminBookings(request, env, url) {
  if (!(await isAdmin(request, env))) return json({ error: "Требуется вход" }, 401);
  await ensureSchema(env);
  if (request.method === "GET") {
    const status = url.searchParams.get("status") || "";
    let query = "SELECT * FROM bookings";
    const values = [];
    if (["new", "confirmed", "paid", "cancelled"].includes(status)) { query += " WHERE status = ?1"; values.push(status); }
    query += " ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'confirmed' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END, check_in ASC, id DESC LIMIT 500";
    const result = await env.DB.prepare(query).bind(...values).all();
    return json({ bookings: (result.results || []).map(bookingRow) });
  }
  const match = url.pathname.match(/^\/api\/admin\/bookings\/(\d+)$/);
  const id = match ? Number(match[1]) : 0;
  if (request.method === "DELETE" && id) {
    const existing = await env.DB.prepare("SELECT id FROM bookings WHERE id = ?1").bind(id).first();
    if (!existing) return json({ error: "Бронь не найдена" }, 404);
    await env.DB.prepare("DELETE FROM bookings WHERE id = ?1").bind(id).run();
    return json({ ok: true });
  }
  let body;
  try { body = await readBody(request); } catch (error) { return json({ error: "Некорректный запрос" }, 400); }
  const normalized = normalizeBooking(body, false);
  if (normalized.error) return json({ error: normalized.error }, 400);
  const item = normalized.booking;
  const now = new Date().toISOString();
  if ((item.status === "confirmed" || item.status === "paid") && await conflicts(env, item, id)) {
    return json({ error: "Эти даты уже заняты другой подтверждённой бронью" }, 409);
  }
  if (request.method === "POST" && url.pathname === "/api/admin/bookings") {
    const created = await env.DB.prepare(
      "INSERT INTO bookings (guest_name, phone, check_in, check_out, adults, children, stay_type, checkin_time, checkout_time, deposit, total, status, notes, source, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)"
    ).bind(item.guestName, item.phone, item.checkIn, item.checkOut, item.adults, item.children, item.stayType, item.checkinTime, item.checkoutTime, item.deposit, item.total, item.status, item.notes, item.source, now, now).run();
    return json({ ok: true, id: created.meta && created.meta.last_row_id }, 201);
  }
  if (request.method === "PUT" && id) {
    const existing = await env.DB.prepare("SELECT id FROM bookings WHERE id = ?1").bind(id).first();
    if (!existing) return json({ error: "Бронь не найдена" }, 404);
    await env.DB.prepare(
      "UPDATE bookings SET guest_name=?1, phone=?2, check_in=?3, check_out=?4, adults=?5, children=?6, stay_type=?7, checkin_time=?8, checkout_time=?9, deposit=?10, total=?11, status=?12, notes=?13, source=?14, updated_at=?15 WHERE id=?16"
    ).bind(item.guestName, item.phone, item.checkIn, item.checkOut, item.adults, item.children, item.stayType, item.checkinTime, item.checkoutTime, item.deposit, item.total, item.status, item.notes, item.source, now, id).run();
    return json({ ok: true });
  }
  return json({ error: "Не найдено" }, 404);
}

async function adminLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) return json({ error: "Админка ещё не настроена" }, 503);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ error: "Некорректный запрос" }, 400);
  }
  if (!(await passwordMatches(body.password, env.ADMIN_PASSWORD))) {
    return json({ error: "Неверный пароль" }, 401);
  }
  const token = await createSession(env);
  return json(
    { ok: true },
    200,
    { "set-cookie": "prohlada_admin=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800" }
  );
}

async function adminUpdate(request, env) {
  if (!(await isAdmin(request, env))) return json({ error: "Требуется вход" }, 401);
  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    return json({ error: "Некорректный запрос" }, 400);
  }
  if (!validDate(body.date)) return json({ error: "Некорректная дата" }, 400);
  await ensureSchema(env);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM availability WHERE date = ?1").bind(body.date).run();
    return json({ ok: true });
  }
  if (!["available", "booked", "closed"].includes(body.status)) {
    return json({ error: "Некорректный статус" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO availability (date, status, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(date) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at"
  ).bind(body.date, body.status, new Date().toISOString()).run();
  return json({ ok: true });
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/favicon.svg") {
    return asset(FAVICON, "image/svg+xml; charset=utf-8");
  }
  if (PHOTO_ASSETS[path]) {
    const photo = PHOTO_ASSETS[path];
    const binary = atob(photo.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Response(bytes, { headers: { "content-type": photo.type, "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (path === "/calendar.css") return asset(CALENDAR_CSS, "text/css; charset=utf-8");
  if (path === "/calendar.js") return asset(PUBLIC_JS, "text/javascript; charset=utf-8");
  if (path === "/admin.js") return asset(ADMIN_JS, "text/javascript; charset=utf-8");
  if (path === "/admin" || path === "/admin/") return html(ADMIN_HTML);
  if (path === "/api/availability" && request.method === "GET") return availability(request, env, url);
  if (path === "/api/bookings" && request.method === "POST") return publicCreateBooking(request, env);
  if (path === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
  if (path === "/api/admin/logout" && request.method === "POST") {
    return json({ ok: true }, 200, { "set-cookie": "prohlada_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" });
  }
  if (path === "/api/admin/session" && request.method === "GET") {
    return (await isAdmin(request, env)) ? json({ authenticated: true }) : json({ authenticated: false }, 401);
  }
  if (path === "/api/admin/availability" && (request.method === "PUT" || request.method === "DELETE")) {
    return adminUpdate(request, env);
  }
  if ((path === "/api/admin/bookings" && (request.method === "GET" || request.method === "POST")) || (/^\/api\/admin\/bookings\/\d+$/.test(path) && (request.method === "PUT" || request.method === "DELETE"))) {
    return adminBookings(request, env, url);
  }
  if (path.startsWith("/api/")) return json({ error: "Не найдено" }, 404);
  return html(PUBLIC_HTML);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      return json({ error: "Временная ошибка сервиса" }, 500);
    }
  }
};
