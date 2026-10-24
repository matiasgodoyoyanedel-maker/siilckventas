(function () {
  const WA_DEFAULT = "56950095612";
  const WA_TEXT = "Hola%20vengo%20de%20SiilckVentas%20quiero%20consultar";
  let lastBarId = "";
  let barTimer = null;
  let primedActivity = false;

  function $(id) {
    return document.getElementById(id);
  }

  function waitFirebase(cb) {
    let n = 0;
    const t = setInterval(function () {
      n += 1;
      if (window.firebase && firebase.apps && firebase.apps.length) {
        clearInterval(t);
        cb(firebase.firestore());
      }
      if (n > 50) clearInterval(t);
    }, 200);
  }

  function numeroWa(raw) {
    const digits = String(raw || WA_DEFAULT).replace(/\D/g, "");
    return digits || WA_DEFAULT;
  }

  function ensureUi() {
    if ($("sv-top-live-bar")) return;

    const bar = document.createElement("div");
    bar.id = "sv-top-live-bar";
    bar.setAttribute("aria-live", "polite");
    bar.innerHTML = '<span id="sv-top-live-text"></span>';
    document.body.appendChild(bar);

    const toasts = document.createElement("div");
    toasts.id = "sv-social-toasts";
    document.body.appendChild(toasts);

    const sello = document.createElement("div");
    sello.id = "sv-sello-org";
    sello.innerHTML = '<i class="fas fa-certificate"></i><span>Sello organizador independiente</span>';
    sello.title = "SiilckVentas opera como organizador independiente de marketplace con escrow · Arrástrame";
    document.body.appendChild(sello);
    hacerSelloMovible(sello);

    const wa = document.createElement("a");
    wa.id = "sv-whatsapp-float";
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", "WhatsApp SiilckVentas");
    wa.href = "https://wa.me/" + WA_DEFAULT + "?text=" + WA_TEXT;
    wa.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(wa);

    const aviso = document.createElement("div");
    aviso.id = "sv-banner-mantenimiento";
    aviso.className = "hidden";
    aviso.innerHTML = '<span id="sv-banner-mantenimiento-txt"></span>';
    document.body.appendChild(aviso);
  }

  function pintarWhatsapp(numero) {
    const a = $("sv-whatsapp-float");
    if (!a) return;
    a.href = "https://wa.me/" + numeroWa(numero) + "?text=" + WA_TEXT;
  }

  function pintarBanner(cfg) {
    const box = $("sv-banner-mantenimiento");
    const txt = $("sv-banner-mantenimiento-txt");
    if (!box || !txt) return;
    const activo = !!(cfg.mantenimientoActivo || cfg.avisoNotifActivo);
    const msg = cfg.avisoMantenimiento || (cfg.mantenimientoActivo ? "Sitio en mantención. WhatsApp sigue disponible." : "");
    if (activo && msg) {
      txt.textContent = msg;
      box.classList.remove("hidden");
      document.body.classList.add("sv-has-maint-banner");
    } else {
      box.classList.add("hidden");
      document.body.classList.remove("sv-has-maint-banner");
    }
  }

  function edadMs(data) {
    const raw = data && data.createdAt;
    if (!raw) return 0;
    let t = 0;
    if (typeof raw.toDate === "function") t = raw.toDate().getTime();
    else if (typeof raw.seconds === "number") t = raw.seconds * 1000;
    else if (typeof raw._seconds === "number") t = raw._seconds * 1000;
    if (!t) return 0;
    const n = Date.now() - t;
    return n < 0 ? 0 : n;
  }

  function textoActividad(d) {
    if (!d) return "";
    if (d.type === "new_seller") {
      return "✅ " + (d.nombreAnonimizado || "Alguien") + " se acaba de hacer vendedor";
    }
    return "🔥 " + (d.nombreAnonimizado || "Alguien") + " acaba de comprar " + (d.producto || "una cuenta");
  }

  function mostrarBarra(id, data) {
    const bar = $("sv-top-live-bar");
    const txt = $("sv-top-live-text");
    if (!bar || !txt) return;
    if (edadMs(data) > 2 * 60 * 1000) return;
    txt.textContent = textoActividad(data);
    bar.classList.add("sv-livebar-on");
    document.body.classList.add("sv-livebar-pad");
    lastBarId = id;
    clearTimeout(barTimer);
    barTimer = setTimeout(function () {
      bar.classList.remove("sv-livebar-on");
      document.body.classList.remove("sv-livebar-pad");
    }, 6000);
  }

  function mostrarToast(data) {
    const box = $("sv-social-toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "sv-social-toast";
    el.textContent = textoActividad(data);
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () {
      el.classList.add("sv-social-toast-out");
      setTimeout(function () { el.remove(); }, 320);
    }, 5000);
  }

  function claveAct(u) {
    if (!u) return "";
    const t = u.createdAt || {};
    return [u.type, u.nombreAnonimizado, u.producto, t.seconds || t._seconds || ""].join("|");
  }

  function aplicarActividad(u, conToast) {
    if (!u || !u.type) return;
    const key = claveAct(u);
    if (!key) return;
    if (!primedActivity) {
      primedActivity = true;
      lastBarId = key;
      mostrarBarra(key, u);
      return;
    }
    if (key !== lastBarId) {
      lastBarId = key;
      mostrarBarra(key, u);
      if (conToast) mostrarToast(u);
    }
  }

  function listenConfig(db) {
    function applyDoc(data) {
      const cfg = data || {};
      pintarWhatsapp(cfg.whatsappNumber || WA_DEFAULT);
      pintarBanner(cfg);
      aplicarActividad(cfg.ultimaActividad, primedActivity);
    }
    db.collection("config").doc("general").onSnapshot(function (doc) {
      if (doc.exists && doc.data().whatsappNumber) pintarWhatsapp(doc.data().whatsappNumber);
    }, function () {});
    db.collection("configuracion").doc("global").onSnapshot(function (doc) {
      applyDoc(doc.exists ? doc.data() : {});
    }, function () {
      applyDoc({});
    });
  }

  function hacerSelloMovible(el){
    let dragging = false, offsetX = 0, offsetY = 0, hasMoved = false;
    function anchoSello(){
      return el.getBoundingClientRect().width || el.offsetWidth || 160;
    }
    function altoSello(){
      return el.getBoundingClientRect().height || el.offsetHeight || 40;
    }
    function aplicarPos(x, y){
      el.classList.add('sv-sello-moved');
      el.style.setProperty('--sv-sello-x', x + 'px');
      el.style.setProperty('--sv-sello-y', y + 'px');
      el.style.setProperty('left', x + 'px', 'important');
      el.style.setProperty('top', y + 'px', 'important');
      el.style.setProperty('right', 'auto', 'important');
      el.style.setProperty('bottom', 'auto', 'important');
      el.style.setProperty('width', 'max-content', 'important');
    }
    function onStart(e){
      dragging = true; hasMoved = false;
      const t = e.touches ? e.touches[0] : e;
      const rect = el.getBoundingClientRect();
      offsetX = t.clientX - rect.left;
      offsetY = t.clientY - rect.top;
      el.style.cursor = 'grabbing';
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      hasMoved = true;
      const t = e.touches ? e.touches[0] : e;
      let x = t.clientX - offsetX;
      let y = t.clientY - offsetY;
      const maxX = window.innerWidth - anchoSello();
      const maxY = window.innerHeight - altoSello();
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      aplicarPos(x, y);
      try{ localStorage.setItem('sv-sello-pos', x + ',' + y); }catch(e2){}
    }
    function onEnd(){ dragging = false; el.style.cursor = 'grab'; }
    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onStart);
    el.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    try{
      const saved = localStorage.getItem('sv-sello-pos');
      if(saved){
        const parts = saved.split(',');
        const x = Math.max(0, Math.min(Number(parts[0]), window.innerWidth - anchoSello()));
        const y = Math.max(0, Math.min(Number(parts[1]), window.innerHeight - altoSello()));
        aplicarPos(x, y);
      }
    }catch(e2){}
  }

  function boot() {
    ensureUi();
    pintarWhatsapp(WA_DEFAULT);
    waitFirebase(function (db) {
      listenConfig(db);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
