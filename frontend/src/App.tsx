import { useState, type FormEvent, type SyntheticEvent } from 'react'
import { ArrowDownRight, ArrowRight, Bean, Check, Clock3, Coffee, Instagram, MapPin, Menu, Truck, X } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget

  // If even the fallback image is unavailable, stop retrying.
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
  { no: '03', origin: 'Бразилия · Серрадо', name: 'После обеда', notes: 'Фундук, тёмный шоколад, пралине', roast: 'Хорошо под эспрессо', price: '26', image: '/images/coffee-brazil.jpg' },
]

type Interest = 'subscription' | 'one_time' | 'question'

function getTracking() {
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
  }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState<Interest>('subscription')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, interest, comment: comment || null, ...getTracking() }),
      })
      const result = await response.json()
      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item: { msg?: string }) => item.msg?.replace('Value error, ', '')).filter(Boolean).join(' ')
          : result.detail
        throw new Error(detail || 'Не получилось отправить заявку. Попробуйте ещё раз или позвоните нам.')
      }
      setStatus({ type: 'success', message: result.message || 'Заявка отправлена. Скоро позвоним!' })
      setName('')
      setPhone('')
      setComment('')
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error && error.message !== 'Failed to fetch'
          ? error.message
          : 'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.',
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
      <div className="topline"><span>МИНСК · МАЛЕНЬКАЯ КОФЕЙНАЯ ОБЖАРКА</span><span>СВЕЖАЯ ОБЖАРКА — КАЖДЫЙ ЧЕТВЕРГ <Bean size={13} /></span></div>
      <header className="header">
        <a className="brand" href="#top" aria-label="Кварта — на главную"><span className="brand-mark">к.</span><span>кварта<small>кофе без спешки</small></span></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
          <a href="#coffee" onClick={() => setMenuOpen(false)}>Кофе</a>
          <a href="#subscription" onClick={() => setMenuOpen(false)}>Подписка</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>О нас</a>
          <a href="#delivery" onClick={() => setMenuOpen(false)}>Доставка</a>
          <a className="nav-cta" href="#request" onClick={() => setMenuOpen(false)}>Оставить заявку <ArrowRight size={15} /></a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> НЕ МАСС-МАРКЕТ. ПРОСТО ХОРОШИЙ КОФЕ.</div>
            <h1>Хороший кофе.<br /><em>В своё время.</em></h1>
            <p className="hero-text">Обжариваем небольшими партиями по четвергам. В пятницу привозим по Минску — чтобы у вас дома кофе был именно свежим.</p>
            <div className="hero-actions"><a className="button button-dark" href="#coffee">Выбрать кофе <ArrowRight size={17} /></a><a className="text-link" href="#about">Наша история <ArrowDownRight size={17} /></a></div>
            <div className="hero-foot"><span><span className="dot" /> ОБЖАРИВАЕМ С 2019 ГОДА</span><span>ПАРТИИ ПО 5 КГ</span></div>
          </div>
          <div className="hero-visual">
            <img src="/images/hero-coffee.jpg" onError={handleImageError} alt="Свежесваренный кофе на деревянном столе" />
            <div className="photo-stamp"><span>roasted</span><strong>THURSDAY</strong><span>delivered friday · minsk</span></div>
            <div className="hero-caption"><span>01 / 03</span><span>МЕДЛЕННО ОБЖАРЕНО, БЫСТРО ДОСТАВЛЕНО</span></div>
          </div>
          <div className="hero-side-note">МАЛЕНЬКАЯ МАСТЕРСКАЯ · БОЛЬШОЕ УДОВОЛЬСТВИЕ</div>
        </section>

        <section className="fresh-strip"><div className="fresh-icon"><Clock3 size={21} /></div><p><strong>1–3 дня после обжарки.</strong> Столько обычно проходит, прежде чем кофе оказывается у вас.</p><span>ВОТ ЧТО МЫ НАЗЫВАЕМ СВЕЖЕСТЬЮ</span></section>

        <section className="section coffee-section" id="coffee">
          <div className="section-heading"><div><div className="eyebrow">01 — НА ПОЛКЕ СЕЙЧАС</div><h2>Знакомьтесь,<br /><em>наши зёрна.</em></h2></div><p>Три понятных варианта. Без сложных слов на упаковке — только вкус, который легко представить.</p></div>
          <div className="coffee-grid">
            {coffees.map((coffee) => <article className="coffee-card" key={coffee.no}>
              <div className="coffee-photo"><img src={coffee.image} onError={handleImageError} alt={`Кофе ${coffee.origin}`} loading="lazy" /><span className="coffee-number">{coffee.no}</span><span className="weight-tag">250 Г</span></div>
              <div className="coffee-meta">{coffee.origin}</div><h3>{coffee.name}</h3><p className="coffee-notes">{coffee.notes}</p><div className="coffee-bottom"><span>{coffee.roast}</span><strong>{coffee.price} <small>BYN</small></strong></div>
              <button className="card-order" onClick={() => { setInterest('one_time'); setComment(`Интересует кофе: ${coffee.origin} — ${coffee.name}`); document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' }) }}>Хочу попробовать <ArrowRight size={16} /></button>
            </article>)}
          </div>
          <div className="drip-row"><div className="drip-icon"><Coffee size={28} /></div><div><span className="eyebrow">КОГДА НЕТ ВОРОНКИ ПОД РУКОЙ</span><h3>Дрип-пакеты, ассорти</h3><p>Десять пакетиков — хороший кофе там, где вы есть.</p></div><strong>18 <small>BYN</small></strong><button className="round-arrow" aria-label="Заказать дрип-пакеты" onClick={() => { setInterest('one_time'); setComment('Интересуют дрип-пакеты, ассорти'); document.getElementById('request')?.scrollIntoView({ behavior: 'smooth' }) }}><ArrowRight /></button></div>
        </section>

        <section className="subscription-section" id="subscription">
          <div className="subscription-art"><img src="/images/subscription.jpg" onError={handleImageError} alt="Кофе и утренний ритуал" loading="lazy" /><span className="art-note">ваш маленький<br />ритуал</span></div>
          <div className="subscription-copy"><div className="eyebrow">02 — КОФЕ ПО РАСПИСАНИЮ</div><h2>Чтобы кофе<br />просто <em>был.</em></h2><p>Две пачки по 250 граммов раз в месяц. Мы сами подберём сочетание, обжарим и привезём. Доставка уже включена.</p><div className="subscription-price"><strong>54 <small>BYN</small></strong><span>/ месяц</span></div><ul><li><Check size={17} /> Две пачки свежего кофе</li><li><Check size={17} /> Бесплатная доставка по Минску</li><li><Check size={17} /> Можно обсудить предпочтения</li></ul><button className="button button-light" onClick={() => chooseInterest('subscription')}>Хочу подписку <ArrowRight size={17} /></button><span className="subscription-footnote">Без онлайн-оплаты — сначала просто познакомимся.</span></div>
        </section>

        <section className="about-section section" id="about">
          <div className="about-intro"><div className="eyebrow">03 — ПРИВЕТ, МЫ АНЯ И ДИМА</div><h2>Начинали за<br />кофемашиной.<br /><em>Остались рядом.</em></h2></div>
          <div className="about-body"><p className="about-lead">До своей обжарки мы работали бариста. И часто видели, как хороший кофе теряет половину характера, пока ждёт своего покупателя.</p><p>В 2019 году решили попробовать иначе. Теперь обжариваем маленькими партиями по 5 кг: столько, сколько можем внимательно проконтролировать. Не гонимся за объёмом — хотим, чтобы каждая чашка радовала.</p><div className="about-signature"><span className="signature-mark">а + д</span><span>Аня и Дмитрий<br /><small>основатели «Кварты»</small></span></div></div>
          <div className="about-photo"><img src="/images/workshop.jpg" onError={handleImageError} alt="Уютная кофейная мастерская" loading="lazy" /><span>НАША МАСТЕРСКАЯ · МИНСК</span></div>
        </section>

        <section className="delivery-section" id="delivery">
          <div className="delivery-title"><div className="eyebrow">04 — КАК КОФЕ ПОПАДЁТ К ВАМ</div><h2>Всё просто.<br /><em>И по пути.</em></h2></div>
          <div className="delivery-options"><article><span className="delivery-symbol"><Truck /></span><div className="eyebrow">ПО ПЯТНИЦАМ</div><h3>Доставка по Минску</h3><p>В пятницу развозим свежую обжарку. При заказе от 50 BYN доставка бесплатная.</p></article><article><span className="delivery-symbol"><MapPin /></span><div className="eyebrow">КОГДА УДОБНО</div><h3>Забрать самому</h3><p>Минск, ул. Короля, 9. Заходите в будни с 8:00 до 20:00, в выходные — с 10:00 до 18:00.</p></article></div>
        </section>

        <section className="request-section" id="request">
          <div className="request-copy"><div className="eyebrow">05 — ДАВАЙТЕ ЗНАКОМИТЬСЯ</div><h2>Остались<br />вопросы? <em>Это нормально.</em></h2><p>Оставьте номер — мы перезвоним, поможем выбрать кофе и расскажем, как всё устроено. Никаких обязательств.</p><div className="request-contact"><span>ИЛИ ПРИХОДИТЕ В ГОСТИ</span><strong><MapPin size={17} /> Минск, ул. Короля, 9</strong><span>ПН–ПТ 8:00–20:00 · СБ–ВС 10:00–18:00</span><a href="https://instagram.com/" target="_blank" rel="noreferrer"><Instagram size={16} /> Мы в Instagram</a></div></div>
          <form className="lead-form" onSubmit={submitLead}>
            <div className="form-top"><span>ЗАЯВКА № 001</span><span>ОБЫЧНО ОТВЕЧАЕМ В ТЕЧЕНИЕ ДНЯ</span></div>
            <label>Как к вам обращаться?<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Ваше имя" autoComplete="name" /></label>
            <label>Номер телефона<input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" maxLength={32} placeholder="+375 29 123-45-67" autoComplete="tel" /></label>
            <fieldset><legend>Что вас интересует?</legend><div className="interest-options">
              <button type="button" className={interest === 'subscription' ? 'interest active' : 'interest'} onClick={() => setInterest('subscription')}>Подписка</button>
              <button type="button" className={interest === 'one_time' ? 'interest active' : 'interest'} onClick={() => setInterest('one_time')}>Разовый заказ</button>
              <button type="button" className={interest === 'question' ? 'interest active' : 'interest'} onClick={() => setInterest('question')}>Вопрос</button>
            </div></fieldset>
            <label>Комментарий <span className="optional">необязательно</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} placeholder="Например, люблю кофе покислее…" /></label>
            {status && <div className={status.type === 'success' ? 'form-status success' : 'form-status error'} role="status">{status.message}</div>}
            <button className="button button-dark form-submit" type="submit" disabled={submitting}>{submitting ? 'Отправляем…' : 'Отправить заявку'} <ArrowRight size={17} /></button>
            <p className="privacy-note">Нажимая кнопку, вы соглашаетесь на связь по оставленному номеру. Мы не рассылаем спам.</p>
          </form>
        </section>
      </main>

      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark">к.</span><span>кварта<small>кофе без спешки</small></span></a><span>МАЛЕНЬКАЯ ОБЖАРКА, БОЛЬШАЯ ЛЮБОВЬ К КОФЕ.</span><a href="#top">НАВЕРХ ↑</a><span>МИНСК · 2019—2026</span></footer>
    </div>
  )
}

export default App
