import test from 'node:test';
import assert from 'node:assert/strict';
import { fichaPublica, perfilPublico, recientesPublicas } from '../reputacion.js';
import { copiarMapaEnPublicaciones, copiarResenasEnPublicaciones, leerFicha, leerMapaReputacion } from './ficha.js';

function fakeDb(seed) {
  const db = {
    batch() {
      const ops = [];
      return {
        set(ref, payload, opts) { ops.push({ ref, payload, opts }); },
        async commit() {
          await Promise.all(ops.map((op) => op.ref.set(op.payload, op.opts)));
        }
      };
    },
    collection(name) {
      const col = seed[name] || (seed[name] = {});
      return {
        doc(id) {
          return {
            get: async () => ({
              exists: Object.prototype.hasOwnProperty.call(col, id),
              id,
              data: () => col[id]
            }),
            set: async (payload, opts) => {
              col[id] = opts && opts.merge ? { ...(col[id] || {}), ...payload } : payload;
            }
          };
        },
        where(field, _op, value) {
          return {
            get: async () => snap(Object.entries(col).filter(([, data]) => data && data[field] === value), col)
          };
        },
        get: async () => snap(Object.entries(col), col)
      };
    }
  };
  return db;
}

function snap(entries, col) {
  const docs = entries.map(([id, data]) => ({
    id,
    data: () => data,
    ref: {
      set: async (payload, opts) => {
        col[id] = opts && opts.merge ? { ...data, ...payload } : payload;
      }
    }
  }));
  return {
    docs,
    forEach(fn) { docs.forEach(fn); }
  };
}

test('la ficha pública no incluye claves ni datos bancarios', () => {
  const pub = fichaPublica('abc', {
    titulo: 'FIFA',
    precio: 1000,
    vendedorUid: 'seller',
    email_enc: 'secreto',
    pass_enc: 'secreto',
    vendedorCorreo: 'a@b.c',
    descripcion: 'cuenta'
  });
  assert.equal(pub.titulo, 'FIFA');
  assert.equal(pub.email_enc, undefined);
  assert.equal(pub.pass_enc, undefined);
  assert.equal(pub.vendedorCorreo, undefined);
  const perfil = perfilPublico({
    username: 'siilck_owner',
    displayName: '',
    avatar_url: '',
    foto: 'data:image/jpeg;base64,abc',
    vendedorBanco: '123',
    vendedorCorreo: 'a@b.c'
  });
  assert.equal(perfil.username, 'siilck_owner');
  assert.equal(perfil.avatar, 'data:image/jpeg;base64,abc');
  const perfilFoto = perfilPublico({
    username: 'gamer',
    fotoPerfil: 'data:image/jpeg;base64,xyz'
  });
  assert.equal(perfilFoto.avatar, 'data:image/jpeg;base64,xyz');
  assert.equal(perfil.vendedorBanco, undefined);
  const recientes = recientesPublicas([
    { estrellas: 5, comentario: 'Llegó rápido', compradorUid: 'buyer', creadoEn: 2 },
    { estrellas: 4, comentario: 'Bien', compradorUid: 'otro', creadoEn: 1 }
  ]);
  assert.deepEqual(recientes, [
    { estrellas: 5, comentario: 'Llegó rápido' },
    { estrellas: 4, comentario: 'Bien' }
  ]);
});

test('la ficha y el mapa de reseñas salen del servidor sin el comprador', async () => {
  const db = fakeDb({
    publicaciones: {
      p1: { titulo: 'DayZ', precio: 9000, vendedorUid: 'seller', stock: 1, descripcion: 'limpia', pass_enc: 'no' }
    },
    perfiles: {
      seller: { username: 'siilck_owner', displayName: '', foto: 'data:image/jpeg;base64,zz', vendedorBanco: '9988' }
    },
    reputacion: {
      seller: { promedio: 5, totalResenas: 1, ventasCompletadas: 4 }
    },
    resenas: {
      o1: { vendedorUid: 'seller', estrellas: 5, comentario: 'Impecable', compradorUid: 'buyer', creadoEn: 9 }
    }
  });
  const ficha = await leerFicha('p1', db);
  assert.equal(ficha.ok, true);
  assert.equal((await leerFicha('no-existe', db)).error, 'Cuenta no encontrada');
  assert.equal(ficha.publicacion.titulo, 'DayZ');
  assert.equal(ficha.publicacion.pass_enc, undefined);
  assert.equal(ficha.vendedor.username, 'siilck_owner');
  assert.equal(ficha.vendedor.vendedorBanco, undefined);
  assert.equal(ficha.reputacion.promedio, 5);
  assert.equal(ficha.reputacion.totalResenas, 1);
  assert.equal(ficha.reputacion.ventasCompletadas, 4);
  assert.equal(ficha.reputacion.resenas[0].comentario, 'Impecable');
  assert.equal(ficha.reputacion.resenas[0].compradorUid, undefined);
  const mapa = await leerMapaReputacion(db);
  assert.equal(mapa.vendedores.seller.totalResenas, 1);
  assert.equal(mapa.vendedores.seller.resenas[0].comentario, 'Impecable');
  assert.equal(mapa.vendedores.seller.ventasCompletadas, 4);
});

test('al dejar una reseña las estrellas se copian a las publicaciones de ese vendedor', async () => {
  const db = fakeDb({
    publicaciones: {
      p1: { titulo: 'FIFA', vendedorUid: 'seller', precio: 1000 },
      p2: { titulo: 'Otra', vendedorUid: 'otro', precio: 1000 }
    }
  });
  const payload = await copiarResenasEnPublicaciones(db, 'seller', { promedio: 4.5, total: 2 }, [
    { estrellas: 5, comentario: 'Excelente', compradorUid: 'b1', creadoEn: 3 },
    { estrellas: 4, comentario: 'Buena', compradorUid: 'b2', creadoEn: 2 }
  ]);
  assert.equal(payload.resenasTotal, 2);
  assert.equal(db.collection && true, true);
  const p1 = (await db.collection('publicaciones').doc('p1').get()).data();
  const p2 = (await db.collection('publicaciones').doc('p2').get()).data();
  assert.equal(p1.titulo, 'FIFA');
  assert.equal(p1.resenasPromedio, 4.5);
  assert.equal(p1.resenasTotal, 2);
  assert.equal(p1.resenasRecientes[0].comentario, 'Excelente');
  assert.equal(p1.resenasRecientes[0].compradorUid, undefined);
  assert.equal(p2.resenasTotal, undefined);
  const n = await copiarMapaEnPublicaciones(db, {
    seller: { promedio: 5, totalResenas: 1, resenas: [{ estrellas: 5, comentario: 'Impecable' }] }
  });
  assert.equal(n, 1);
  const actualizada = (await db.collection('publicaciones').doc('p1').get()).data();
  assert.equal(actualizada.titulo, 'FIFA');
  assert.equal(actualizada.resenasTotal, 1);
  assert.equal(actualizada.resenasRecientes[0].comentario, 'Impecable');
});
