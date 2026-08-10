(function () {
  var grid = document.getElementById("public-calendar-grid");
  if (!grid) return;

  var title = document.getElementById("public-calendar-title");
  var message = document.getElementById("calendar-message");
  var selectedLabel = document.getElementById("selected-date-label");
  var contact = document.getElementById("selected-date-contact");
  var current = new Date();
  current = new Date(current.getFullYear(), current.getMonth(), 1);
  var selected = "";
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

  function rangeForMonth(date) {
    var from = new Date(date.getFullYear(), date.getMonth(), 1);
    var to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { from: key(from), to: key(to) };
  }

  function displayDate(value) {
    var parts = value.split("-").map(Number);
    return parts[2] + " " + fullMonths[parts[1] - 1] + " " + parts[0];
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
      var status = statuses[dateKey] || "closed";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day " + status;
      if (date.getMonth() !== current.getMonth()) button.className += " outside";
      if (dateKey === today) button.className += " today";
      if (dateKey === selected) button.className += " selected";
      button.textContent = String(date.getDate());
      button.setAttribute("aria-label", displayDate(dateKey) + (status === "available" ? ", свободно" : ", недоступно"));
      if (status === "available") {
        button.addEventListener("click", function (value) {
          return function () {
            selected = value;
            selectedLabel.textContent = displayDate(value);
            contact.removeAttribute("aria-disabled");
            contact.classList.remove("disabled");
            message.textContent = "Дата выбрана. Уточните окончательное подтверждение у владельца.";
            render();
          };
        }(dateKey));
      } else {
        button.disabled = true;
      }
      grid.appendChild(button);
    }
  }

  async function load() {
    message.textContent = "Загружаем свободные даты…";
    var range = rangeForMonth(current);
    try {
      var response = await fetch("/api/availability?from=" + range.from + "&to=" + range.to);
      if (!response.ok) throw new Error("load");
      var data = await response.json();
      statuses = {};
      data.dates.forEach(function (item) {
        statuses[item.date] = item.status;
      });
      message.textContent = "";
      render();
    } catch (error) {
      message.textContent = "Не удалось загрузить календарь. Попробуйте обновить страницу.";
    }
  }

  document.getElementById("public-calendar-prev").addEventListener("click", function () {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    selected = "";
    load();
  });

  document.getElementById("public-calendar-next").addEventListener("click", function () {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    selected = "";
    load();
  });

  contact.addEventListener("click", function (event) {
    if (!selected) {
      event.preventDefault();
      message.textContent = "Сначала выберите свободную дату.";
    }
  });

  load();
}());
