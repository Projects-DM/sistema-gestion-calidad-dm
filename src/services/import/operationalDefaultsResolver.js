import { format } from 'date-fns';

const CARNICOS = [
  'PECHUGA', 'FILETE', 'POLLO', 'MUSLO', 'CONTRAMUSLO', 'ALA',
  'RABADILLA', 'CHUZO', 'PIERNA PERNIL', 'TOCINETA', 'CARNE CONGELADA',
];

function esCarnico(producto) {
  if (!producto) return false;
  const p = producto.toUpperCase();
  return CARNICOS.some(kw => p.includes(kw));
}

function generarTemperatura() {
  const min = -20.0;
  const max = -18.0;
  const temp = min + Math.random() * (max - min);
  return Math.round(temp * 10) / 10;
}

function resolverTemperatura(producto) {
  if (!producto) return null;
  if (esCarnico(producto)) return generarTemperatura();
  return null;
}

function inferirPeso(producto, cantidad) {
  if (!producto || !cantidad) return undefined;
  const p = producto.toUpperCase();
  if (p.includes('PECHUGA CONGELADA')) return Number(cantidad);
  return undefined;
}

function calcularBolsas(peso) {
  if (!peso || Number(peso) <= 0) return 1;
  return Number(peso) <= 5 ? 1 : 2;
}

export function resolveOperationalDefaults(record) {
  const r = record || {};
  const pesoCalculado = r.peso ?? inferirPeso(r.producto, r.cantidad) ?? '';

  return {
    fecha: r.fecha ?? r.fechaDespacho ?? format(new Date(), 'yyyy-MM-dd'),
    hora: r.hora ?? '',
    cliente: r.cliente ?? '',
    producto: r.producto ?? '',
    lote: r.lote ?? null,
    cantidad: calcularBolsas(pesoCalculado),
    peso: pesoCalculado,
    temperatura: resolverTemperatura(r.producto),
    destino: r.destino || 'SIN DEFINIR',
    placa: r.placa || 'NO ASIGNADA',
    conductor: r.conductor || 'Juan Gomez',
    observaciones: r.observaciones || 'IMPORTACION PDF',
    estado: r.estado || 'Pendiente',
  };
}
