// El precio tachado es el que escribió el vendedor. Se cobra el precio con el % elegido.
export function getOferta(precioReal, producto) {
  if (!producto || !producto.ofertaActiva) return null;

  const descuento = Number(producto.ofertaDescuento) || 8;
  const antes = Number(precioReal) || 0;
  const ahora = Math.round((antes * (1 - descuento / 100)) / 100) * 100;

  return { antes, ahora, descuento, ahorro: antes - ahora };
}
