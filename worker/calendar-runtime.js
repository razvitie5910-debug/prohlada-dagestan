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
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff"
    }
  });
}

function photoResponse(photo) {
  const binary = atob(photo.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Response(bytes, {
    headers: {
      "content-type": photo.type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff"
    }
  });
}

async function route(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/favicon.svg") return asset(FAVICON, "image/svg+xml; charset=utf-8");
  if (PHOTO_ASSETS[path]) return photoResponse(PHOTO_ASSETS[path]);
  if (path === "/admin" || path === "/admin/" || path.startsWith("/api/")) return json({ error: "Не найдено" }, 404);
  return html(PUBLIC_HTML);
}

export default {
  async fetch(request) {
    try {
      return await route(request);
    } catch (error) {
      return json({ error: "Временная ошибка сервиса" }, 500);
    }
  }
};