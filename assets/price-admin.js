(function () {
  var password = "";
  var loginCard = document.getElementById("login-card");
  var priceCard = document.getElementById("price-card");
  var loginForm = document.getElementById("login-form");
  var priceForm = document.getElementById("price-form");
  var loginStatus = document.getElementById("login-status");
  var saveStatus = document.getElementById("save-status");

  function field(id) { return document.getElementById(id); }

  async function readJson(response) {
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Не удалось выполнить действие");
    return data;
  }

  function fill(pricing) {
    field("day-price").value = pricing.dayPrice;
    field("day-guests").value = pricing.dayGuests;
    field("day-extra").value = pricing.dayExtra;
    field("overnight-price").value = pricing.overnightPrice;
    field("overnight-guests").value = pricing.overnightGuests;
    field("overnight-extra").value = pricing.overnightExtra;
  }

  async function loadPricing() {
    return readJson(await fetch("/api/pricing", { cache: "no-store" }));
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginStatus.textContent = "Проверяем пароль…";
    try {
      password = field("password").value;
      await readJson(await fetch("/api/pricing", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ action: "login" })
      }));
      fill(await loadPricing());
      field("password").value = "";
      loginCard.classList.add("hidden");
      priceCard.classList.remove("hidden");
      loginStatus.textContent = "";
    } catch (error) {
      password = "";
      loginStatus.textContent = error.message;
    }
  });

  priceForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    saveStatus.className = "save-status";
    saveStatus.textContent = "Сохраняем…";
    var payload = {
      dayPrice: Number(field("day-price").value),
      dayGuests: Number(field("day-guests").value),
      dayExtra: Number(field("day-extra").value),
      overnightPrice: Number(field("overnight-price").value),
      overnightGuests: Number(field("overnight-guests").value),
      overnightExtra: Number(field("overnight-extra").value)
    };
    try {
      var pricing = await readJson(await fetch("/api/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify(payload)
      }));
      fill(pricing);
      saveStatus.className = "save-status success";
      saveStatus.textContent = "Цены сохранены и уже обновлены на сайте.";
    } catch (error) {
      saveStatus.className = "save-status error";
      saveStatus.textContent = error.message;
    }
  });
}());