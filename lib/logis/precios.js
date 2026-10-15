export const IVA_TASA = 0.19;
export const GARANTIAS_PERMITIDAS = [0, 2841, 5682];
export const PRECIO_PASE_VIP_INICIAL = { basico: 2990, pro: 5090 };

export function preciosPaseVipDesdeConfig(config = {}) {
  const basico = Math.round(Number(config.precioPaseVipBasico ?? config.precioVipBasico ?? 0));
  const pro = Math.round(Number(config.precioPaseVipPro ?? config.precioVipPro ?? 0));
  return {
    basico: basico > 0 ? basico : PRECIO_PASE_VIP_INICIAL.basico,
    pro: pro > 0 ? pro : PRECIO_PASE_VIP_INICIAL.pro
  };
}

export function totalConIva(neto) {
  const subtotal = Math.round(Number(neto) || 0);
  const iva = Math.round(subtotal * IVA_TASA);
  return { subtotal, iva, total: subtotal + iva };
}

function fechaVip(perfil) {
  const raw = perfil?.vipExpira;
  if (!raw) return 0;
  if (typeof raw.toDate === 'function') return raw.toDate().getTime();
  if (typeof raw.toMillis === 'function') return raw.toMillis();
  if (typeof raw._seconds === 'number') return raw._seconds * 1000;
  if (raw.seconds) return raw.seconds * 1000;
  const n = new Date(raw).getTime();
  return Number.isNaN(n) ? 0 : n;
}

export function tasaDescuentoVip(perfil) {
  if (!perfil || !perfil.esVendedorVip) return 0;
  const expira = fechaVip(perfil);
  if (!expira || expira <= Date.now()) return 0;
  if (perfil.tipoVip === 'pro' || perfil.tipoVip === 'dueno') return 0.10;
  return 0.05;
}

export function calcularMonto({ items = [], perfil = {} } = {}) {
  if (!Array.isArray(items) || !items.length) {
    return { ok: false, error: 'No hay items para calcular el monto.' };
  }

  let subtotalCuentas = 0;
  let subtotalPases = 0;
  const detalle = items.map((it) => {
    const esPase = it.tipoItem === 'pase_vip';
    const cantidad = Math.max(1, parseInt(it.cantidad || it.cantidadSeleccionada || 1, 10));
    const garantiaNum = Number(it.garantia || 0);
    const garantia = GARANTIAS_PERMITIDAS.includes(garantiaNum) ? garantiaNum : 0;
    const precioBase = Number(it.precioBase ?? 0);
    const unitario = Number(it.precio) > 0 ? Number(it.precio) : (precioBase + garantia);
    const totalLinea = unitario * cantidad;
    if (esPase) subtotalPases += totalLinea;
    else subtotalCuentas += totalLinea;
    return {
      tipoItem: it.tipoItem || 'cuenta',
      publicacionId: it.publicacionId,
      titulo: it.titulo,
      cantidad,
      precioBase,
      garantia,
      unitario,
      totalLinea
    };
  });

  const subtotal = subtotalCuentas + subtotalPases;
  if (subtotal <= 0) {
    return { ok: false, error: 'El monto calculado es inválido.' };
  }

  const iva = Math.round(subtotal * IVA_TASA);
  const tasa = tasaDescuentoVip(perfil);
  const descuento = Math.round(subtotalCuentas * tasa);
  const total = (subtotal + iva) - descuento;
  if (total < 1) {
    return { ok: false, error: 'El total es demasiado bajo para pagar con Flow.' };
  }

  return {
    ok: true,
    subtotal,
    iva,
    descuento,
    tasaDescuento: tasa,
    total,
    currency: 'CLP',
    subtotalCuentas,
    subtotalPases,
    detalle
  };
}
