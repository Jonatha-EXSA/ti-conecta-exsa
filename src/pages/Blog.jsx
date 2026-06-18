import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:          '#0a0a0a',
  bgSoft:      '#141414',
  bgCard:      '#1a1a1a',
  bgElev:      '#222222',
  fg:          '#f5f3ef',
  fgDim:       '#a8a39b',
  fgMuted:     '#6b6660',
  accent:      '#ff5722',
  accentSoft:  '#ff8a65',
  success:     '#00c896',
  border:      '#2a2a2a',
  borderLight: '#3a3a3a',
}
const MONO  = "'JetBrains Mono', monospace"
const SERIF = "'Fraunces', Georgia, serif"
const SANS  = "'Inter', system-ui, sans-serif"
const CATEGORIES = ['Todas', 'Brasil', 'Oficial IA', 'Internacional', 'YouTube']
const SOURCE_TYPE = {
  'Canaltech': 'Brasil', 'Olhar Digital': 'Brasil', 'TecMundo': 'Brasil',
  'Exame': 'Brasil', 'Google Notícias BR': 'Brasil',
  'OpenAI Blog': 'Oficial IA', 'Google AI Blog': 'Oficial IA',
  'Microsoft AI': 'Oficial IA', 'Meta AI': 'Oficial IA', 'Anthropic': 'Oficial IA',
  'TechCrunch AI': 'Internacional', 'The Verge AI': 'Internacional',
  'The Hacker News': 'Internacional', 'Bleeping Computer': 'Internacional',
}

function getCat(a) {
  if (a.type === 'YouTube') return 'YouTube'
  return SOURCE_TYPE[a.source] || a.type || 'Internacional'
}
function timeAgo(iso) {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60)    return 'agora'
  if (s < 3600)  return `${Math.floor(s / 60)}min`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// ── Responsive hook ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [])
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024, w }
}

// ── StatsBar ──────────────────────────────────────────────────────────────────
function StatsBar({ total, sources, lastUpdate, countdown, articles }) {
  const { isMobile } = useBreakpoint()
  const stats = [
    { label: 'NOTÍCIAS', value: total,   sub: 'artigos' },
    { label: 'FONTES',   value: sources, sub: 'feeds'   },
    { label: 'ATUALIZ.', value: lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--', sub: 'horário' },
    { label: 'PRÓX.',    value: `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2,'0')}`, sub: 'min' },
  ]
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.bgSoft, flexShrink: 0, overflowX: 'auto' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ flex: isMobile ? '0 0 auto' : 1, padding: isMobile ? '6px 16px' : '5px 20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none', minWidth: isMobile ? 80 : 'auto' }}>
          <div style={{ fontSize: 7, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.14em', marginBottom: 1 }}>{s.label}</div>
          <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, fontFamily: SERIF, color: C.fg, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 9, fontFamily: SANS, color: C.fgMuted, marginTop: 1 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Marquee ───────────────────────────────────────────────────────────────────
function Marquee({ articles }) {
  if (!articles.length) return null
  const items = [...articles.slice(0, 15), ...articles.slice(0, 15)]
  return (
    <div style={{ background: C.accent, overflow: 'hidden', height: 30, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ animation: 'ticker-scroll 140s linear infinite', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
        {items.map((a, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px' }}>
            <span style={{ fontSize: 8, fontFamily: MONO, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>◆</span>
            <span style={{ fontSize: 11, fontFamily: SANS, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>{a.title}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Search Panel ──────────────────────────────────────────────────────────────
const QUICK_CHIPS = ['ChatGPT', 'Gemini', 'Claude', 'LGPD', 'IA', 'OpenAI', 'Google', 'Microsoft']
function SearchPanel({ search, setSearch, sourceFilter, setSourceFilter, sortFilter, setSortFilter, total }) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ background: 'rgba(20,20,20,0.98)', borderBottom: `1px solid ${C.border}`, padding: isMobile ? '8px 16px 6px' : '8px 24px 7px', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.fgMuted, fontSize: 15, pointerEvents: 'none' }}>⌕</span>
          <input type="text" placeholder={isMobile ? 'Pesquisar...' : 'Pesquisar notícias de TI, IA, automação...'} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px 10px 36px', color: C.fg, fontFamily: SANS, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => { e.target.style.borderColor = C.accent }} onBlur={e => { e.target.style.borderColor = C.border }} />
        </div>
        {!isMobile && [
          { val: sourceFilter, set: setSourceFilter, opts: [['Todas as fontes','all'],['Portais brasileiros','Brasil'],['Fontes oficiais','Oficial IA'],['Internacionais','Internacional'],['YouTube','YouTube']] },
          { val: sortFilter,   set: setSortFilter,   opts: [['Mais recentes','recent'],['Por fonte','source']] },
        ].map((s, i) => (
          <select key={i} value={s.val} onChange={e => s.set(e.target.value)} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, color: C.fgDim, fontFamily: SANS, fontSize: 12, padding: '10px 12px', outline: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {s.opts.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {!isMobile && <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.12em', flexShrink: 0 }}>RÁPIDAS:</span>}
        {QUICK_CHIPS.map(chip => {
          const active = search.toLowerCase() === chip.toLowerCase()
          return (
            <button key={chip} onClick={() => setSearch(active ? '' : chip)}
              style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', padding: '5px 12px', borderRadius: 20, cursor: 'pointer', flexShrink: 0, color: active ? C.accent : C.fgMuted, background: active ? `${C.accent}18` : 'transparent', border: `1px solid ${active ? C.accent : C.border}`, transition: 'all 0.15s' }}>
              {chip}
            </button>
          )
        })}
        {total > 0 && !isMobile && <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: MONO, color: C.fgMuted, flexShrink: 0 }}>{total} resultado(s)</span>}
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filter, setFilter, counts, onRefresh }) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '6px 16px' : '5px 24px', background: C.bgSoft, borderBottom: `1px solid ${C.border}`, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {CATEGORIES.map(cat => {
        const active = filter === cat
        const count = counts[cat] || 0
        return (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ fontFamily: MONO, fontSize: isMobile ? 9 : 10, letterSpacing: '0.08em', fontWeight: active ? 700 : 400, padding: isMobile ? '6px 12px' : '5px 14px', borderRadius: 6, cursor: 'pointer', flexShrink: 0, color: active ? C.accent : C.fgMuted, background: active ? `${C.accent}15` : 'transparent', border: `1px solid ${active ? C.accent : C.border}`, transition: 'all 0.2s', minHeight: 34 }}>
            {cat.toUpperCase()} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
          </button>
        )
      })}
      <button onClick={onRefresh}
        style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', padding: isMobile ? '6px 12px' : '5px 16px', borderRadius: 6, cursor: 'pointer', color: '#fff', background: C.accent, border: 'none', flexShrink: 0, minHeight: 34 }}>
        ↺ {!isMobile && 'ATUALIZAR'}
      </button>
    </div>
  )
}

// ── PT Badge ──────────────────────────────────────────────────────────────────
function PtBadge() {
  return <span style={{ fontSize: 9, fontFamily: MONO, color: C.success, background: `${C.success}18`, border: `1px solid ${C.success}44`, borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em', flexShrink: 0 }}>PT-BR</span>
}

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection({ articles, isMobile }) {
  if (articles.length < 1) return null
  const [main, ...sides] = articles.slice(0, 4)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 3, height: 16, background: C.accent, borderRadius: 2 }} />
        <span style={{ fontFamily: SERIF, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: C.fg, fontStyle: 'italic' }}>Em <span style={{ color: C.accent }}>destaque</span></span>
        {!isMobile && <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.12em' }}>TOP STORIES · ATUALIZADO AGORA</span>}
      </div>
      {isMobile ? (
        <HeroBig article={main} isMobile />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 1, background: C.border, borderRadius: 10, overflow: 'hidden' }}>
          <HeroBig article={main} />
          <div style={{ display: 'flex', flexDirection: 'column', background: C.bgCard }}>
            {sides.slice(0, 3).map((a, i) => <HeroSide key={i} article={a} last={i === 2 || i === sides.length - 1} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroBig({ article, isMobile }) {
  const cat = getCat(article)
  const [hov, setHov] = useState(false)
  return (
    <div onClick={() => window.open(article.link, '_blank')}
      style={{ position: 'relative', cursor: 'pointer', background: C.bgCard, display: 'flex', flexDirection: 'column', minHeight: isMobile ? 260 : 380, overflow: 'hidden', borderRadius: isMobile ? 10 : 0, transition: 'all 0.2s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {article.img && (
        <>
          <img src={article.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45) saturate(0.7)', transition: 'transform 0.4s', transform: hov ? 'scale(1.03)' : 'scale(1)' }} onError={e => { e.target.style.display = 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,0.97) 30%, rgba(10,10,10,0.3) 80%, transparent)' }} />
        </>
      )}
      {!article.img && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.bgCard}, #1a0a05)` }} />}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: C.accent, transform: hov ? 'scaleY(1)' : 'scaleY(0)', transformOrigin: 'bottom', transition: 'transform 0.25s' }} />
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', padding: isMobile ? '20px 18px' : '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: isMobile ? 9 : 10, fontFamily: MONO, color: C.accent, letterSpacing: '0.18em', fontWeight: 700, borderBottom: `2px solid ${C.accent}`, paddingBottom: 1 }}>{cat.toUpperCase()}</span>
          <PtBadge />
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: MONO, color: C.fgMuted }}>{timeAgo(article.date)}</span>
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 30, fontWeight: 700, color: C.fg, lineHeight: 1.25, margin: 0, display: '-webkit-box', WebkitLineClamp: isMobile ? 3 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h2>
        {article.description && !isMobile && (
          <p style={{ fontFamily: SANS, fontSize: 13, color: C.fgDim, lineHeight: 1.5, margin: '10px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.description}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted }}>{article.source}</span>
          <span style={{ fontSize: 13, color: C.accent }}>→</span>
        </div>
      </div>
    </div>
  )
}

function HeroSide({ article, last }) {
  const cat = getCat(article)
  const [hov, setHov] = useState(false)
  return (
    <div onClick={() => window.open(article.link, '_blank')}
      style={{ flex: 1, padding: '16px 20px', cursor: 'pointer', borderBottom: last ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: hov ? C.bgElev : C.bgCard, position: 'relative', overflow: 'hidden', transition: 'background 0.2s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.accent, transform: hov ? 'scaleY(1)' : 'scaleY(0)', transformOrigin: 'bottom', transition: 'transform 0.2s' }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontFamily: MONO, color: C.accent, letterSpacing: '0.16em', fontWeight: 700 }}>{cat.toUpperCase()}</span>
          <span style={{ fontSize: 9, fontFamily: MONO, color: C.fgMuted, marginLeft: 'auto' }}>{timeAgo(article.date)}</span>
        </div>
        <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.fg, lineHeight: 1.35, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted }}>{article.source}</span>
        <span style={{ fontSize: 12, color: C.accent, opacity: hov ? 1 : 0, transition: 'all 0.18s' }}>→</span>
      </div>
    </div>
  )
}

// ── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({ article, delay, isMobile }) {
  const cat = getCat(article)
  const [hov, setHov] = useState(false)
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div onClick={() => window.open(article.link, '_blank')}
      style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: isMobile ? 'row' : 'column', transition: 'all 0.2s', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(8px)', ...(hov ? { background: C.bgElev, borderColor: `${C.accent}44`, boxShadow: `0 4px 20px ${C.accent}18` } : {}), minHeight: isMobile ? 90 : 'auto' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {isMobile ? (
        // Layout horizontal para mobile
        <>
          {article.img && (
            <div style={{ width: 90, flexShrink: 0, background: '#0f0f0f', position: 'relative', overflow: 'hidden' }}>
              <img src={article.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.8)' }} onError={e => { e.target.parentElement.style.display = 'none' }} />
            </div>
          )}
          <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8, fontFamily: MONO, color: C.accent, letterSpacing: '0.14em', fontWeight: 700 }}>{cat.toUpperCase()}</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: MONO, color: C.fgMuted, flexShrink: 0 }}>{timeAgo(article.date)}</span>
            </div>
            <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: C.fg, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
            <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted, marginTop: 'auto' }}>{article.source}</span>
          </div>
        </>
      ) : (
        // Layout vertical para desktop/tablet
        <>
          <div style={{ height: 150, background: '#0f0f0f', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
            {article.img
              ? <img src={article.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.7) brightness(0.8)', transition: 'transform 0.3s', transform: hov ? 'scale(1.04)' : 'scale(1)' }} onError={e => { e.target.style.display = 'none' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.08 }}>◆</div>
            }
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(26,26,26,0.9))' }} />
          </div>
          <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 9, fontFamily: MONO, color: C.accent, letterSpacing: '0.14em', fontWeight: 700 }}>{cat.toUpperCase()}</span>
              <PtBadge />
              <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: MONO, color: C.fgMuted }}>{timeAgo(article.date)}</span>
            </div>
            <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: C.fg, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
            {article.description && (
              <p style={{ margin: 0, fontFamily: SANS, fontSize: 12, color: C.fgMuted, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.description}</p>
            )}
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted }}>{article.source}</span>
              <span style={{ fontSize: 11, color: C.accent, opacity: hov ? 1 : 0, transition: 'all 0.18s' }}>→</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Compact Card ──────────────────────────────────────────────────────────────
function CompactCard({ article }) {
  const cat = getCat(article)
  const [hov, setHov] = useState(false)
  return (
    <div onClick={() => window.open(article.link, '_blank')}
      style={{ padding: '11px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: hov ? C.bgElev : 'transparent', transition: 'background 0.15s', minHeight: 44 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <span style={{ fontSize: 8, fontFamily: MONO, color: C.accent, letterSpacing: '0.12em', flexShrink: 0, minWidth: 64, textTransform: 'uppercase' }}>{cat}</span>
      <span style={{ fontFamily: SANS, fontSize: 13, color: hov ? C.fgDim : C.fgMuted, lineHeight: 1.4, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{article.title}</span>
      <span style={{ fontSize: 9, fontFamily: MONO, color: C.fgMuted, flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(article.date)}</span>
    </div>
  )
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ article, delay }) {
  const [hov, setHov] = useState(false)
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div onClick={() => window.open(article.link, '_blank')}
      style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(8px)', ...(hov ? { background: C.bgElev, borderColor: `${C.accent}44` } : {}) }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ position: 'relative', paddingTop: '56.25%', background: '#0f0f0f', flexShrink: 0, overflow: 'hidden' }}>
        {article.img && <img src={article.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hov ? 'scale(1.05)' : 'scale(1)' }} onError={e => { e.target.style.display = 'none' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,87,34,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', transform: hov ? 'scale(1.12)' : 'scale(1)', boxShadow: `0 0 20px ${C.accent}66` }}>
            <span style={{ color: '#fff', fontSize: 17, marginLeft: 3 }}>▶</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ fontSize: 10, fontFamily: MONO, color: C.accentSoft, letterSpacing: '0.1em', fontWeight: 700 }}>{article.source.toUpperCase()}</span>
        <h3 style={{ margin: 0, fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: C.fg, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
        <span style={{ fontSize: 10, fontFamily: MONO, color: C.fgMuted, marginTop: 'auto' }}>{timeAgo(article.date)}</span>
      </div>
    </div>
  )
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({ articles }) {
  const latest = articles.filter(a => a.type !== 'YouTube').slice(0, 30)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgCard, borderLeft: `1px solid ${C.border}` }}>
      <div style={{ padding: '12px 16px 10px', background: `linear-gradient(135deg, ${C.accent}20, transparent)`, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontFamily: MONO, color: C.accent, letterSpacing: '0.2em', marginBottom: 2 }}>RADAR RÁPIDO</div>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.fg, fontStyle: 'italic' }}>Últimas notícias</div>
        <div style={{ fontSize: 10, fontFamily: SANS, color: C.fgMuted, marginTop: 2 }}>{latest.length} artigos</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {[
          { label: 'IA NO X.COM',  href: 'https://x.com/search?q=inteligencia+artificial&lang=pt' },
          { label: 'GOOGLE NEWS',  href: 'https://news.google.com/search?q=inteligencia+artificial&hl=pt-BR' },
        ].map(b => (
          <a key={b.label} href={b.href} target="_blank" rel="noreferrer"
            style={{ display: 'block', textAlign: 'center', padding: '6px 4px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: C.fgMuted, background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 5, textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = C.fgMuted; e.currentTarget.style.borderColor = C.border }}>
            {b.label}
          </a>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {latest.map((a, i) => (
          <div key={i} onClick={() => window.open(a.link, '_blank')}
            style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bgElev }}
            onMouseLeave={e => { e.currentTarget.style.background = '' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 8, fontFamily: MONO, color: C.accent, letterSpacing: '0.14em', fontWeight: 700 }}>{getCat(a).toUpperCase()}</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: MONO, color: C.fgMuted }}>{timeAgo(a.date)}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: C.fgDim, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</div>
            <div style={{ fontSize: 9, fontFamily: MONO, color: C.accentSoft, marginTop: 3 }}>{a.source}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: C.bgSoft, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.08em', lineHeight: 1.8 }}>
          DESENVOLVIDO PELA EQUIPE DE TI<br />
          <span style={{ color: C.accent }}>EXPRESSO SUL AMERICANO</span>
        </div>
      </div>
    </div>
  )
}

// ── Mobile Bottom Sheet (Radar) ───────────────────────────────────────────────
function MobileRadar({ articles, open, onClose }) {
  const latest = articles.filter(a => a.type !== 'YouTube').slice(0, 20)
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: C.bgCard, borderRadius: '16px 16px 0 0', transform: open ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.35s cubic-bezier(.32,.72,0,1)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: MONO, color: C.accent, letterSpacing: '0.18em' }}>RADAR RÁPIDO</div>
            <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: C.fg, fontStyle: 'italic' }}>Últimas notícias</div>
          </div>
          <button onClick={onClose} style={{ background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.fgMuted, fontFamily: MONO, fontSize: 10, cursor: 'pointer' }}>FECHAR</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {latest.map((a, i) => (
            <div key={i} onClick={() => { window.open(a.link, '_blank'); onClose() }}
              style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 60 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, fontFamily: MONO, color: C.accent, letterSpacing: '0.14em', marginBottom: 4 }}>{getCat(a).toUpperCase()} · {timeAgo(a.date)}</div>
                <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: C.fgDim, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</div>
                <div style={{ fontSize: 9, fontFamily: MONO, color: C.accentSoft, marginTop: 4 }}>{a.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  const { isMobile } = useBreakpoint()
  const pulse = { background: `linear-gradient(90deg, ${C.bgCard} 0%, ${C.bgElev} 50%, ${C.bgCard} 100%)`, backgroundSize: '200%', animation: 'shimmer 1.5s infinite', borderRadius: 4 }
  return (
    <div style={{ padding: isMobile ? '16px' : '20px 24px 24px 28px' }}>
      <div style={{ ...pulse, height: isMobile ? 240 : 380, borderRadius: 10, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: isMobile ? 'row' : 'column' }}>
            <div style={{ ...pulse, height: isMobile ? 80 : 140, width: isMobile ? 80 : '100%', flexShrink: 0 }} />
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div style={{ ...pulse, height: 10, width: '30%' }} />
              <div style={{ ...pulse, height: 14, width: '90%' }} />
              <div style={{ ...pulse, height: 14, width: '70%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Blog ─────────────────────────────────────────────────────────────────
export default function Blog() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint()
  const [articles,     setArticles]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('Todas')
  const [search,       setSearch]       = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortFilter,   setSortFilter]   = useState('recent')
  const [lastUpdate,   setLastUpdate]   = useState(null)
  const [countdown,    setCountdown]    = useState(7200)
  const [retryIn,      setRetryIn]      = useState(15)
  const [showDevBar,   setShowDevBar]   = useState(false)
  const [showRadar,    setShowRadar]    = useState(false)

  const loadArticles = useCallback(async () => {
    try {
      const r = await fetch('/intel')
      if (r.ok) { setArticles(await r.json()); setLastUpdate(new Date()); setCountdown(7200) }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadArticles()
    const refresh = setInterval(loadArticles, 2 * 60 * 60 * 1000)
    const tick    = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => { clearInterval(refresh); clearInterval(tick) }
  }, [loadArticles])

  useEffect(() => {
    if (loading || articles.length > 0) return
    setRetryIn(15)
    const retry = setInterval(loadArticles, 15000)
    const tick  = setInterval(() => setRetryIn(n => n <= 1 ? 15 : n - 1), 1000)
    return () => { clearInterval(retry); clearInterval(tick) }
  }, [loading, articles.length, loadArticles])

  const filtered = useMemo(() => {
    let list = articles
    if (filter !== 'Todas') list = list.filter(a => getCat(a) === filter)
    if (sourceFilter !== 'all') list = list.filter(a => getCat(a) === sourceFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.source || '').toLowerCase().includes(q))
    }
    if (sortFilter === 'source') list = [...list].sort((a, b) => (a.source || '').localeCompare(b.source || ''))
    return [...list.filter(a => a.img), ...list.filter(a => !a.img)]
  }, [articles, filter, search, sourceFilter, sortFilter])

  const counts = useMemo(() => {
    const c = { Todas: articles.length }
    CATEGORIES.slice(1).forEach(cat => { c[cat] = articles.filter(a => getCat(a) === cat).length })
    return c
  }, [articles])

  const showHero   = filter === 'Todas' && !search && sourceFilter === 'all'
  const nonYT      = filtered.filter(a => a.type !== 'YouTube')
  const heroItems  = showHero ? nonYT.filter(a => a.img).slice(0, 4) : []
  const newsItems  = showHero ? nonYT.filter(a => a.img).slice(4) : nonYT.filter(a => a.img)
  const textItems  = nonYT.filter(a => !a.img)
  const videoItems = filtered.filter(a => a.type === 'YouTube')
  const activeSrcs = [...new Set(articles.map(a => a.source))].length

  const newsColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.fg, fontFamily: SANS, overflow: 'hidden' }}>
      <style>{`
        @keyframes ticker-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes shimmer { 0%,100% { background-position: 200% 0 } 50% { background-position: -200% 0 } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-live { 0%,100%{box-shadow:0 0 0 0 ${C.success}66} 50%{box-shadow:0 0 0 6px transparent} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        select option { background: ${C.bgCard}; }
        a { color: inherit; }
        input, button, select { -webkit-appearance: none; appearance: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, background: 'rgba(10,10,10,0.98)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: isMobile ? '8px 16px' : '9px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: SERIF, fontSize: isMobile ? 19 : 22, fontWeight: 900, background: `linear-gradient(135deg, ${C.fg} 0%, ${C.accentSoft} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>Notícias TI</span>
            <span style={{ fontSize: isMobile ? 11 : 13, fontFamily: MONO, color: C.accent, letterSpacing: '0.06em', fontWeight: 700 }}>EXSA</span>
          </div>
          {!isMobile && (
            <>
              <div style={{ width: 1, height: 20, background: C.border }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 10, fontFamily: SANS, color: C.fgDim, fontWeight: 600 }}>Expresso Sul Americano</span>
                <span style={{ fontSize: 9, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.1em' }}>CENTRAL DE NOTÍCIAS · EQUIPE DE TI</span>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && articles.length > 0 && (
            <button onClick={() => setShowRadar(true)}
              style={{ background: C.bgElev, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', color: C.fgMuted, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              ◈ RADAR
            </button>
          )}
          <button onClick={() => setShowDevBar(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: showDevBar ? `${C.accent}15` : C.bgElev, border: `1px solid ${showDevBar ? C.accent + '44' : C.border}`, borderRadius: 6, padding: isMobile ? '7px 10px' : '4px 10px', cursor: 'pointer', color: showDevBar ? C.accent : C.fgMuted, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 11 }}>{showDevBar ? '⊟' : '⊞'}</span>
            {!isMobile && (showDevBar ? 'OCULTAR PAINEL' : 'MOSTRAR PAINEL')}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, animation: 'pulse-live 2s ease-in-out infinite' }} />
            {!isMobile && <span style={{ fontSize: 11, fontFamily: SANS, fontWeight: 600, color: C.success, letterSpacing: '0.06em' }}>AO VIVO</span>}
          </div>
        </div>
      </div>

      {/* ── Dev Bar ── */}
      {showDevBar && (
        <>
          <StatsBar total={articles.length} sources={activeSrcs} lastUpdate={lastUpdate} countdown={countdown} articles={articles} />
          {!loading && articles.length > 0 && <Marquee articles={articles} />}
          <SearchPanel search={search} setSearch={setSearch} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} sortFilter={sortFilter} setSortFilter={setSortFilter} total={filtered.length} />
        </>
      )}

      {/* ── Filter Bar ── */}
      <FilterBar filter={filter} setFilter={setFilter} counts={counts} onRefresh={loadArticles} />

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <Skeleton />
          ) : articles.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16, padding: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.accent}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite', opacity: 0.6 }} />
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.fgMuted, letterSpacing: '0.2em', textAlign: 'center' }}>CARREGANDO... NOVA TENTATIVA EM {retryIn}s</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40%', gap: 12, padding: 24 }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.fgMuted, letterSpacing: '0.16em', textAlign: 'center' }}>
                {search ? `SEM RESULTADOS PARA "${search.toUpperCase()}"` : 'NENHUMA MATÉRIA NESSA CATEGORIA'}
              </span>
              {search && <button onClick={() => setSearch('')} style={{ fontFamily: MONO, fontSize: 10, padding: '8px 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.fgMuted, cursor: 'pointer', minHeight: 40 }}>LIMPAR BUSCA</button>}
            </div>
          ) : (
            <div style={{ padding: isMobile ? '14px 14px 80px' : '20px 24px 24px 28px' }}>
              {showHero && heroItems.length >= 1 && <HeroSection articles={heroItems} isMobile={isMobile} />}

              {newsItems.length > 0 && (
                <>
                  {showHero && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, background: C.border, borderRadius: 2 }} />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.fgMuted, letterSpacing: '0.16em' }}>TODAS AS NOTÍCIAS</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: newsColumns, gap: isMobile ? 8 : 14, marginBottom: (textItems.length || videoItems.length) ? 20 : 0 }}>
                    {newsItems.map((a, i) => <NewsCard key={a.link || i} article={a} delay={i * 25} isMobile={isMobile} />)}
                  </div>
                </>
              )}

              {textItems.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${newsItems.length ? 4 : 0}px 0 8px` }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.fgMuted, letterSpacing: '0.16em', whiteSpace: 'nowrap' }}>MAIS · {textItems.length}</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: videoItems.length ? 20 : 0 }}>
                    {textItems.map((a, i) => <CompactCard key={a.link || i} article={a} />)}
                  </div>
                </>
              )}

              {videoItems.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
                    <div style={{ width: 3, height: 16, background: C.accent, borderRadius: 2 }} />
                    <span style={{ fontFamily: SERIF, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.fg, fontStyle: 'italic' }}>Vídeos <span style={{ color: C.accent }}>IA Brasil</span></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 8 : 14 }}>
                    {videoItems.map((a, i) => <VideoCard key={a.link || i} article={a} delay={i * 35} />)}
                  </div>
                </>
              )}

              {/* Footer mobile */}
              {isMobile && (
                <div style={{ textAlign: 'center', padding: '20px 0 4px', borderTop: `1px solid ${C.border}`, marginTop: 20 }}>
                  <div style={{ fontSize: 9, fontFamily: MONO, color: C.fgMuted, letterSpacing: '0.1em', lineHeight: 1.8 }}>
                    DESENVOLVIDO PELA EQUIPE DE TI<br />
                    <span style={{ color: C.accent }}>EXPRESSO SUL AMERICANO</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side panel só no desktop */}
        {isDesktop && !loading && articles.length > 0 && (
          <div style={{ width: 300, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SidePanel articles={articles} />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet do Radar */}
      {isMobile && <MobileRadar articles={articles} open={showRadar} onClose={() => setShowRadar(false)} />}
    </div>
  )
}