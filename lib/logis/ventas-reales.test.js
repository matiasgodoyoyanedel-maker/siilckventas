import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backfillVentas, esOrdenDeCuenta, estadoCompleto, sumarVentas } from './ventas-reales.js';

function leer(rel) {
  return readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');
}

test('solo las órdenes pagadas o completadas suman una venta por vendedor', () => {
  assert.equal(estadoCompleto({ status: 'pending', estado: 'pendiente', paid: false }), false);
  assert.equal(estadoCompleto({ status: 'paid', estado: 'entregado', paid: true }), true);
  assert.equal(estadoCompleto({ estado: 'completada' }), true);
  assert.equal(esOrdenDeCuenta({ origen: 'pase_vip' }, []), false);
  const totales = sumarVentas([
    { id: 'a', data: { status: 'pending', paid: false, sellerId: 'seller', origen: 'listing' }, items: [{ vendedorUid: 'seller', tipoItem: 'cuenta' }] },
    { id: 'b', data: { status: 'pagado', sellerUid: 'seller', origen: 'listing' }, items: [{ sellerId: 'seller', tipo: 'cuenta' }] },
    { id: 'b', data: { estado: 'completada', vendedorUid: 'seller' }, items: [{ vendedorUid: 'seller', tipoItem: 'cuenta' }] },
    { id: 'c', data: { status: 'pagado', origen: 'pase_vip', sellerId: 'seller' }, items: [{ tipoItem: 'pase_vip' }] },
    { id: 'd', data: { estado: 'completada', seller_id: 'otro' }, items: [{ tipoItem: 'cuenta', seller_id: 'otro' }] }
  ]);
  assert.deepEqual(totales, { seller: 1, otro: 1 });
});

test('backfillVentas guarda salesCount en users y perfiles sin usar el campo ventas', async () => {
  const docs = {
    perfiles: { seller: { username: 'siilck_owner', ventas: 0, ventasCompletadas: 0 } },
    users: {},
    ordenes: {
      pagada: { status: 'pagado', sellerId: 'seller', origen: 'listing', items: [{ sellerId: 'seller', tipoItem: 'cuenta' }] },
      pendiente: { status: 'pending', paid: false, sellerId: 'seller', origen: 'listing', items: [{ sellerId: 'seller', tipoItem: 'cuenta' }] }
    },
    orders: {},
    ventas: {},
    compras: {}
  };
  const db = {
    collection(nombre) {
      const col = docs[nombre] || (docs[nombre] = {});
      return {
        doc(id) {
          return {
            id,
            async get() {
              return { exists: Object.prototype.hasOwnProperty.call(col, id), id, data: () => col[id] };
            },
            async set(payload, opts) {
              col[id] = opts && opts.merge ? { ...(col[id] || {}), ...payload } : payload;
            }
          };
        },
        async get() {
          const lista = Object.entries(col).map(([id, data]) => ({ id, data: () => data, ref: { collection() { return { async get() { return { docs: [] }; } }; } } }));
          return { docs: lista };
        }
      };
    }
  };
  const resultado = await backfillVentas(db);
  assert.equal(resultado.ventas.seller, 1);
  assert.equal(docs.perfiles.seller.salesCount, 1);
  assert.equal(docs.perfiles.seller.ventas, 0);
  assert.equal(docs.users.seller.salesCount, 1);
  const pagina = leer('vendedor.html');
  const modal = leer('ventas.html');
  assert.match(pagina, /\/api\/vendedor/);
  assert.match(pagina, /salesCount/);
  assert.match(modal, /urlCuentaPublica/);
  assert.match(modal, /\/cuenta\/'/);
  assert.equal(modal.includes('>Ficha</a>'), false);
  assert.match(leer('vercel.json'), /\/vendedor\/:uid/);
  assert.match(leer('vercel.json'), /\/cuenta\/:id/);
  assert.equal(pagina.includes('collection(\'fichas\')'), false);
  assert.equal(pagina.includes('ventasCompletadas'), false);
});
