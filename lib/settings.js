import { formatPrice, convertPrice } from './currency.js';

const STORAGE_KEY = 'siilck-settings';
const IDIOMAS = [
  { id: 'es', flag: '🇨🇱', label: 'Español' },
  { id: 'en', flag: '🇺🇸', label: 'English' },
  { id: 'pt', flag: '🇧🇷', label: 'Português' },
  { id: 'fr', flag: '🇫🇷', label: 'Français' },
  { id: 'it', flag: '🇮🇹', label: 'Italiano' }
];
const MONEDAS = [
  { id: 'CLP', label: 'CLP $ - Peso Chileno' },
  { id: 'USD', label: 'USD $ - Dólar' },
  { id: 'BRL', label: 'BRL R$ - Real' },
  { id: 'EUR', label: 'EUR € - Euro' }
];

const dict = {};
const state = leer();

function leer() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const language = IDIOMAS.some((x) => x.id === raw.language) ? raw.language : 'es';
    const currency = MONEDAS.some((x) => x.id === raw.currency) ? raw.currency : 'CLP';
    return { language, currency };
  } catch (e) {
    return { language: 'es', currency: 'CLP' };
  }
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ language: state.language, currency: state.currency }));
}

function traduccion(key) {
  const tabla = dict[state.language] || {};
  if (tabla[key]) return tabla[key];
  if (dict.es && dict.es[key]) return dict.es[key];
  return '';
}

function t(key) {
  return traduccion(key) || key;
}

function setLanguage(language) {
  if (!IDIOMAS.some((x) => x.id === language) || state.language === language) return;
  state.language = language;
  emitir();
}

function setCurrency(currency) {
  if (!MONEDAS.some((x) => x.id === currency) || state.currency === currency) return;
  state.currency = currency;
  emitir();
}

function aplicar() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const texto = traduccion(el.getAttribute('data-i18n'));
    if (texto) el.textContent = texto;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const texto = traduccion(el.getAttribute('data-i18n-placeholder'));
    if (texto) el.setAttribute('placeholder', texto);
  });
  const verificada = traduccion('verified');
  if (verificada) {
    document.querySelectorAll('.g-verified').forEach((el) => {
      el.textContent = verificada;
    });
  }
  document.querySelectorAll('[data-precio-clp]').forEach((el) => {
    const prefijo = el.getAttribute('data-precio-prefijo') || '';
    el.textContent = prefijo + formatPrice(el.getAttribute('data-precio-clp'), state.currency);
  });
  const etiqueta = document.getElementById('sv-locale-label');
  if (etiqueta) etiqueta.textContent = '🌐 ' + state.language.toUpperCase() + ' / ' + state.currency;
  pintarActivos();
}

function emitir() {
  guardar();
  aplicar();
  document.dispatchEvent(new CustomEvent('siilck-settings'));
}

function pintarActivos() {
  document.querySelectorAll('[data-sv-lang]').forEach((btn) => {
    const on = btn.getAttribute('data-sv-lang') === state.language;
    btn.classList.toggle('border-yellow-500', on);
    btn.classList.toggle('bg-yellow-500/10', on);
    btn.classList.toggle('text-white', on);
    btn.classList.toggle('border-zinc-800', !on);
    btn.classList.toggle('text-zinc-300', !on);
  });
  document.querySelectorAll('[data-sv-cur]').forEach((btn) => {
    const on = btn.getAttribute('data-sv-cur') === state.currency;
    btn.classList.toggle('border-yellow-500', on);
    btn.classList.toggle('bg-yellow-500/10', on);
    btn.classList.toggle('text-white', on);
    btn.classList.toggle('border-zinc-800', !on);
    btn.classList.toggle('text-zinc-300', !on);
  });
}

function esDesktop() {
  return window.matchMedia('(min-width: 768px)').matches;
}

function colocar() {
  const boton = document.getElementById('sv-locale-btn');
  const panel = document.getElementById('sv-locale-panel');
  if (!boton || !panel) return;
  if (esDesktop()) {
    const r = boton.getBoundingClientRect();
    panel.style.top = Math.round(r.bottom + 8) + 'px';
    panel.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + 'px';
    panel.style.left = 'auto';
    panel.style.bottom = 'auto';
  } else {
    panel.style.top = '';
    panel.style.right = '';
    panel.style.left = '';
    panel.style.bottom = '';
  }
}

function abrir(abierto) {
  const panel = document.getElementById('sv-locale-panel');
  const fondo = document.getElementById('sv-locale-backdrop');
  const boton = document.getElementById('sv-locale-btn');
  if (!panel) return;
  if (abierto) colocar();
  panel.classList.toggle('open', abierto);
  if (fondo) fondo.classList.toggle('open', abierto);
  if (boton) boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
}

function montar() {
  if (document.getElementById('sv-locale')) return;
  const slot = document.getElementById('sv-locale-slot');
  const ancla = document.getElementById('auth-nav-area');
  const host = slot || (ancla && ancla.parentElement);
  if (!host) return;
  const caja = document.createElement('div');
  caja.id = 'sv-locale';
  caja.className = 'relative';
  caja.innerHTML =
    '<button type="button" id="sv-locale-btn" class="bg-zinc-900 text-white border border-zinc-800 hover:border-yellow-500/50 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap" aria-haspopup="dialog" aria-expanded="false">' +
      '<span id="sv-locale-label">🌐 ES / CLP</span>' +
    '</button>' +
    '<div id="sv-locale-backdrop" class="sv-locale-backdrop"></div>' +
    '<div id="sv-locale-panel" class="sv-locale-panel" role="dialog" aria-label="Idioma y moneda">' +
      '<div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-700 md:hidden"></div>' +
      '<p class="text-[11px] font-black uppercase tracking-wider text-yellow-400 mb-2">Idioma / Language</p>' +
      '<div class="space-y-1.5" id="sv-locale-langs"></div>' +
      '<p class="text-[11px] font-black uppercase tracking-wider text-yellow-400 mt-4 mb-2">Moneda / Currency</p>' +
      '<div class="space-y-1.5" id="sv-locale-curs"></div>' +
    '</div>';
  if (slot) slot.replaceWith(caja);
  else host.insertBefore(caja, ancla);

  const fondo = caja.querySelector('#sv-locale-backdrop');
  const panel = caja.querySelector('#sv-locale-panel');
  document.body.appendChild(fondo);
  document.body.appendChild(panel);

  const langs = panel.querySelector('#sv-locale-langs');
  const curs = panel.querySelector('#sv-locale-curs');
  IDIOMAS.forEach((idioma) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-sv-lang', idioma.id);
    btn.className = 'w-full text-left px-3 py-2.5 rounded-xl border text-sm font-bold transition';
    btn.textContent = idioma.flag + '  ' + idioma.label + ' (' + idioma.id + ')';
    btn.addEventListener('click', () => setLanguage(idioma.id));
    langs.appendChild(btn);
  });
  MONEDAS.forEach((moneda) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-sv-cur', moneda.id);
    btn.className = 'w-full text-left px-3 py-2.5 rounded-xl border text-sm font-bold transition';
    btn.textContent = moneda.label;
    btn.addEventListener('click', () => setCurrency(moneda.id));
    curs.appendChild(btn);
  });

  caja.querySelector('#sv-locale-btn').addEventListener('click', (ev) => {
    ev.stopPropagation();
    abrir(!panel.classList.contains('open'));
  });
  fondo.addEventListener('click', () => abrir(false));
  document.addEventListener('click', (ev) => {
    if (!panel.classList.contains('open')) return;
    if (caja.contains(ev.target) || panel.contains(ev.target)) return;
    abrir(false);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') abrir(false);
  });
  window.addEventListener('resize', () => {
    if (panel.classList.contains('open')) colocar();
  });
  window.addEventListener('scroll', () => {
    if (panel.classList.contains('open') && esDesktop()) colocar();
  }, true);
}

function estilo() {
  if (document.getElementById('sv-locale-css')) return;
  const tag = document.createElement('style');
  tag.id = 'sv-locale-css';
  tag.textContent =
    '.sv-locale-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:70;opacity:0;pointer-events:none;transition:opacity .25s ease}' +
    '.sv-locale-backdrop.open{opacity:1;pointer-events:auto}' +
    '.sv-locale-panel{position:fixed;left:0;right:0;bottom:0;z-index:80;max-height:86vh;overflow:auto;background:#09090b;border:1px solid #27272a;border-bottom:0;border-radius:24px 24px 0 0;padding:12px 16px 28px;transform:translateY(110%);opacity:0;pointer-events:none;transition:transform .28s ease,opacity .28s ease}' +
    '.sv-locale-panel.open{transform:translateY(0);opacity:1;pointer-events:auto}' +
    '@media(min-width:768px){.sv-locale-backdrop{display:none}.sv-locale-panel{left:auto;right:16px;bottom:auto;width:320px;border-radius:16px;border-bottom:1px solid #27272a;transform:translateY(-8px);opacity:0}.sv-locale-panel.open{transform:translateY(0);opacity:1}}' +
    '#sv-locale-btn,#sv-locale-btn.text-white{background:#fff!important;color:#0f172a!important;border:1px solid #d7e4f4!important}' +
    '#sv-locale-label{color:#0f172a!important}' +
    '.sv-locale-panel{background:#fff!important;color:#111827!important;border-color:#e5e7eb!important}' +
    '.sv-locale-panel p,.sv-locale-panel .text-yellow-400{color:#b45309!important}' +
    '.sv-locale-panel button,.sv-locale-panel .text-zinc-300,.sv-locale-panel .text-white{color:#111827!important;background:#f8fafc!important;border-color:#e5e7eb!important}' +
    '.sv-locale-panel button.border-yellow-500{background:#fffbeb!important;color:#92400e!important;border-color:#f59e0b!important}';
  document.head.appendChild(tag);
}

window.SiilckSettings = {
  get language() { return state.language; },
  get currency() { return state.currency; },
  setLanguage,
  setCurrency,
  t,
  formatPrice: (precioCLP, currency) => formatPrice(precioCLP, currency || state.currency),
  convertPrice: (precioCLP, currency) => convertPrice(precioCLP, currency || state.currency)
};

estilo();
montar();
aplicar();

Promise.all(IDIOMAS.map((idioma) =>
  fetch('/locales/' + idioma.id + '.json').then((r) => r.json()).then((json) => { dict[idioma.id] = json; })
)).then(aplicar).catch(() => {});
