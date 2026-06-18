'use strict';
const http    = require('http');
const https   = require('https');
const path    = require('path');
const fs      = require('fs');
const express = require('express');

const app  = express();
const PORT = process.env.PORT || 3010;
const DIST = path.join(__dirname, 'dist');
const SOURCES_FILE = path.join(__dirname, 'intel-sources.json');

// ── Fontes RSS/YouTube ────────────────────────────────────────────────────────
function loadSources() {
  try { return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8')); }
  catch { return { sources: [] }; }
}

// ── HTTP helper (segue redirects) ─────────────────────────────────────────────
function httpGet(url, redirects = 4) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OdinBlog/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        const loc = res.headers.location;
        res.resume();
        return httpGet(loc.startsWith('http') ? loc : new URL(loc, url).href, redirects - 1).then(resolve).catch(reject);
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => buf += d);
      res.on('end', () => resolve(buf));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Fetch só o <head> para OG image ──────────────────────────────────────────
function httpGetHead(url, maxBytes = 35000, timeout = 5000, redirects = 3) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'OdinBlog/1.0' } }, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        const loc = res.headers.location;
        return httpGetHead(loc.startsWith('http') ? loc : new URL(loc, url).href, maxBytes, timeout, redirects - 1)
          .then(v => done(resolve, v)).catch(e => done(reject, e));
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => {
        buf += d;
        if (buf.length >= maxBytes) { req.destroy(); done(resolve, buf); }
      });
      res.on('end', () => done(resolve, buf));
    });
    req.on('error', e => done(reject, e));
    req.setTimeout(timeout, () => { req.destroy(); done(reject, new Error('timeout')); });
  });
}

// ── OG Image cache ────────────────────────────────────────────────────────────
const _imgCache = new Map();
async function fetchOgImage(url) {
  if (_imgCache.has(url)) return _imgCache.get(url);
  try {
    const html = await httpGetHead(url);
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
           || html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i);
    const img = m?.[1] || '';
    _imgCache.set(url, img);
    return img;
  } catch { _imgCache.set(url, ''); return ''; }
}

// ── Detecção de inglês ────────────────────────────────────────────────────────
const _enRe = /\b(the|and|for|with|how|this|that|from|what|your|new|has|have|been|will|its|are|was|were|can|after|when|using|all|into|about|more|their|not|out|over|who|may|also|but|just|says|said|report|data|update|attack|security|researchers|users|experts|found|launches|reveals|warns|following|could|would|should|now|one|use|via|than|against|major|show|set|see|get|two|first|last|named|under|here|back|up|down|most|some|other|make|take|look|such)\b/gi;
function isEnglish(text) {
  if (!text) return false;
  const words = text.split(/\s+/).filter(w => w.length > 2);
  if (words.length < 4) return false;
  return (text.match(_enRe) || []).length / words.length > 0.2;
}

// ── Tradução via MyMemory ─────────────────────────────────────────────────────
const _transCache = new Map();
async function translate(text) {
  if (!text) return text;
  const key = text.slice(0, 500);
  if (_transCache.has(key)) return _transCache.get(key);
  try {
    const q = encodeURIComponent(key);
    const body = await httpGet(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt-BR&dt=t&q=${q}`);
    const data = JSON.parse(body);
    const t = (data[0] || []).map(s => s?.[0] || '').filter(Boolean).join('');
    if (t) { _transCache.set(key, t); return t; }
  } catch {}
  _transCache.set(key, text);
  return text;
}

// ── Filtro de artigos off-topic ───────────────────────────────────────────────
const NON_TECH_RE = /\b(futebol|soccer|esport|nba|nfl|moda|fashion|culinaria|receita|gastronomia|música|musica|cinema|novela|reality.show|bbb|big.brother|famosos|celebridades|fofoca|política|politica|eleição|eleicao|congresso|senado|vacina|covid|dieta|emagrecimento|imóveis|imoveis|aluguel|horoscopo|signo)\b/i;
function isTechArticle(title) {
  if (!title) return false;
  return !NON_TECH_RE.test(title);
}

// ── Parser RSS ────────────────────────────────────────────────────────────────
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,c)=>String.fromCharCode(+c)).replace(/\s+/g,' ').trim();
}

function parseRSSItems(xml, source) {
  const items = [];
  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const tag = name => {
      const r = new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${name}>`, 'i');
      const x = b.match(r);
      return x ? x[1].trim() : '';
    };
    const raw = tag('title');
    const title = raw.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,c)=>String.fromCharCode(+c)).replace(/<[^>]+>/g,'').trim();
    let link = tag('link');
    if (!link) { const lm = b.match(/<link[^>]+href=["']([^"']+)["']/i); if (lm) link = lm[1]; }
    if (!link) { const lm = b.match(/<link>(.*?)<\/link>/is); if (lm) link = lm[1].trim(); }
    if (!link) { const lm = b.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i); if (lm) link = lm[1].trim(); }
    const pubDate = tag('pubDate') || tag('dc:date') || tag('published');

    // Extrai descrição limpa para tradução
    const rawDesc = tag('description') || tag('summary') || tag('content:encoded') || '';
    const description = stripHtml(rawDesc).slice(0, 300);

    let img = '';
    const tries = [
      () => { const x = b.match(/<enclosure[^>]+type=["']image[^>]+url=["']([^"']+)["']/i) || b.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i); return x?.[1]; },
      () => { const x = b.match(/<media:content[^>]+url=["']([^"']+)["']/i); return x?.[1]; },
      () => { const x = b.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i); return x?.[1]; },
      () => { const x = b.match(/<media:url>(https?:\/\/[^<\s]+)<\/media:url>/i); return x?.[1]; },
      () => { const ce = b.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1] || ''; const x = ce.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i); return x?.[1]; },
      () => { const d = tag('description'); const x = d.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i); return x?.[1]; },
      () => { const x = b.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i); return x?.[1]; },
    ];
    for (const fn of tries) {
      try { const v = fn(); if (v && v.startsWith('http')) { img = v; break; } } catch {}
    }

    if (title && link) {
      const date = pubDate ? new Date(pubDate) : new Date(0);
      items.push({ title, description, link, img, source, date: isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString() });
    }
    if (items.length >= 12) break;
  }
  return items;
}

// ── Parser YouTube Atom ───────────────────────────────────────────────────────
const YT_IA_RE = /\b(ia\b|a\.i\.|intelig.*artif|chatgpt|openai|gemini|llm|gpt|claude|copilot|machine.?learn|deep.?learn|automação|automacao|robot|neural|langchain|rag\b|agente.*ia|ia.*agente|inteligência)\b/i;

function parseYouTubeAtom(xml, channelName) {
  const items = [];
  const re = /<entry>([\s\S]*?)<\/entry>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const videoId = (b.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i)?.[1] || '').trim();
    const published = (b.match(/<published>([\s\S]*?)<\/published>/i)?.[1] || '').trim();
    if (!title || !videoId) continue;
    if (!YT_IA_RE.test(title)) continue;
    const img = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const link = `https://www.youtube.com/watch?v=${videoId}`;
    const date = published ? new Date(published) : new Date(0);
    items.push({ title, description: '', link, img, source: channelName, date: date.toISOString(), type: 'YouTube', videoId });
    if (items.length >= 5) break;
  }
  return items;
}

// ── Fetch helpers com timeout ─────────────────────────────────────────────────
function fetchFeedSafe(f) {
  return new Promise(resolve => {
    const timer = setTimeout(() => { console.warn(`[intel] ${f.source}: timeout`); resolve([]); }, 12000);
    httpGet(f.url)
      .then(xml => { clearTimeout(timer); resolve(parseRSSItems(xml, f.source)); })
      .catch(e => { clearTimeout(timer); console.error(`[intel] ${f.source}: ${e.message}`); resolve([]); });
  });
}

function fetchYouTubeSafe(ch) {
  return new Promise(resolve => {
    const timer = setTimeout(() => { console.warn(`[intel] YouTube/${ch.name}: timeout`); resolve([]); }, 12000);
    httpGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`)
      .then(xml => { clearTimeout(timer); resolve(parseYouTubeAtom(xml, ch.name)); })
      .catch(e => { clearTimeout(timer); console.error(`[intel] YouTube/${ch.name}: ${e.message}`); resolve([]); });
  });
}

// ── Cache e refresh ───────────────────────────────────────────────────────────
let intelCache = { data: [], ts: 0 };
const INTEL_TTL = 2 * 60 * 60 * 1000;
let refreshing = false;

async function refreshCache() {
  if (refreshing) return;
  refreshing = true;
  console.log('[intel] iniciando refresh...');
  const deadline = new Promise(resolve => setTimeout(resolve, 90000));
  try {
    const { sources } = loadSources();
    const rssFeeds   = sources.filter(s => s.kind === 'rss');
    const ytChannels = sources.filter(s => s.kind === 'youtube').map(s => ({ id: s.channelId, name: s.name }));
    const all = [];
    await Promise.race([
      Promise.all([
        ...rssFeeds.map(f => fetchFeedSafe(f).then(items => all.push(...items.map(a => ({ ...a, type: a.type || f.type || 'Internacional' }))))),
        ...ytChannels.map(ch => fetchYouTubeSafe(ch).then(items => all.push(...items))),
      ]),
      deadline,
    ]);

    const tech = all.filter(a => isTechArticle(a.title));
    tech.sort((a, b) => new Date(b.date) - new Date(a.date));
    const top = tech.slice(0, 60);
    console.log(`[intel] ${all.length} brutos → ${tech.length} filtrados → ${top.length} selecionados`);

    // Traduz título + descrição e busca imagem OG em paralelo
    await Promise.race([
      Promise.allSettled(top.map(async a => {
        const [tTitle, tDesc, imgRes] = await Promise.allSettled([
          translate(a.title),
          translate(a.description),
          a.img ? Promise.resolve(a.img) : fetchOgImage(a.link),
        ]);
        if (tTitle.status === 'fulfilled' && tTitle.value)  a.title       = tTitle.value;
        if (tDesc.status  === 'fulfilled' && tDesc.value)   a.description = tDesc.value;
        if (imgRes.status === 'fulfilled' && imgRes.value)  a.img         = imgRes.value;
      })),
      deadline,
    ]);

    if (top.length > 0) {
      intelCache = { data: top, ts: Date.now() };
      console.log(`[intel] cache atualizado: ${top.length} artigos`);
    } else {
      intelCache = { data: intelCache.data, ts: Date.now() - INTEL_TTL + 3 * 60 * 1000 };
      console.warn('[intel] 0 artigos — retry em 3 min');
    }
  } catch (e) {
    console.error('[intel] refresh falhou:', e.message);
    intelCache = { data: intelCache.data, ts: Date.now() - INTEL_TTL + 3 * 60 * 1000 };
  } finally {
    refreshing = false;
  }
}

refreshCache();
setInterval(refreshCache, INTEL_TTL);

// ── Express ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/intel', (req, res) => {
  res.json(intelCache.data);
  if (Date.now() - intelCache.ts >= INTEL_TTL) refreshCache();
});

// Frontend (produção)
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, () => console.log(`[blog] http://localhost:${PORT}`));
