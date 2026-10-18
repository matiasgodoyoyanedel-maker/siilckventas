(function (global) {
  var DUENOS = ['w4JA6UUF7WeC6UJweKAKdWYMHf73', 'YwjfajkyMXMRHd18eII4dwV03NF3'];

  // postuladoFormulario se marca al ENVIAR la postulación, así que no cuenta como aprobación.
  function aprobadoPorPerfil(uid, perfil) {
    if (uid && DUENOS.indexOf(uid) >= 0) return true;
    var d = perfil || {};
    return d.role === 'seller' || d.is_seller === true;
  }

  function estadoPostulacion(lista) {
    var estados = (lista || []).map(function (p) { return String((p && p.estado) || ''); });
    if (estados.indexOf('aprobado') >= 0) return 'aprobado';
    if (estados.indexOf('pendiente_revision') >= 0) return 'pendiente';
    if (estados.indexOf('rechazado') >= 0) return 'rechazado';
    return 'ninguna';
  }

  async function revisar(db, uid, perfil) {
    if (aprobadoPorPerfil(uid, perfil)) return { aprobado: true, postulacion: 'aprobado' };
    var postulacion = 'ninguna';
    try {
      var snap = await db.collection('postulaciones_vendedores').where('uid', '==', uid).get();
      postulacion = estadoPostulacion(snap.docs.map(function (d) { return d.data(); }));
    } catch (e) {}
    return { aprobado: postulacion === 'aprobado', postulacion: postulacion };
  }

  function textoDetalle(postulacion) {
    if (postulacion === 'pendiente') return 'Tu postulación está en revisión. Te avisaremos apenas el administrador la apruebe.';
    if (postulacion === 'rechazado') return 'Tu postulación anterior no fue aprobada. Puedes postular de nuevo con tus datos completos.';
    return 'Para publicar y vender cuentas primero debes postular y ser aprobado por el administrador.';
  }

  function mostrar(postulacion) {
    var viejo = document.getElementById('sv-aviso-no-vendedor');
    if (viejo) viejo.remove();
    var box = document.createElement('div');
    box.id = 'sv-aviso-no-vendedor';
    box.className = 'fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex items-center justify-center p-4';
    box.innerHTML =
      '<div class="web-panel max-w-md w-full p-7 rounded-3xl border border-yellow-500/50 text-center space-y-4" style="background:rgba(18,18,24,.97)">' +
        '<div class="w-16 h-16 rounded-2xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/40 flex items-center justify-center text-2xl mx-auto"><i class="fas fa-user-lock"></i></div>' +
        '<h3 class="text-xl font-black text-white uppercase tracking-wide">Aún no eres vendedor</h3>' +
        '<p class="text-xs text-zinc-300 leading-relaxed" data-sv-detalle></p>' +
        '<a href="/formulario.html" class="block w-full bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-zinc-950 font-black py-3.5 rounded-2xl uppercase text-sm tracking-wider shadow-xl shadow-yellow-500/30"><i class="fas fa-file-signature mr-1.5"></i> Postula aquí</a>' +
        '<button type="button" data-sv-cerrar class="w-full text-xs text-zinc-400 hover:text-white underline">Volver</button>' +
      '</div>';
    box.querySelector('[data-sv-detalle]').textContent = textoDetalle(postulacion);
    box.querySelector('[data-sv-cerrar]').addEventListener('click', function () {
      if (box.getAttribute('data-sv-bloqueante') === '1') { location.href = '/index.html'; return; }
      box.remove();
    });
    document.body.appendChild(box);
    return box;
  }

  async function interceptar(ev, destino) {
    var fb = global.firebase;
    var user = fb && fb.auth && fb.auth().currentUser;
    if (!user) return;
    ev.preventDefault();
    var href = destino || (ev.currentTarget && ev.currentTarget.getAttribute('href')) || 'publicacion.html';
    try {
      var db = fb.firestore();
      var doc = await db.collection('perfiles').doc(user.uid).get();
      var r = await revisar(db, user.uid, doc.exists ? doc.data() : {});
      if (r.aprobado) {
        location.href = href;
        return;
      }
      mostrar(r.postulacion);
    } catch (e) {
      location.href = href;
    }
  }

  global.SiilckVendedor = {
    aprobadoPorPerfil: aprobadoPorPerfil,
    estadoPostulacion: estadoPostulacion,
    revisar: revisar,
    mostrar: mostrar,
    interceptar: interceptar
  };
})(typeof window !== 'undefined' ? window : globalThis);
