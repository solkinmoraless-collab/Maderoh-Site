(function(root){
 'use strict';
 function acabados(p){return p.acabados || [{id:'mate',nombre:'Mate',netoCentavos:0},{id:'brillante',nombre:'Alto brillo',netoCentavos:p.brillanteNetoCentavos}];}
 function vigente(o,now=Date.now()){
  if(!o||!/^\d{4}-\d{2}-\d{2}$/.test(o.inicio||'')||!/^\d{4}-\d{2}-\d{2}$/.test(o.fin||''))return false;
  const start=Date.parse(o.inicio+'T00:00:00-06:00'),end=Date.parse(o.fin+'T23:59:59.999-06:00');
  return Number.isFinite(now)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&now>=start&&now<=end;
 }
 function calcular(p,varianteId,acabado,cantidad=1,now=Date.now()){
  const v=p.variantes.find(v=>v.id===varianteId), a=acabados(p).find(a=>a.id===acabado);
  if(!v || !a)throw new Error('Configuración no autorizada.');
  if(!Number.isSafeInteger(cantidad)||cantidad<(p.cantidadMinima||1)||cantidad>1000)throw new Error('Cantidad fuera de rango.');
  let neto=v.netoCentavos;
  for(const tier of [...(p.precioVolumen||[])].sort((a,b)=>a.desde-b.desde))if(cantidad>=tier.desde)neto=tier.netoCentavos;
  if(!Number.isSafeInteger(neto)||neto<0||!Number.isSafeInteger(a.netoCentavos)||a.netoCentavos<0||!Number.isSafeInteger(v.netoCentavos)||v.netoCentavos<0)throw new Error('Precio pendiente de confirmación.');
  const regularNeto=neto;let promocionAplicada=null;
  for(const o of [...(p.ofertas||[])].sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
   if(!vigente(o,now)||!Number.isSafeInteger(o.porcentaje)||o.porcentaje<1||o.porcentaje>90)continue;
   const candidato=Math.max(1,Math.round(v.netoCentavos*(100-o.porcentaje)/100));
   if(candidato<neto){neto=candidato;promocionAplicada={id:o.id,titulo:o.titulo,porcentaje:o.porcentaje,inicio:o.inicio,fin:o.fin};}
  }
  const unitario=neto+a.netoCentavos,regularUnitario=regularNeto+a.netoCentavos,subtotal=unitario*cantidad;
  if(!Number.isSafeInteger(subtotal)||subtotal<0)throw new Error('Precio inválido.');
  const regularSubtotal=regularUnitario*cantidad,regularTotal=regularSubtotal+Math.round(regularSubtotal*p.ivaPorcentaje/100);
  const iva=Math.round(subtotal*p.ivaPorcentaje/100),total=subtotal+iva,anticipo=Math.round(total*p.anticipoPorcentaje/100);
  return {cantidad,unitarioNetoCentavos:unitario,unitarioTotalCentavos:unitario+Math.round(unitario*p.ivaPorcentaje/100),subtotalCentavos:subtotal,ivaCentavos:iva,totalCentavos:total,anticipoCentavos:anticipo,saldoCentavos:total-anticipo,
   promocionAplicada,totalRegularCentavos:regularTotal,ahorroTotalCentavos:regularTotal-total,unitarioRegularNetoCentavos:regularUnitario,unitarioRegularTotalCentavos:regularUnitario+Math.round(regularUnitario*p.ivaPorcentaje/100),descuentoNetoCentavos:(regularUnitario-unitario)*cantidad};
 }
 function moneda(c){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(c/100);}
 const api={calcular,moneda,acabados,vigente};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaderohPrecios=api;
})(globalThis);
