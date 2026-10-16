// Oferta visual. El precio que se cobra sigue siendo el que puso el vendedor.
export function getOferta(precioReal, producto) {
  if (!producto || !producto.ofertaActiva) return null;

  const descuento = Number(producto.ofertaDescuento) || 5;
  const real = Number(precioReal) || 0;
  const antesRaw = real / (1 - descuento / 100);
  const antes = Math.ceil(antesRaw / 100) * 100;

  return { antes, ahora: real, descuento, ahorro: antes - real };
}
