export function validarCalificacion({ orderId, rating, comment } = {}) {
  const id = String(orderId || '').trim();
  const estrellas = Number(rating);
  const texto = String(comment || '').trim();
  if (!id) return { ok: false, error: 'Falta la compra.' };
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return { ok: false, error: 'La calificación debe ser de 1 a 5 estrellas.' };
  }
  if (!texto) return { ok: false, error: 'Escribe un comentario.' };
  if (texto.length > 800) return { ok: false, error: 'El comentario es demasiado largo.' };
  return { ok: true, orderId: id, rating: estrellas, comment: texto };
}
