(function () {
  var money = new Intl.NumberFormat("ru-RU");

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  fetch("/api/pricing", { cache: "no-store", headers: { accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("Pricing unavailable");
      return response.json();
    })
    .then(function (pricing) {
      setText('[data-price="day"]', money.format(pricing.dayPrice) + " ₽");
      setText('[data-price="day-guests"]', "до " + pricing.dayGuests + " гостей");
      setText('[data-price="day-extra"]', "+ " + money.format(pricing.dayExtra) + " ₽ за следующего гостя");
      setText('[data-price="overnight"]', money.format(pricing.overnightPrice) + " ₽");
      setText('[data-price="overnight-guests"]', "до " + pricing.overnightGuests + " гостей");
      setText('[data-price="overnight-extra"]', "+ " + money.format(pricing.overnightExtra) + " ₽ за следующего гостя");
    })
    .catch(function () {
      // Keep the default prices when the API is temporarily unavailable.
    });
}());