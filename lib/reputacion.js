export const RETIRO_MINIMO = 5000;
export const DIA_MS = 24 * 60 * 60 * 1000;

export function diasRetencion(garantia) {
  const n = Math.round(Number(garantia) || 0);
  if (n >= 5682) return 180;
  if (n >= 2841) return 90;
  return 10;
}

export function montoVendedor(item) {
  if (!item || item.tipoItem === 'pase_vip' || item.tipo === 'servicio') return 0;
  const cantidad = Math.max(1, parseInt(item.cantidad, 10) || 1);
  const final = Number(item.precioFinal);
  if (final >= 1) return Math.round(final * cantidad);
  const precio = Number(item.precio) || 0;
  const garantia = Math.round(Number(item.garantia) || 0);
  const base = precio - garantia;
  return base >= 1 ? Math.round(base * cantidad) : 0;
}

export function promedioEstrellas(resenas) {
  const validas = (resenas || []).map((r) => Number(r && r.estrellas)).filter((n) => n >= 1 && n <= 5);
  if (!validas.length) return { promedio: 0, total: 0 };
  const suma = validas.reduce((a, b) => a + b, 0);
  return { promedio: Math.round((suma / validas.length) * 10) / 10, total: validas.length };
}

export function textoEstrellas(promedio, total) {
  const n = Number(total) > 0 ? Math.max(0, Math.min(5, Number(promedio) || 0)) : 0;
  const llenas = Math.round(n);
  if (!Number(total)) return 'Nuevo';
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
}

export function esEntregaInmediata(pub) {
  return !pub || pub.entregaInmediata !== false;
}

export function precioLista(pub, getOferta) {
  const base = Number(pub && pub.precio) || 0;
  if (typeof getOferta === 'function') {
    const oferta = getOferta(base, pub);
    if (oferta && Number(oferta.ahora) >= 1) return Number(oferta.ahora);
  }
  const final = Number(pub && pub.precioFinal);
  if (pub && pub.ofertaActiva && final >= 1) return final;
  return base;
}

export function pasaFiltros(pub, filtros) {
  const f = filtros || {};
  const nivel = String(f.nivel || '').trim().toLowerCase();
  if (nivel) {
    const blob = `${pub.nivel || ''} ${pub.rango || ''}`.toLowerCase();
    if (!blob.includes(nivel)) return false;
  }
  const region = String(f.region || '').trim().toLowerCase();
  if (region && !String(pub.region || '').toLowerCase().includes(region)) return false;
  const precio = Number(f.precio);
  const min = f.min === '' || f.min == null ? null : Number(f.min);
  const max = f.max === '' || f.max == null ? null : Number(f.max);
  if (min != null && !Number.isNaN(min) && precio < min) return false;
  if (max != null && !Number.isNaN(max) && max > 0 && precio > max) return false;
  return true;
}

export function debeLiberar(mov, ahora = Date.now()) {
  if (!mov || mov.estado !== 'retenido') return false;
  const libera = Number(mov.liberaEn) || 0;
  return libera > 0 && libera <= ahora;
}

export function puedeRetirar(saldo, monto) {
  const n = Math.round(Number(monto) || 0);
  const disp = Math.round(Number(saldo && saldo.disponible) || 0);
  if (n < RETIRO_MINIMO) {
    return { ok: false, error: 'El retiro mínimo es $5.000.' };
  }
  if (n > disp) return { ok: false, error: 'No tienes saldo disponible suficiente.' };
  return { ok: true, monto: n };
}

export function normalizarResena({ estrellas, comentario } = {}) {
  const n = Math.round(Number(estrellas));
  if (n < 1 || n > 5) return { ok: false, error: 'Elige de 1 a 5 estrellas.' };
  const texto = String(comentario || '').trim().slice(0, 500);
  if (texto.length < 4) return { ok: false, error: 'Escribe una reseña corta (mínimo 4 caracteres).' };
  return { ok: true, estrellas: n, comentario: texto };
}

const MOTIVOS_RECLAMO = [
  'Cuenta con datos cambiados',
  'Cuenta baneada',
  'No recibí la cuenta',
  'El vendedor no responde',
  'Otro'
];

export function motivosReclamo() {
  return MOTIVOS_RECLAMO.slice();
}

export function normalizarReclamo({ motivo, detalle } = {}) {
  const m = MOTIVOS_RECLAMO.includes(motivo) ? motivo : '';
  if (!m) return { ok: false, error: 'Elige el motivo del reclamo.' };
  const d = String(detalle || '').trim().slice(0, 800);
  if (d.length < 8) return { ok: false, error: 'Cuéntanos qué pasó (mínimo 8 caracteres).' };
  return { ok: true, motivo: m, detalle: d };
}

export function vendedorDesdeFuentes(itemsOrden, itemsLegacy) {
  const fuentes = [...(itemsOrden || []), ...(itemsLegacy || [])];
  const deCuenta = fuentes.find((i) => i && i.vendedorUid && i.tipoItem !== 'pase_vip' && i.tipo !== 'servicio');
  const elegido = deCuenta || fuentes.find((i) => i && i.vendedorUid);
  if (!elegido) return { vendedorUid: '', vendedorNombre: '', publicacionId: '' };
  return {
    vendedorUid: String(elegido.vendedorUid),
    vendedorNombre: String(elegido.vendedorNombre || ''),
    publicacionId: String(elegido.publicacionId || '')
  };
}
