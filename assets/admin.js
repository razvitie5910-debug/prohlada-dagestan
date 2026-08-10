(function () {
  var loginCard = document.getElementById("login-card");
  var loginForm = document.getElementById("login-form");
  var loginStatus = document.getElementById("login-status");
  var panel = document.getElementById("admin-panel");
  var logoutButton = document.getElementById("logout-button");
  var grid = document.getElementById("admin-calendar-grid");
  var title = document.getElementById("admin-calendar-title");
  var statusLine = document.getElementById("admin-status");
  var current = new Date();
  current = new Date(current.getFullYear(), current.getMonth(), 1);
  var statuses = {};
  var months = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
  ];
  var fullMonths = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function key(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function displayDate(value) {
    var parts = value.split("-").map(Number);
    return parts[2] + " " + fullMonths[parts[1] - 1] + " " + parts[0];
  }

  function rangeForMonth(date) {
    return {
      from: key(new Date(date.getFullYear(), date.getMonth(), 1)),
      to: key(new Date(date.getFullYear(), date.getMonth() + 1, 0))
    };
  }

  function nextStatus(status) {
    if (!status) return "available";
    if (status === "available") return "booked";
    return "";
  }

  async function saveDate(date, status) {
    statusLine.textContent = "Сохраняем " + displayDate(date) + "…";
    var response = await fetch("/api/admin/availability", {
      method: status ? "PUT" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: date, status: status })
    });
    if (response.status === 401) {
      showLogin();
      throw new Error("auth");
    }
    if (!response.ok) throw new Error("save");
    if (status) statuses[date] = status;
    else delete statuses[date];
    statusLine.textContent = "Сохранено: " + displayDate(date);
    render();
  }

  function render() {
    title.textContent = months[current.getMonth()] + " " + current.getFullYear();
    grid.innerHTML = "";
    var first = new Date(current.getFullYear(), current.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(first);
    start.setDate(first.getDate() - offset);
    var today = key(new Date());

    for (var index = 0; index < 42; index += 1) {
      var date = new Date(start);
      date.setDate(start.getDate() + index);
      var dateKey = key(date);
      var state = statuses[dateKey] || "closed";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day " + state;
      if (date.getMonth() !== current.getMonth()) button.className += " outside";
      if (dateKey === today) button.className += " today";
      button.textContent = String(date.getDate());
      button.setAttribute("aria-label", displayDate(dateKey) + ", " + (state === "available" ? "свободно" : state === "booked" ? "занято" : "не отмечено"));
      button.addEventListener("click", function (value) {
        return function () {
          saveDate(value, nextStatus(statuses[value])).catch(function () {
            statusLine.textContent = "Не удалось сохранить. Повторите ещё раз.";
          });
        };
      }(dateKey));
      grid.appendChild(button);
    }
  }

  async function loadMonth() {
    statusLine.textContent = "Загружаем даты…";
    var range = rangeForMonth(current);
    var response = await fetch("/api/availability?from=" + range.from + "&to=" + range.to);
    if (!response.ok) throw new Error("load");
    var data = await response.json();
    statuses = {};
    data.dates.forEach(function (item) {
      statuses[item.date] = item.status;
    });
    statusLine.textContent = "";
    render();
  }

  function showAdmin() {
    loginCard.classList.add("hidden");
    panel.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    loadMonth().catch(function () {
      statusLine.textContent = "Не удалось загрузить календарь.";
    });
  }

  function showLogin() {
    panel.classList.add("hidden");
    logoutButton.classList.add("hidden");
    loginCard.classList.remove("hidden");
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginStatus.textContent = "Проверяем пароль…";
    var password = document.getElementById("admin-password").value;
    var response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: password })
    });
    if (!response.ok) {
      loginStatus.textContent = "Неверный пароль.";
      return;
    }
    document.getElementById("admin-password").value = "";
    loginStatus.textContent = "";
    showAdmin();
  });

  logoutButton.addEventListener("click", async function () {
    await fetch("/api/admin/logout", { method: "POST" });
    showLogin();
  });

  document.getElementById("admin-calendar-prev").addEventListener("click", function () {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    loadMonth();
  });

  document.getElementById("admin-calendar-next").addEventListener("click", function () {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    loadMonth();
  });

  fetch("/api/admin/session").then(function (response) {
    if (response.ok) showAdmin();
    else showLogin();
  }).catch(showLogin);
}());
