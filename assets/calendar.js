(function () {
  var form = document.getElementById("availability-search");
  if (!form) return;

  var modal = document.getElementById("calendar-modal");
  var panels = document.getElementById("month-panels");
  var message = document.getElementById("calendar-message");
  var hint = document.getElementById("calendar-selection-hint");
  var checkinLabel = document.getElementById("checkin-label");
  var checkoutLabel = document.getElementById("checkout-label");
  var checkinTrigger = document.getElementById("checkin-trigger");
  var checkoutTrigger = document.getElementById("checkout-trigger");
  var result = document.getElementById("availability-result");
  var resultTitle = document.getElementById("availability-result-title");
  var resultGuests = document.getElementById("availability-result-guests");
  var requestButton = document.getElementById("booking-request-submit");
  var view = new Date();
  view = new Date(view.getFullYear(), view.getMonth(), 1);
  var checkin = "";
  var checkout = "";
  var statuses = {};
  var availabilityCache = {};
  var pendingLoads = {};
  var months = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
  ];
  var weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function key(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function dateFromKey(value) {
    var parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function displayDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(dateFromKey(value));
  }

  function isUnavailable(value) {
    var today = key(new Date());
    return value < today || statuses[value] === "booked" || statuses[value] === "closed";
  }

  function rangeHasUnavailable(from, to) {
    var cursor = dateFromKey(from);
    var end = dateFromKey(to);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor < end) {
      if (isUnavailable(key(cursor))) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  function updateFields() {
    var previousSuccess = document.getElementById("booking-request-success");
    if (previousSuccess) previousSuccess.remove();
    requestButton.disabled = false;
    requestButton.textContent = "Отправить заявку в WhatsApp";
    if (checkin) {
      checkinLabel.textContent = displayDate(checkin);
      checkinTrigger.classList.remove("placeholder");
    } else {
      checkinLabel.textContent = "Выберите дату";
      checkinTrigger.classList.add("placeholder");
    }

    if (checkout) {
      checkoutLabel.textContent = displayDate(checkout);
      checkoutTrigger.classList.remove("placeholder");
    } else {
      checkoutLabel.textContent = "Выберите дату";
      checkoutTrigger.classList.add("placeholder");
    }

    if (!checkin) hint.textContent = "Сначала выберите дату заезда";
    else if (!checkout) hint.textContent = "Теперь выберите дату выезда";
    else hint.textContent = displayDate(checkin) + " — " + displayDate(checkout);
    result.classList.add("hidden");
  }

  function chooseDate(value) {
    message.textContent = "";
    if (!checkin || checkout) {
      checkin = value;
      checkout = "";
    } else if (value <= checkin) {
      checkin = value;
      checkout = "";
    } else if (rangeHasUnavailable(checkin, value)) {
      message.textContent = "В выбранном периоде есть занятый день. Выберите другой выезд.";
      return;
    } else {
      checkout = value;
    }
    updateFields();
    renderMonths();
  }

  function renderMonth(date) {
    var panel = document.createElement("section");
    panel.className = "month-panel";
    var heading = document.createElement("h3");
    heading.textContent = months[date.getMonth()] + " " + date.getFullYear();
    panel.appendChild(heading);

    var week = document.createElement("div");
    week.className = "calendar-weekdays";
    weekdays.forEach(function (name) {
      var span = document.createElement("span");
      span.textContent = name;
      week.appendChild(span);
    });
    panel.appendChild(week);

    var grid = document.createElement("div");
    grid.className = "calendar-grid";
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    for (var blank = 0; blank < offset; blank += 1) {
      var empty = document.createElement("span");
      empty.className = "month-day empty";
      grid.appendChild(empty);
    }

    var total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (var day = 1; day <= total; day += 1) {
      var value = key(new Date(date.getFullYear(), date.getMonth(), day));
      var button = document.createElement("button");
      button.type = "button";
      button.className = "month-day";
      button.textContent = String(day);
      button.setAttribute("aria-label", displayDate(value));
      if (isUnavailable(value)) {
        button.classList.add("booked");
        button.disabled = true;
        button.setAttribute("aria-label", displayDate(value) + ", занято");
      } else {
        if (value === checkin || value === checkout) button.classList.add("range-edge");
        else if (checkin && checkout && value > checkin && value < checkout) button.classList.add("in-range");
        button.addEventListener("click", function (dateValue) {
          return function () { chooseDate(dateValue); };
        }(value));
      }
      grid.appendChild(button);
    }
    panel.appendChild(grid);
    return panel;
  }

  function renderMonths() {
    panels.innerHTML = "";
    panels.appendChild(renderMonth(view));
    panels.appendChild(renderMonth(new Date(view.getFullYear(), view.getMonth() + 1, 1)));
  }

  function visibleRange() {
    var from = key(new Date(view.getFullYear(), view.getMonth(), 1));
    var to = key(new Date(view.getFullYear(), view.getMonth() + 2, 0));
    return { from: from, to: to, cacheKey: from + "|" + to };
  }

  function applyAvailability(dates) {
    statuses = {};
    dates.forEach(function (item) {
      statuses[item.date] = item.status;
    });
    updateFields();
    renderMonths();
  }

  async function loadMonths() {
    var range = visibleRange();
    if (availabilityCache[range.cacheKey]) {
      applyAvailability(availabilityCache[range.cacheKey]);
      return;
    }
    if (pendingLoads[range.cacheKey]) return pendingLoads[range.cacheKey];
    hint.textContent = "Загружаем свободные даты…";
    var task = fetch("/api/availability?from=" + range.from + "&to=" + range.to)
      .then(function (response) { if (!response.ok) throw new Error("load"); return response.json(); })
      .then(function (data) { return data.dates || []; });
    pendingLoads[range.cacheKey] = task;
    try {
      var dates = await task;
      availabilityCache[range.cacheKey] = dates;
      if (visibleRange().cacheKey === range.cacheKey) applyAvailability(dates);
    } catch (error) {
      if (visibleRange().cacheKey === range.cacheKey) hint.textContent = "Не удалось загрузить даты. Попробуйте ещё раз.";
    } finally {
      delete pendingLoads[range.cacheKey];
    }
  }

  function openCalendar() {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    loadMonths();
  }

  function closeCalendar() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    checkinTrigger.focus();
  }

  checkinTrigger.addEventListener("click", openCalendar);
  checkoutTrigger.addEventListener("click", openCalendar);
  document.getElementById("calendar-close").addEventListener("click", closeCalendar);
  document.getElementById("public-calendar-prev").addEventListener("click", function () {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    loadMonths();
  });
  document.getElementById("public-calendar-next").addEventListener("click", function () {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    loadMonths();
  });

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeCalendar();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeCalendar();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    message.textContent = "";
    if (!checkin || !checkout) {
      message.textContent = "Выберите дату заезда и дату выезда.";
      openCalendar();
      return;
    }
    if (rangeHasUnavailable(checkin, checkout)) {
      message.textContent = "В этом периоде появилась занятая дата. Выберите другой период.";
      return;
    }
    var adults = document.getElementById("adult-count");
    var children = document.getElementById("child-count");
    resultTitle.textContent = displayDate(checkin) + " — " + displayDate(checkout);
    resultGuests.textContent = adults.options[adults.selectedIndex].text + ", " + children.options[children.selectedIndex].text.toLowerCase();
    result.classList.remove("hidden");
    message.textContent = "Даты свободны. Заполните ФИО и телефон ниже.";
    window.setTimeout(function () {
      result.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("request-name").focus({ preventScroll: true });
    }, 50);
  });

  requestButton.addEventListener("click", async function () {
    var name = document.getElementById("request-name").value.trim();
    var phone = document.getElementById("request-phone").value.trim();
    if (!name || phone.length < 6) {
      message.textContent = "Укажите полностью фамилию, имя, отчество и номер телефона.";
      return;
    }
    requestButton.disabled = true;
    requestButton.textContent = "Отправляем…";
    message.textContent = "";
    var adultCount = Number(document.getElementById("adult-count").value);
    var childCount = Number(document.getElementById("child-count").value);
    var staySelect = document.getElementById("request-stay");
    var stayLabel = staySelect.options[staySelect.selectedIndex].text;
    var notes = document.getElementById("request-notes").value.trim();
    var bookingPayload = {
      guestName: name,
      phone: phone,
      checkIn: checkin,
      checkOut: checkout,
      adults: adultCount,
      children: childCount,
      stayType: staySelect.value,
      checkinTime: "13:00",
      checkoutTime: "10:30",
      notes: notes
    };
    try {
      var response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bookingPayload)
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Не удалось отправить заявку");
      var success = document.createElement("div");
      success.id = "booking-request-success";
      success.className = "request-success";
      success.innerHTML = '<strong>Заявка №' + (data.id || "") + ' отправлена</strong><p>Владелец увидит её в админке и свяжется с вами для подтверждения.</p>';
      result.insertBefore(success, result.firstChild);
      requestButton.textContent = "Заявка отправлена";
      var whatsappMessage = [
        "Здравствуйте! Новая заявка с сайта «Прохлада».",
        data.id ? "Заявка №" + data.id : "",
        "ФИО: " + name,
        "Телефон: " + phone,
        "Заезд: " + displayDate(checkin) + ", с 13:00",
        "Выезд: " + displayDate(checkout) + ", до 10:30",
        "Гости: " + adultCount + " взрослых, " + childCount + " детей",
        "Формат: " + stayLabel,
        "Комментарий: " + (notes || "нет")
      ].filter(Boolean).join("\n");
      window.location.assign("https://wa.me/79673999188?text=" + encodeURIComponent(whatsappMessage));
    } catch (error) {
      message.textContent = error.message;
      requestButton.disabled = false;
      requestButton.textContent = "Отправить заявку в WhatsApp";
    }
  });

  updateFields();
  var prefetchCalendar = function () { loadMonths(); };
  if ("requestIdleCallback" in window) window.requestIdleCallback(prefetchCalendar, { timeout: 800 });
  else window.setTimeout(prefetchCalendar, 150);
}());
