(function(root){
 'use strict';
 function acabados(p){return p.acabados || [{id:'mate',nombre:'Mate',netoCentavos:0},{id:'brillante',nombre:'Alto brillo',netoCentavos:p.brillanteNetoCentavos}];}
 function calcular(p,varianteId,acabado,cantidad=1){
  const v=p.variantes.find(v=>v.id===varianteId), a=acabados(p).find(a=>a.id===acabado);
  if(!v || !a)throw new Error('Configuración no autorizada.');
  if(!Number.isSafeInteger(cantidad)||cantidad<(p.cantidadMinima||1)||cantidad>1000)throw new Error('Cantidad fuera de rango.');
  let neto=v.netoCentavos;
  for(const tier of [...(p.precioVolumen||[])].sort((a,b)=>a.desde-b.desde))if(cantidad>=tier.desde)neto=tier.netoCentavos;
  if(!Number.isSafeInteger(neto)||neto<0||!Number.isSafeInteger(a.netoCentavos)||a.netoCentavos<0)throw new Error('Precio pendiente de confirmación.');
  const unitario=neto+a.netoCentavos, subtotal=unitario*cantidad;
  if(!Number.isSafeInteger(subtotal)||subtotal<0)throw new Error('Precio inválido.');
  const iva=Math.round(subtotal*p.ivaPorcentaje/100),total=subtotal+iva,anticipo=Math.round(total*p.anticipoPorcentaje/100);
  return {cantidad,unitarioNetoCentavos:unitario,unitarioTotalCentavos:unitario+Math.round(unitario*p.ivaPorcentaje/100),subtotalCentavos:subtotal,ivaCentavos:iva,totalCentavos:total,anticipoCentavos:anticipo,saldoCentavos:total-anticipo};
 }
 function moneda(c){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(c/100);}
 const api={calcular,moneda,acabados};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaderohPrecios=api;
})(globalThis);
