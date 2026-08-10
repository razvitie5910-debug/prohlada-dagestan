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
      "cache-control": "public, max-age=120",
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
  const result = await env.DB.prepare(
    "SELECT date, status FROM availability WHERE date >= ?1 AND date <= ?2 ORDER BY date"
  ).bind(from, to).all();
  return json({ dates: result.results || [] });
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
  if (path === "/prohlada-cottage.png") {
    const binary = atob(PHOTO_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Response(bytes, { headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (path === "/calendar.css") return asset(CALENDAR_CSS, "text/css; charset=utf-8");
  if (path === "/calendar.js") return asset(PUBLIC_JS, "text/javascript; charset=utf-8");
  if (path === "/admin.js") return asset(ADMIN_JS, "text/javascript; charset=utf-8");
  if (path === "/admin" || path === "/admin/") return html(ADMIN_HTML);
  if (path === "/api/availability" && request.method === "GET") return availability(request, env, url);
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
