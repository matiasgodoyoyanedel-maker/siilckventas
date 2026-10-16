(function () {
  function texto(v) {
    const s = v == null ? "" : String(v).trim();
    return s || "No indicado";
  }

  function fecha(v) {
    if (!v) return "Sin fecha";
    const d = v.toDate ? v.toDate() : (v.seconds ? new Date(v.seconds * 1000) : new Date(v));
    if (!d || isNaN(d.getTime())) return "Sin fecha";
    return d.toLocaleString("es-CL");
  }

  function esImagen(src) {
    return typeof src === "string" && (/^data:image\//.test(src) || /^https?:\/\//.test(src));
  }

  function fila(etiqueta, valor) {
    const wrap = document.createElement("div");
    wrap.className = "sv-post-row";
    const k = document.createElement("span");
    k.textContent = etiqueta;
    const val = document.createElement("p");
    val.textContent = texto(valor);
    wrap.appendChild(k);
    wrap.appendChild(val);
    return wrap;
  }

  function foto(etiqueta, src, alAbrir) {
    const wrap = document.createElement("div");
    wrap.className = "sv-post-foto";
    const k = document.createElement("span");
    k.textContent = etiqueta;
    wrap.appendChild(k);
    if (!esImagen(src)) {
      const vacio = document.createElement("p");
      vacio.textContent = "Sin archivo";
      wrap.appendChild(vacio);
      return wrap;
    }
    const img = document.createElement("img");
    img.src = src;
    img.alt = etiqueta;
    wrap.appendChild(img);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Ver foto";
    btn.addEventListener("click", function () { alAbrir(src, etiqueta); });
    wrap.appendChild(btn);
    return wrap;
  }

  function asegurar() {
    let root = document.getElementById("sv-post-detalle");
    if (root) return root;
    root = document.createElement("div");
    root.id = "sv-post-detalle";
    root.className = "sv-post-modal";
    root.innerHTML = '<div class="sv-post-sheet" role="dialog" aria-modal="true" aria-labelledby="sv-post-titulo">' +
      '<button type="button" class="sv-post-x" data-cerrar="1" aria-label="Cerrar">×</button>' +
      '<h3 id="sv-post-titulo">Postulación</h3>' +
      '<div class="sv-post-body"></div>' +
      '<div class="sv-post-actions"></div>' +
      '</div>' +
      '<div id="sv-post-zoom" class="sv-post-zoom"><img alt=""><button type="button">Cerrar foto</button></div>';
    document.body.appendChild(root);
    if (!document.getElementById("sv-post-detalle-css")) {
      const css = document.createElement("style");
      css.id = "sv-post-detalle-css";
      css.textContent = '.sv-post-modal{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.82);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}' +
        '.sv-post-modal.open{display:flex}' +
        '.sv-post-sheet{position:relative;width:min(860px,100%);background:#121216;border:1px solid rgba(255,193,7,.35);border-radius:24px;padding:22px 18px 18px;color:#fff}' +
        '.sv-post-sheet h3{font-size:18px;font-weight:900;margin:0 36px 14px 0}' +
        '.sv-post-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:0;background:#27272a;color:#fff;font-size:22px;cursor:pointer}' +
        '.sv-post-body{display:grid;gap:10px}' +
        '.sv-post-row span,.sv-post-foto span{display:block;color:#FFD740;font-size:10px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;margin-bottom:3px}' +
        '.sv-post-row p,.sv-post-foto p{margin:0;color:#e4e4e7;font-size:13px;line-height:1.45;white-space:pre-wrap}' +
        '.sv-post-fotos{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}' +
        '.sv-post-foto img{width:100%;height:110px;object-fit:cover;border-radius:12px;border:1px solid #3f3f46;background:#09090b}' +
        '.sv-post-foto button,.sv-post-actions button{margin-top:6px;border:0;border-radius:12px;padding:8px 12px;font-size:11px;font-weight:800;cursor:pointer}' +
        '.sv-post-foto button{background:#27272a;color:#fff}' +
        '.sv-post-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}' +
        '.sv-post-ok{background:#059669;color:#fff}.sv-post-no{background:#e11d48;color:#fff}' +
        '.sv-post-zoom{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:16px;z-index:2}' +
        '.sv-post-zoom.open{display:flex}.sv-post-zoom img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:12px}' +
        '.sv-post-zoom button{background:#FFC107;color:#111;border:0;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer}';
      document.head.appendChild(css);
    }
    root.addEventListener("click", function (e) {
      if (e.target === root || e.target.getAttribute("data-cerrar")) cerrar();
    });
    root.querySelector(".sv-post-zoom button").addEventListener("click", function () {
      root.querySelector(".sv-post-zoom").classList.remove("open");
    });
    return root;
  }

  function abrir(postulacion, acciones) {
    const p = postulacion || {};
    const root = asegurar();
    const body = root.querySelector(".sv-post-body");
    const actions = root.querySelector(".sv-post-actions");
    body.textContent = "";
    actions.textContent = "";
    root.querySelector("#sv-post-titulo").textContent = texto(p.nombre) === "No indicado" ? "Postulación" : p.nombre;

    const avatar = p.fotoPerfil || p.selfieCarnet || "";
    if (esImagen(avatar)) {
      const head = document.createElement("img");
      head.src = avatar;
      head.alt = "Foto de perfil";
      head.style.cssText = "width:84px;height:84px;object-fit:cover;border-radius:18px;border:1px solid rgba(255,193,7,.4)";
      body.appendChild(head);
    }

    body.appendChild(fila("Nombre", p.nombre));
    body.appendChild(fila("Edad", p.edad));
    body.appendChild(fila("RUT", p.rut));
    body.appendChild(fila("Contacto", p.contacto));
    body.appendChild(fila("Correo", p.emailUsuario));
    body.appendChild(fila("País", p.pais));
    body.appendChild(fila("Experiencia", p.experiencia));
    body.appendChild(fila("Motivación", p.motivo));
    body.appendChild(fila("Redes / cómo nos conoció", p.redes || p.conocio));
    body.appendChild(fila("Ventas estimadas", p.volumen));
    body.appendChild(fila("Fecha de postulación", fecha(p.fecha)));
    body.appendChild(fila("Estado", p.estado));

    const fotos = document.createElement("div");
    fotos.className = "sv-post-fotos";
    function zoom(src) {
      const box = root.querySelector(".sv-post-zoom");
      box.querySelector("img").src = src;
      box.classList.add("open");
    }
    fotos.appendChild(foto("Carnet frente", p.carnetFrente, zoom));
    fotos.appendChild(foto("Carnet atrás", p.carnetAtras, zoom));
    fotos.appendChild(foto("Selfie con carnet", p.selfieCarnet, zoom));
    const refs = Array.isArray(p.referenciasFotos) ? p.referenciasFotos : [];
    refs.forEach(function (src, i) { fotos.appendChild(foto("Referencia " + (i + 1), src, zoom)); });
    body.appendChild(fotos);

    if (acciones && typeof acciones.onAprobar === "function") {
      const ok = document.createElement("button");
      ok.type = "button";
      ok.className = "sv-post-ok";
      ok.textContent = "Aprobar";
      ok.addEventListener("click", function () { acciones.onAprobar(p); });
      actions.appendChild(ok);
    }
    if (acciones && typeof acciones.onRechazar === "function") {
      const no = document.createElement("button");
      no.type = "button";
      no.className = "sv-post-no";
      no.textContent = "Rechazar";
      no.addEventListener("click", function () { acciones.onRechazar(p); });
      actions.appendChild(no);
    }
    root.classList.add("open");
  }

  function cerrar() {
    const root = document.getElementById("sv-post-detalle");
    if (!root) return;
    root.classList.remove("open");
    const zoom = root.querySelector(".sv-post-zoom");
    if (zoom) zoom.classList.remove("open");
  }

  window.PostulacionDetalleModal = { abrir: abrir, cerrar: cerrar };
})();
