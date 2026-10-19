import { useEffect, useState, type FormEvent, type SyntheticEvent } from 'react'
import { ArrowDownRight, ArrowRight, Bean, Check, Clock3, Coffee, Instagram, MapPin, Menu, Truck, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget
  if (image.dataset.fallbackApplied === 'true') {
    image.style.display = 'none'
    return
  }
  image.dataset.fallbackApplied = 'true'
  image.src = '/images/coffee-colombia.jpg'
}

const coffees = [
  { no: '01', origin: 'Эфиопия · Иргачеффе', name: 'Цветочный день', notes: 'Бергамот, жасмин, спелый персик', roast: 'Светлая обжарка', price: '32', image: '/images/coffee-ethiopia.jpg' },
  { no: '02', origin: 'Колумбия · Уила', name: 'Тихое утро', notes: 'Карамель, красное яблоко, какао', roast: 'Под фильтр и воронку', price: '29', image: '/images/coffee-colombia.jpg' },
  { no: '03', origin: 'Бразилия · Серрадо', name: 'После обеда', notes: 'Фундук, тёмный шоколад, пралине', roast: 'Отлично под эспрессо', price: '26', image: '/images/coffee-brazil.jpg' },
]

type Interest = 'subscription' | 'one_time' | 'question'

function normalizeBelarusPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')

  // Международный формат: +375291234567
  if (digits.startsWith('375') && digits.length === 12) {
    return `+${digits}`
  }

  // Внутренний формат Беларуси: 80291234567
  if (digits.startsWith('80') && digits.length === 11) {
    return `+375${digits.slice(2)}`
  }

  return null
}

type Touch = {
  page_url: string
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  gclid: string | null
  yclid: string | null
  captured_at: string
}

type StoredTracking = {
  first_touch: Touch
  last_touch: Touch
}

const TRACKING_STORAGE_KEY = 'kvarta_attribution_v1'

function getCurrentTouch(): Touch {
  const params = new URLSearchParams(window.location.search)

  return {
    page_url: window.location.href,
    referrer: document.referrer || null,
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    gclid: params.get('gclid'),
    yclid: params.get('yclid'),
    captured_at: new Date().toISOString(),
  }
}

function hasAttribution(touch: Touch): boolean {
  const hasAdParams = Boolean(
    touch.utm_source ||
    touch.utm_medium ||
    touch.utm_campaign ||
    touch.utm_content ||
    touch.utm_term ||
    touch.gclid ||
    touch.yclid,
  )

  if (hasAdParams) return true
  if (!touch.referrer) return false

  try {
    return new URL(touch.referrer).origin !== window.location.origin
  } catch {
    return false
  }
}

function captureTracking(): StoredTracking {
  const current = getCurrentTouch()
  let stored: StoredTracking | null = null

  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as StoredTracking
  } catch {
    // Если данные повреждены или хранилище недоступно,
    // начнём отслеживание заново.
  }

  if (!stored?.first_touch || !stored?.last_touch) {
    stored = {
      first_touch: current,
      last_touch: current,
    }
  } else if (hasAttribution(current)) {
    // Обновляем last-touch только при рекламных метках
    // или переходе с другого сайта.
    stored.last_touch = current
  }

  try {
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Заявка всё равно должна отправляться, даже если
    // браузер запрещает использование localStorage.
  }

  return stored
}

function getTracking() {
  const stored = captureTracking()
  const first = stored.first_touch
  const last = stored.last_touch

  return {
    // Данные последнего рекламного перехода.
    page_url: window.location.href,
    referrer: last.referrer,
    utm_source: last.utm_source,
    utm_medium: last.utm_medium,
    utm_campaign: last.utm_campaign,
    utm_content: last.utm_content,
    utm_term: last.utm_term,
    gclid: last.gclid,
    yclid: last.yclid,
    last_touch_page_url: last.page_url,
    last_touch_at: last.captured_at,

    // Данные первого посещения.
    first_page_url: first.page_url,
    first_referrer: first.referrer,
    first_utm_source: first.utm_source,
    first_utm_medium: first.utm_medium,
    first_utm_campaign: first.utm_campaign,
    first_utm_content: first.utm_content,
    first_utm_term: first.utm_term,
    first_gclid: first.gclid,
    first_yclid: first.yclid,
    first_touch_at: first.captured_at,
  }
}


export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState<Interest>('subscription')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
  captureTracking()
}, [])
  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)
    const normalizedPhone = normalizeBelarusPhone(phone)

    if (!normalizedPhone) {
      setStatus({
        type: 'error',
        message: 'Введите корректный белорусский номер телефона, например +375 29 123-45-67.',
      })
      return
  }
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: normalizedPhone, interest, comment: comment || null, ...getTracking() }),
      })
      const result = await response.json()
      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item: { msg?: string }) => item.msg?.replace('Value error, ', '')).filter(Boolean).join(' ')
          : result.detail
        throw new Error(detail || 'Не удалось отправить форму. Напишите нам или позвоните напрямую.')
      }
      setStatus({ type: 'success', message: result.message || 'Спасибо за заявку! Скоро свяжемся и ответим на все вопросы.' })
      setName('')
      setPhone('')
      setComment('')
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error && error.message !== 'Failed to fetch'
          ? error.message
          : 'Проблема с подключением. Попробуйте еще раз или свяжитесь с нами напрямую.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function chooseInterest(value: Interest) {
    setInterest(value)
    document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <div className="topline">
        <span>МИНСК · МАСТЕРСКАЯ АНИ И ДИМЫ</span>
        <span>ОБЖАРИВАЕМ ПО ЧЕТВЕРГАМ · ДОСТАВЛЯЕМ ПО ПЯТНИЦАМ <Bean size={13} /></span>
      </div>

      <header className="header">
        <a className="brand" href="#top" aria-label="Кварта — на главную">
          <span className="brand-mark">к.</span>
          <span>кварта<small>кофе без спешки</small></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
          <a href="#coffee" onClick={() => setMenuOpen(false)}>Выбрать кофе</a>
          <a href="#subscription" onClick={() => setMenuOpen(false)}>Подписка</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>Кто мы</a>
          <a href="#delivery" onClick={() => setMenuOpen(false)}>Доставка</a>
          <a className="nav-cta" href="#request" onClick={() => setMenuOpen(false)}>Связаться с нами <ArrowRight size={15} /></a>
        </nav>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> СВЕЖЕСТЬ — НАШ ГЛАВНЫЙ ИНГРЕДИЕНТ</div>
            <h1>Обжариваем в четверг.<br /><em>В пятницу у вас.</em></h1>
            <p className="hero-text">
              Мы Аня и Дмитрий. С 2019 года обжариваем зерно небольшими партиями по 5 кг, чтобы вы пили кофе на 1–3 день после обжарки — когда его вкус раскрывается ярче всего.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#coffee">Выбрать свежее зерно <ArrowRight size={17} /></a>
              <a className="text-link" href="#about">О нашей мастерской <ArrowDownRight size={17} /></a>
            </div>
            <div className="hero-foot">
              <span><span className="dot" /> С 2019 ГОДА В МИНСКЕ</span>
              <span>ПАРТИИ СТРОГО ПО 5 КГ</span>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/images/hero-coffee.jpg" onError={handleImageError} alt="Свежеобжаренное зерно" />
            <div className="photo-stamp"><span>roasted</span><strong>THURSDAY</strong><span>delivered friday · minsk</span></div>
            <div className="hero-caption"><span>01 / 03</span><span>ОТ РОСТЕРА ДО КУХНИ ЗА 24 ЧАСА</span></div>
          </div>
          <div className="hero-side-note">МАЛЕНЬКАЯ ОБЖАРКА · НАСТОЯЩИЙ ВКУС</div>
        </section>

        {/* FRESH STRIP */}
        <section className="fresh-strip">
          <div className="fresh-icon"><Clock3 size={21} /></div>
          <p><strong>1–3 дня после ростера.</strong> Кофе попадает к вам пике своей свежести, а не спустя месяцы на полке.</p>
          <span>ЧЕСТНАЯ СВЕЖЕСТЬ</span>
        </section>

        {/* COFFEE LIST */}
        <section className="section coffee-section" id="coffee">
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 — СВЕЖИЙ УРОЖАЙ</div>
              <h2>Зерно,<br /><em>готовое к обжарке.</em></h2>
            </div>
            <p>Три понятных сорта, которые мы отобрали лично. Без сложных терминов — только вкусная классика и спешелти.</p>
          </div>

          <div className="coffee-grid">
            {coffees.map((coffee) => (
              <article className="coffee-card" key={coffee.no}>
                <div className="coffee-photo">
                  <img src={coffee.image} onError={handleImageError} alt={`Кофе ${coffee.origin}`} loading="lazy" />
                  <span className="coffee-number">{coffee.no}</span>
                  <span className="weight-tag">250 Г</span>
                </div>
                <div className="coffee-meta">{coffee.origin}</div>
                <h3>{coffee.name}</h3>
                <p className="coffee-notes">{coffee.notes}</p>
                <div className="coffee-bottom">
                  <span>{coffee.roast}</span>
                  <strong>{coffee.price} <small>BYN</small></strong>
                </div>
                <button className="card-order" onClick={() => { setInterest('one_time'); setComment(`Заказ зерна: ${coffee.origin} — ${coffee.name}`); document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' }) }}>
                  Заказать пачку <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>

          {/* ДРИП-ПАКЕТЫ КАК ТОВАР */}
          <div className="drip-row">
            <div className="drip-icon"><Coffee size={28} /></div>
            <div>
              <span className="eyebrow">ТОВАР В НАЛИЧИИ · НАБОР 10 ШТ</span>
              <h3>Дрип-пакеты «Ассорти»</h3>
              <p>Наш свежеобжаренный кофе в удобном формате. Нужна только чашка и кипяток — дома, в офисе или в поездке.</p>
            </div>
            <div className="drip-purchase">
              <strong className="drip-price">18  <small>BYN </small></strong>
              <button className="button button-dark" onClick={() => { setInterest('one_time'); setComment('Заказ: Дрип-пакеты "Ассорти" (10 шт)'); document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' }) }}>
                Купить набор <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* SUBSCRIPTION */}
        <section className="subscription-section" id="subscription">
          <div className="subscription-art">
            <img src="/images/subscription.jpg" onError={handleImageError} alt="Кофейная подписка" loading="lazy" />
            <span className="art-note">свежее зерно<br />без забот</span>
          </div>
          <div className="subscription-copy">
            <div className="eyebrow">02 — РЕГУЛЯРНАЯ ДОСТАВКА</div>
            <h2>Чтобы дома<br />всегда был <em>свежий кофе.</em></h2>
            <p>Две пачки зерна раз в месяц. Мы сами обжарим их в ближайший четверг и привезем вам в пятницу. Доставка включена.</p>
            <div className="subscription-price"><strong>54 <small>BYN</small></strong><span>/ месяц</span></div>
            <ul>
              <li><Check size={17} /> Две пачки свежей обжарки (500 г)</li>
              <li><Check size={17} /> Бесплатная курьерская доставка по Минску</li>
              <li><Check size={17} /> Подберем помол под ваш способ заваривания</li>
            </ul>
            <button className="button button-light" onClick={() => chooseInterest('subscription')}>
              Оформить подписку <ArrowRight size={17} />
            </button>
            <span className="subscription-footnote">Без автоматических списаний — сначала свяжемся и всё уточним.</span>
          </div>
        </section>

        {/* ABOUT */}
        <section className="about-section section" id="about">
          <div className="about-intro">
            <div className="eyebrow">03 — ОСТАЛИСЬ ВЕРНЫ ВКУСУ</div>
            <h2>От бариста<br />до своей <em>мастерской.</em></h2>
          </div>
          <div className="about-body">
            <p className="about-lead">
              Мы прошли путь от бариста за стойкой до собственной обжарки. В ресторанах и кофейнях мы постоянно замечали одну проблему: кофе часто лежал на складах месяцами, выдыхался и терял вкус.
            </p>
            <p>
              Поэтому в 2019 году мы с Димой запустили «Кварту». Мы специально держим камерный формат: обжариваем партиями ровно по 5 кг. Это позволяет нам вручную контролировать каждый килограмм и привозить вам зерно пиковой свежести.
            </p>
            <div className="about-signature">
              <span className="signature-mark">а + д</span>
              <span>Аня и Дмитрий<br /><small>основатели «Кварты»</small></span>
            </div>
          </div>
          <div className="about-photo">
            <img src="/images/workshop.jpg" onError={handleImageError} alt="Аня и Дима в мастерской" loading="lazy" />
            <span className="photo-label">НАША МАСТЕРСКАЯ В МИНСКЕ</span>
          </div>
        </section>

        {/* DELIVERY */}
        <section className="delivery-section" id="delivery">
          <div className="delivery-title">
            <div className="eyebrow">04 — ПОНЯТНАЯ ЛОГИСТИКА</div>
            <h2>Как кофе<br /><em>доедет до вас.</em></h2>
          </div>
          <div className="delivery-options">
            <article>
              <span className="delivery-symbol"><Truck /></span>
              <div className="eyebrow">КАЖДУЮ ПЯТНИЦУ</div>
              <h3>Доставка курьером по Минску</h3>
              <p>Развозим свежую обжарку на следующий день после ростера. При заказе от 50 BYN — бесплатно.</p>
            </article>
            <article>
              <span className="delivery-symbol"><MapPin /></span>
              <div className="eyebrow">САМОВЫВОЗ</div>
              <h3>Заглянуть к нам в мастерскую</h3>
              <p>Минск, ул. Короля, 9. Встретим, покажем обжарочный цех и отдадим заказ. Пн–Пт 8:00–20:00, Сб–Вс 10:00–18:00.</p>
            </article>
          </div>
        </section>

        {/* FORM */}
        <section className="request-section" id="request">
  <div className="request-copy">
    <div className="eyebrow">05 — НА СВЯЗИ</div>
    <h2>Поможем выбрать<br /><em>ваш кофе.</em></h2>
    <p>
      Сомневаетесь с сортом или не знаете, какой помол подойдет для вашей турки или воронки? Оставьте номер — наш менеджер свяжется с вами, ответит на все вопросы и аккуратно оформит заказ. Никаких автозвонков и спама.
    </p>
    <div className="request-contact">
      <span>ЖДЕМ В ГОСТИ</span>
      <strong><MapPin size={17} /> Минск, ул. Короля, 9</strong>
      <span>ПН–ПТ 8:00–20:00 · СБ–ВС 10:00–18:00</span>
      <a href="https://instagram.com/" target="_blank" rel="noreferrer"><Instagram size={16} /> Наш Instagram</a>
    </div>
  </div>

  <form className="lead-form" onSubmit={submitLead}>
    <div className="form-top">
      <span>ОБРАТНАЯ СВЯЗЬ</span>
      <span>ОТВЕЧАЕМ В ТЕЧЕНИЕ ДНЯ</span>
    </div>
    <label>Имя<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Как к вам обращаться?" autoComplete="name" /></label>
    <label>Телефон<input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" maxLength={32} placeholder="+375 29 123-45-67" autoComplete="tel" /></label>
    <fieldset>
      <legend>Что вас заинтересовало?</legend>
      <div className="interest-options">
        <button type="button" className={interest === 'subscription' ? 'interest active' : 'interest'} onClick={() => setInterest('subscription')}>Подписка</button>
        <button type="button" className={interest === 'one_time' ? 'interest active' : 'interest'} onClick={() => setInterest('one_time')}>Разовый заказ</button>
        <button type="button" className={interest === 'question' ? 'interest active' : 'interest'} onClick={() => setInterest('question')}>Просто вопрос</button>
      </div>
    </fieldset>
    <label>Комментарий <span className="optional">необязательно</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} placeholder="Укажите нужный помол или вопрос по сорту…" /></label>
    {status && <div className={status.type === 'success' ? 'form-status success' : 'form-status error'} role="status">{status.message}</div>}
    <button className="button button-dark form-submit" type="submit" disabled={submitting}>
      {submitting ? 'Отправка…' : 'Отправить заявку'} <ArrowRight size={17} />
    </button>
    <p className="privacy-note">Мы ценим личные границы: связываемся только по делу и не передаем контакты третьим лицам.</p>
  </form>
</section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark">к.</span><span>кварта<small>кофе без спешки</small></span></a>
        <span>МАЛЕНЬКАЯ ОБЖАРКА · БОЛЬШАЯ ЛЮБОВЬ К КОФЕ</span>
        <a href="#top">НАВЕРХ ↑</a>
        <span>МИНСК · 2019—2026</span>
      </footer>
    </div>
  )
}