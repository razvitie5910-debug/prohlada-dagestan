(function () {
  var loginCard = document.getElementById("login-card");
  var loginForm = document.getElementById("login-form");
  var loginStatus = document.getElementById("login-status");
  var panel = document.getElementById("admin-panel");
  var logoutButton = document.getElementById("logout-button");
  var grid = document.getElementById("admin-calendar-grid");
  var title = document.getElementById("admin-calendar-title");
  var statusLine = document.getElementById("admin-status");
  var bookingList = document.getElementById("booking-list");
  var bookingSummary = document.getElementById("booking-summary");
  var bookingFilter = document.getElementById("booking-filter");
  var bookingModal = document.getElementById("booking-modal");
  var bookingForm = document.getElementById("booking-form");
  var bookingFormStatus = document.getElementById("booking-form-status");
  var deleteBookingButton = document.getElementById("delete-booking");
  var current = new Date();
  current = new Date(current.getFullYear(), current.getMonth(), 1);
  var statuses = {};
  var sources = {};
  var bookings = [];
  var months = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  var fullMonths = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var statusNames = { new: "Новая", confirmed: "Подтверждена", paid: "Оплачена", cancelled: "Отменена" };
  var sourceNames = { site: "с сайта", manual: "вручную", whatsapp: "WhatsApp", phone: "по телефону" };

  function pad(value) { return String(value).padStart(2, "0"); }
  function key(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function dateFromKey(value) { var p = value.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function displayDate(value) { var p = value.split("-").map(Number); return p[2] + " " + fullMonths[p[1] - 1] + " " + p[0]; }
  function money(value) { return new Intl.NumberFormat("ru-RU").format(Number(value) || 0) + " ₽"; }
  function rangeForMonth(date) { return { from: key(new Date(date.getFullYear(), date.getMonth(), 1)), to: key(new Date(date.getFullYear(), date.getMonth() + 1, 0)) }; }
  function escapeHtml(value) { var div = document.createElement("div"); div.textContent = value == null ? "" : String(value); return div.innerHTML; }

  async function responseJson(response) {
    var data = await response.json().catch(function () { return {}; });
    if (response.status === 401) { showLogin(); throw new Error("Требуется вход"); }
    if (!response.ok) throw new Error(data.error || "Не удалось выполнить действие");
    return data;
  }

  async function saveDate(date, status) {
    if (sources[date] === "booking") {
      statusLine.textContent = "Дата занята подтверждённой бронью — измените её в карточке гостя.";
      return;
    }
    statusLine.textContent = "Сохраняем " + displayDate(date) + "…";
    await responseJson(await fetch("/api/admin/availability", {
      method: status ? "PUT" : "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ date: date, status: status })
    }));
    if (status) { statuses[date] = status; sources[date] = "manual"; } else { delete statuses[date]; delete sources[date]; }
    statusLine.textContent = "Сохранено: " + displayDate(date);
    renderCalendar();
  }

  function renderCalendar() {
    title.textContent = months[current.getMonth()] + " " + current.getFullYear();
    grid.innerHTML = "";
    var first = new Date(current.getFullYear(), current.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(first); start.setDate(first.getDate() - offset);
    var today = key(new Date());
    for (var index = 0; index < 42; index += 1) {
      var date = new Date(start); date.setDate(start.getDate() + index);
      var dateKey = key(date); var state = statuses[dateKey] || "available";
      var button = document.createElement("button"); button.type = "button"; button.className = "calendar-day " + state;
      if (date.getMonth() !== current.getMonth()) button.className += " outside";
      if (dateKey === today) button.className += " today";
      if (sources[dateKey] === "booking") button.className += " from-booking";
      button.textContent = String(date.getDate());
      button.title = sources[dateKey] === "booking" ? "Подтверждённая бронь" : (state === "available" ? "Свободно" : "Закрыто вручную");
      button.addEventListener("click", function (value) { return function () { saveDate(value, statuses[value] === "booked" ? "" : "booked").catch(function (error) { statusLine.textContent = error.message; }); }; }(dateKey));
      grid.appendChild(button);
    }
  }

  async function loadMonth() {
    statusLine.textContent = "Загружаем даты…";
    var range = rangeForMonth(current);
    var data = await responseJson(await fetch("/api/availability?from=" + range.from + "&to=" + range.to));
    statuses = {}; sources = {};
    data.dates.forEach(function (item) { statuses[item.date] = item.status; sources[item.date] = item.source || "manual"; });
    statusLine.textContent = ""; renderCalendar();
  }

  function renderSummary() {
    var counts = { new: 0, confirmed: 0, paid: 0, upcoming: 0 };
    var today = key(new Date());
    bookings.forEach(function (item) { if (counts[item.status] != null) counts[item.status] += 1; if ((item.status === "confirmed" || item.status === "paid") && item.checkIn >= today) counts.upcoming += 1; });
    bookingSummary.innerHTML = [
      [counts.new, "новых заявок"], [counts.confirmed, "подтверждено"], [counts.paid, "оплачено"], [counts.upcoming, "будущих заездов"]
    ].map(function (item) { return '<div class="summary-card"><strong>' + item[0] + '</strong><span>' + item[1] + '</span></div>'; }).join("");
  }

  function renderBookings() {
    renderSummary();
    var filter = bookingFilter.value;
    var visible = bookings.filter(function (item) { return !filter || item.status === filter; });
    if (!visible.length) { bookingList.innerHTML = '<div class="booking-empty">Здесь пока нет бронирований с таким статусом.</div>'; return; }
    bookingList.innerHTML = visible.map(function (item) {
      var people = item.adults + " взр." + (item.children ? ", " + item.children + " дет." : "");
      var times = (item.checkinTime || item.checkoutTime) ? " · " + (item.checkinTime || "—") + " / " + (item.checkoutTime || "—") : "";
      return '<article class="booking-card" data-booking-id="' + item.id + '">' +
        '<div class="booking-date">' + escapeHtml(displayDate(item.checkIn)) + '<small>до ' + escapeHtml(displayDate(item.checkOut)) + '</small></div>' +
        '<div><h3 class="booking-name">' + escapeHtml(item.guestName) + '</h3><div class="booking-meta"><span>' + escapeHtml(item.phone) + '</span><span>' + people + '</span><span>' + (item.stayType === "day" ? "без ночлега" : "с ночлегом") + times + '</span><span>' + escapeHtml(sourceNames[item.source] || item.source) + '</span>' + (item.deposit ? '<span>залог ' + money(item.deposit) + '</span>' : '') + (item.total ? '<span>остаток ' + money(Math.max(0, item.total - item.deposit)) + '</span>' : '') + '</div>' +
        (item.notes ? '<p class="booking-note">' + escapeHtml(item.notes) + '</p>' : '') + '</div>' +
        '<div class="booking-side"><span class="booking-number">Заявка №' + item.id + '</span><span class="status-pill status-' + item.status + '">' + statusNames[item.status] + '</span><strong class="booking-price">' + money(item.total) + '</strong><button class="quiet edit-booking" type="button">Открыть</button></div></article>';
    }).join("");
    bookingList.querySelectorAll(".booking-card").forEach(function (card) { card.querySelector(".edit-booking").addEventListener("click", function () { openBooking(Number(card.dataset.bookingId)); }); });
  }

  async function loadBookings() {
    bookingList.innerHTML = '<div class="booking-empty">Загружаем бронирования…</div>';
    var data = await responseJson(await fetch("/api/admin/bookings"));
    bookings = data.bookings || []; renderBookings();
  }

  function field(id) { return document.getElementById(id); }
  function setForm(item) {
    field("booking-id").value = item ? item.id : "";
    field("booking-name").value = item ? item.guestName : "";
    field("booking-phone").value = item ? item.phone : "";
    field("booking-checkin").value = item ? item.checkIn : "";
    field("booking-checkout").value = item ? item.checkOut : "";
    field("booking-adults").value = item ? item.adults : 2;
    field("booking-children").value = item ? item.children : 0;
    field("booking-stay").value = item ? item.stayType : "overnight";
    field("booking-status-field").value = item ? item.status : "new";
    field("booking-checkin-time").value = item ? item.checkinTime : "";
    field("booking-checkout-time").value = item ? item.checkoutTime : "";
    field("booking-deposit").value = item ? item.deposit : 0;
    field("booking-total").value = item ? item.total : 0;
    field("booking-source").value = item ? item.source : "manual";
    field("booking-notes").value = item ? item.notes : "";
    document.getElementById("booking-dialog-title").textContent = item ? "Заявка №" + item.id : "Новая бронь";
    deleteBookingButton.classList.toggle("hidden", !item);
    bookingFormStatus.textContent = "";
  }

  function openBooking(id) { var item = bookings.find(function (booking) { return booking.id === id; }); setForm(item || null); bookingModal.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function closeBooking() { bookingModal.classList.add("hidden"); document.body.style.overflow = ""; }

  function bookingPayload() {
    return { guestName: field("booking-name").value, phone: field("booking-phone").value, checkIn: field("booking-checkin").value, checkOut: field("booking-checkout").value,
      adults: Number(field("booking-adults").value), children: Number(field("booking-children").value), stayType: field("booking-stay").value,
      status: field("booking-status-field").value, checkinTime: field("booking-checkin-time").value, checkoutTime: field("booking-checkout-time").value,
      deposit: Number(field("booking-deposit").value), total: Number(field("booking-total").value), source: field("booking-source").value, notes: field("booking-notes").value };
  }

  bookingForm.addEventListener("submit", async function (event) {
    event.preventDefault(); bookingFormStatus.textContent = "Сохраняем…";
    var id = field("booking-id").value;
    try {
      await responseJson(await fetch(id ? "/api/admin/bookings/" + id : "/api/admin/bookings", { method: id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bookingPayload()) }));
      closeBooking(); await Promise.all([loadBookings(), loadMonth()]);
    } catch (error) { bookingFormStatus.textContent = error.message; }
  });

  deleteBookingButton.addEventListener("click", async function () {
    var id = field("booking-id").value;
    var item = bookings.find(function (booking) { return String(booking.id) === String(id); });
    if (!id || !window.confirm("Удалить заявку" + (item ? " гостя «" + item.guestName + "»" : "") + "? Восстановить её будет нельзя.")) return;
    deleteBookingButton.disabled = true;
    bookingFormStatus.textContent = "Удаляем…";
    try {
      await responseJson(await fetch("/api/admin/bookings/" + id, { method: "DELETE" }));
      closeBooking();
      await Promise.all([loadBookings(), loadMonth()]);
    } catch (error) {
      bookingFormStatus.textContent = error.message;
    } finally {
      deleteBookingButton.disabled = false;
    }
  });

  function showAdmin() { loginCard.classList.add("hidden"); panel.classList.remove("hidden"); logoutButton.classList.remove("hidden"); Promise.all([loadBookings(), loadMonth()]).catch(function (error) { statusLine.textContent = error.message; }); }
  function showLogin() { panel.classList.add("hidden"); logoutButton.classList.add("hidden"); loginCard.classList.remove("hidden"); closeBooking(); }

  loginForm.addEventListener("submit", async function (event) { event.preventDefault(); loginStatus.textContent = "Проверяем пароль…"; try { await responseJson(await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: field("admin-password").value }) })); field("admin-password").value = ""; loginStatus.textContent = ""; showAdmin(); } catch (error) { loginStatus.textContent = error.message; } });
  logoutButton.addEventListener("click", async function () { await fetch("/api/admin/logout", { method: "POST" }); showLogin(); });
  document.getElementById("admin-calendar-prev").addEventListener("click", function () { current = new Date(current.getFullYear(), current.getMonth() - 1, 1); loadMonth(); });
  document.getElementById("admin-calendar-next").addEventListener("click", function () { current = new Date(current.getFullYear(), current.getMonth() + 1, 1); loadMonth(); });
  document.getElementById("add-booking").addEventListener("click", function () { openBooking(0); });
  document.getElementById("booking-close").addEventListener("click", closeBooking);
  bookingModal.addEventListener("click", function (event) { if (event.target === bookingModal) closeBooking(); });
  bookingFilter.addEventListener("change", renderBookings);
  document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !bookingModal.classList.contains("hidden")) closeBooking(); });
  fetch("/api/admin/session").then(function (response) { if (response.ok) showAdmin(); else showLogin(); }).catch(showLogin);
}());
