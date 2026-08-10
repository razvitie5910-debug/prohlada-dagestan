const instagramUrl = "https://www.instagram.com/prohlada.dagestan/";
const phoneUrl = "tel:+79673999188";

const amenities = [
  {
    number: "01",
    title: "Коттеджи у воды",
    text: "Уютные дома с видом на водопад и 20 комфортными спальными местами.",
  },
  {
    number: "02",
    title: "Бассейны",
    text: "Большой бассейн с водопадом и отдельный безопасный бассейн для детей.",
  },
  {
    number: "03",
    title: "Баня и чан",
    text: "Банный комплекс и лечебный чан для глубокого отдыха в любое время года.",
  },
  {
    number: "04",
    title: "Всё для застолья",
    text: "Просторные беседки, топчан, мангальная зона, очаг и необходимая посуда.",
  },
  {
    number: "05",
    title: "Для всей семьи",
    text: "Качели, детская площадка, шезлонги и волейбольная площадка.",
  },
  {
    number: "06",
    title: "Полная приватность",
    text: "Вся большая территория — только для вашей компании, без посторонних.",
  },
];

const prices = [
  {
    eyebrow: "День на территории",
    title: "Без ночлега",
    price: "15 000 ₽",
    note: "до 10 гостей",
    extra: "+ 500 ₽ за каждого следующего гостя",
  },
  {
    eyebrow: "Отдых с размещением",
    title: "С ночлегом",
    price: "15 000 ₽",
    note: "до 5 гостей",
    extra: "+ 1 000 ₽ за каждого следующего гостя",
    featured: true,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Прохлада — на главную">
          <span className="brand-mark" aria-hidden="true">✣</span>
          <span>
            <strong>ПРОХЛАДА</strong>
            <small>ГОСТЕВОЙ ДОМ · ДАГЕСТАН</small>
          </span>
        </a>

        <nav aria-label="Основная навигация">
          <a href="#about">О месте</a>
          <a href="#amenities">Удобства</a>
          <a href="#prices">Цены</a>
          <a href="#contacts">Контакты</a>
        </nav>

        <a className="header-cta" href={phoneUrl}>
          Забронировать
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Приватный отдых на природе</p>
          <h1>
            Место, где
            <em>становится тише</em>
          </h1>
          <p className="hero-lead">
            Гостевой дом «Прохлада» — отдельная территория с коттеджами,
            бассейном и водопадом для отдыха в кругу близких.
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href={phoneUrl}>
              Узнать свободные даты <ArrowIcon />
            </a>
            <a className="text-link" href="#prices">
              Посмотреть цены <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-facts" aria-label="Ключевые преимущества">
            <div>
              <strong>20</strong>
              <span>спальных мест</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>территории для вас</span>
            </div>
            <div>
              <strong>2</strong>
              <span>бассейна</span>
            </div>
          </div>
        </div>

        <div className="hero-media">
          <img
            src="/prohlada-cottage.png"
            alt="Коттедж гостевого дома Прохлада у бассейна с водопадом"
          />
          <div className="hero-badge">
            <span>Вода</span>
            <strong>Свежая и чистая</strong>
          </div>
          <div className="hero-caption">
            <span>Гостевой дом</span>
            <strong>«Прохлада»</strong>
          </div>
        </div>
      </section>

      <section className="intro" id="about">
        <p className="section-kicker">О месте</p>
        <div className="intro-grid">
          <h2>Отдых без соседей, суеты и лишних планов</h2>
          <div className="intro-copy">
            <p>
              Здесь можно собрать семью или друзей и на время получить целое
              пространство только для себя: плавать, готовить на огне, париться
              в бане и слушать воду и птиц.
            </p>
            <p>
              Мы собрали всё необходимое на одной территории, чтобы вам
              оставалось только выбрать дату и приехать.
            </p>
          </div>
        </div>
        <div className="values">
          <div>
            <span aria-hidden="true">◇</span>
            <strong>Приватность</strong>
            <p>Никаких посторонних на территории во время вашего отдыха.</p>
          </div>
          <div>
            <span aria-hidden="true">≋</span>
            <strong>Живая вода</strong>
            <p>Бассейн с водопадом и свежей чистой водой.</p>
          </div>
          <div>
            <span aria-hidden="true">♨</span>
            <strong>Тепло круглый год</strong>
            <p>Баня, лечебный чан и уютные коттеджи.</p>
          </div>
          <div>
            <span aria-hidden="true">⌂</span>
            <strong>Для большой компании</strong>
            <p>До 20 комфортных спальных мест.</p>
          </div>
        </div>
      </section>

      <section className="amenities-section" id="amenities">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Всё включено в отдых</p>
            <h2>Одна территория.<br />Много сценариев.</h2>
          </div>
          <p>
            От спокойного дня у воды до большого семейного праздника —
            пространство легко подстраивается под вашу компанию.
          </p>
        </div>

        <div className="amenities-grid">
          {amenities.map((item) => (
            <article className="amenity-card" key={item.number}>
              <span>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <div className="feature-image" role="img" aria-label="Водопад у бассейна гостевого дома Прохлада" />
        <div className="feature-copy">
          <p className="section-kicker">Главное впечатление</p>
          <h2>Свой маленький водопад</h2>
          <p>
            Вода задаёт ритм всему пространству: освежает днём, успокаивает
            вечером и создаёт ту самую атмосферу «Прохлады».
          </p>
          <ul>
            <li>бассейн с пресной чистой водой</li>
            <li>отдельная зона для детей</li>
            <li>шезлонги и места для отдыха рядом</li>
          </ul>
        </div>
      </section>

      <section className="pricing" id="prices">
        <div className="section-heading pricing-heading">
          <div>
            <p className="section-kicker">Простые условия</p>
            <h2>Стоимость всей территории</h2>
          </div>
          <p>
            Без скрытых доплат за отдельные зоны. Актуальность цены и
            свободные даты уточняйте при бронировании.
          </p>
        </div>

        <div className="price-grid">
          {prices.map((item) => (
            <article
              className={`price-card${item.featured ? " featured" : ""}`}
              key={item.title}
            >
              <p className="price-eyebrow">{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <div className="price-value">{item.price}</div>
              <p className="price-note">{item.note}</p>
              <div className="price-divider" />
              <p>{item.extra}</p>
              <a href={phoneUrl}>
                Выбрать дату <ArrowIcon />
              </a>
            </article>
          ))}
          <article className="capacity-card">
            <p className="price-eyebrow">Размещение</p>
            <strong>20</strong>
            <h3>комфортных<br />спальных мест</h3>
            <p>Для большой семьи, компании друзей или камерного события.</p>
          </article>
        </div>
      </section>

      <section className="booking" id="contacts">
        <div>
          <p className="section-kicker">Бронирование</p>
          <h2>Ваш отдых начинается с одной даты</h2>
          <p>
            Позвоните или напишите в Instagram — расскажем о свободных датах,
            ответим на вопросы и поможем всё спланировать.
          </p>
        </div>
        <div className="booking-actions">
          <a className="button button-light" href={phoneUrl}>
            +7 967 399-91-88 <ArrowIcon />
          </a>
          <a
            className="button button-outline"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            @prohlada.dagestan <ArrowIcon />
          </a>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">✣</span>
          <span>
            <strong>ПРОХЛАДА</strong>
            <small>ГОСТЕВОЙ ДОМ · ДАГЕСТАН</small>
          </span>
        </a>
        <p>Уют · комфорт · полный отдых</p>
        <a href={instagramUrl} target="_blank" rel="noreferrer">
          Instagram <ArrowIcon />
        </a>
      </footer>
    </main>
  );
}
