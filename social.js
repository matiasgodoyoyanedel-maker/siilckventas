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
    sello.title = "SiilckVentas opera como organizador independiente de marketplace con escrow";
    document.body.appendChild(sello);

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
    if (!raw) return Infinity;
    if (typeof raw.toDate === "function") return Date.now() - raw.toDate().getTime();
    if (raw.seconds) return Date.now() - raw.seconds * 1000;
    return Infinity;
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

  function listenConfig(db) {
    function applyDoc(data) {
      const cfg = data || {};
      pintarWhatsapp(cfg.whatsappNumber || WA_DEFAULT);
      pintarBanner(cfg);
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

  function listenActivity(db) {
    db.collection("recentActivity").orderBy("createdAt", "desc").limit(8).onSnapshot(function (snap) {
      if (!primedActivity) {
        primedActivity = true;
        const first = snap.docs[0];
        if (first) mostrarBarra(first.id, first.data());
        return;
      }
      snap.docChanges().forEach(function (ch) {
        if (ch.type !== "added") return;
        const d = ch.doc.data();
        if (ch.doc.id === lastBarId) return;
        mostrarBarra(ch.doc.id, d);
        mostrarToast(d);
      });
    }, function () {});
  }

  function boot() {
    ensureUi();
    pintarWhatsapp(WA_DEFAULT);
    waitFirebase(function (db) {
      listenConfig(db);
      listenActivity(db);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
