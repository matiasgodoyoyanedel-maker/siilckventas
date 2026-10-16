(function () {
  var OWNERS = ['YwjfajkyMXMRHd18eII4dwV03NF3', 'w4JA6UUF7WeC6UJweKAKdWYMHf73'];
  var user;
  var perfil = null;
  var configLista = false;
  var modo = false;
  var authListo = false;

  function ruta() {
    var p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    return p;
  }

  function rutaLibre() {
    var p = ruta();
    return p === '/mantenimiento' || p === '/login' || p === '/login.html' || p === '/verificar-correo' || p === '/verificar-correo.html' || p === '/recuperar' || p === '/recuperar.html' || p === '/recuperar-contrasena' || p === '/recuperar-contrasena.html' || p === '/api/mantenimiento';
  }

  function sinVerificarCorreo() {
    return rutaLibre();
  }

  function esDueno(uid, data) {
    if (uid && OWNERS.indexOf(uid) !== -1) return true;
    if (data && (data.role === 'admin' || data.esAdmin || data.role === 'owner')) return true;
    return false;
  }

  function css() {
    if (document.getElementById('sv-guardia-css')) return;
    var s = document.createElement('style');
    s.id = 'sv-guardia-css';
    s.textContent = '#sv-bloqueo,#sv-feliz-vendedor{position:fixed;inset:0;z-index:10000;background:rgba(5,0,20,.96);display:flex;align-items:center;justify-content:center;padding:24px}' +
      '#sv-bloqueo .caja,#sv-feliz-vendedor .caja{max-width:420px;width:100%;background:#121218;border:1px solid rgba(250,204,21,.45);border-radius:28px;padding:32px 24px;text-align:center;color:#fff;font-family:Outfit,sans-serif}' +
      '#sv-bloqueo h2,#sv-feliz-vendedor h2{font-size:22px;margin:12px 0 8px}' +
      '#sv-bloqueo p,#sv-feliz-vendedor p{color:#d4d4d8;font-size:14px;line-height:1.5}' +
      '#sv-bloqueo button,#sv-feliz-vendedor button{margin-top:18px;background:#facc15;color:#09090b;border:0;border-radius:14px;padding:12px 18px;font-weight:800;cursor:pointer}';
    document.head.appendChild(s);
  }

  function mostrarBloqueo() {
    css();
    if (document.getElementById('sv-bloqueo')) return;
    var fondo = document.createElement('div');
    fondo.id = 'sv-bloqueo';
    fondo.innerHTML = '<div class="caja"><img src="/icon.png" alt="SiilckVentas" width="72" height="72" style="border-radius:18px;margin:0 auto">' +
      '<h2>Has sido bloqueado</h2><p>Has sido bloqueado, no puedes seguir navegando en esta web.</p>' +
      '<button type="button" id="sv-bloqueo-salir">Cerrar sesión</button></div>';
    document.body.appendChild(fondo);
    document.body.style.overflow = 'hidden';
    document.getElementById('sv-bloqueo-salir').onclick = function () {
      if (window.firebase && firebase.auth) firebase.auth().signOut().finally(function () { location.href = '/login'; });
    };
  }

  function quitarBloqueo() {
    var n = document.getElementById('sv-bloqueo');
    if (n) n.remove();
    if (!document.getElementById('sv-feliz-vendedor')) document.body.style.overflow = '';
  }

  function mostrarVendedor() {
    css();
    if (document.getElementById('sv-feliz-vendedor') || document.getElementById('sv-bloqueo')) return;
    var fondo = document.createElement('div');
    fondo.id = 'sv-feliz-vendedor';
    fondo.innerHTML = '<div class="caja"><img src="/icon.png" alt="SiilckVentas" width="72" height="72" style="border-radius:18px;margin:0 auto">' +
      '<h2>Felicidades</h2><p>Felicidades, ahora eres vendedor de nuestra página.</p>' +
      '<button type="button" id="sv-feliz-ir">Ir a vender</button></div>';
    document.body.appendChild(fondo);
    document.getElementById('sv-feliz-ir').onclick = function () {
      var uid = user && user.uid;
      var ir = function () { location.href = '/vender'; };
      if (!uid || !window.firebase) return ir();
      firebase.firestore().collection('perfiles').doc(uid).set({ avisoVendedorPendiente: false }, { merge: true }).then(ir, ir);
    };
  }

  function aplicar() {
    if (!configLista || !authListo) return;
    if (user && !sinVerificarCorreo() && (user.emailVerified === false || (perfil && perfil.verificadoForzado === false))) {
      location.replace('/verificar-correo' + (user.email ? ('?email=' + encodeURIComponent(user.email)) : ''));
      return;
    }
    var owner = user && esDueno(user.uid, perfil);
    if (modo && !owner && !rutaLibre()) {
      location.replace('/mantenimiento');
      return;
    }
    var bloqueado = !!(perfil && (perfil.bloqueado || perfil.is_blocked));
    if (user && bloqueado && !owner) {
      mostrarBloqueo();
      return;
    }
    quitarBloqueo();
    if (user && perfil && perfil.avisoVendedorPendiente && (perfil.is_seller || perfil.cuentaVendedorActiva)) mostrarVendedor();
  }

  function vigilarCorreo() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(function (u) {
      if (!u || u.emailVerified !== false || sinVerificarCorreo()) return;
      location.replace('/verificar-correo' + (u.email ? ('?email=' + encodeURIComponent(u.email)) : ''));
    });
  }

  function arrancar() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length || !firebase.auth || !firebase.firestore) return;
    var db = firebase.firestore();
    db.collection('configuracion').doc('global').onSnapshot(function (doc) {
      var d = doc.exists ? doc.data() : {};
      modo = !!(d.maintenance_mode || d.mantenimientoActivo);
      configLista = true;
      aplicar();
    }, function () {
      configLista = true;
      aplicar();
    });
    var perfilUnsub = null;
    firebase.auth().onAuthStateChanged(function (u) {
      user = u || null;
      authListo = true;
      if (perfilUnsub) { perfilUnsub(); perfilUnsub = null; }
      if (!user) { perfil = null; aplicar(); return; }
      perfilUnsub = db.collection('perfiles').doc(user.uid).onSnapshot(function (s) {
        perfil = s.exists ? s.data() : {};
        aplicar();
      }, function () {
        perfil = {};
        aplicar();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { vigilarCorreo(); arrancar(); });
  else { vigilarCorreo(); arrancar(); }
})();
