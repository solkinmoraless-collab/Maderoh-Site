(function(root){
 'use strict';
 const AVISO='COTIZACIÓN PRELIMINAR, sujeta a supervisión, revisión y confirmación del taller. Cambios en medidas, materiales, acabados, entrega u otros ajustes pueden modificar el importe antes del pago. Cualquier ajuste se acuerda con el cliente antes de pagar. No acredita pago ni confirma pedido.';
 const TARIFAS={pequeno:100000,escritorio:200000,grande:350000,no_aplica:0};
 function grupoMetal(p){
  if(Object.hasOwn(TARIFAS,p.grupoElectrostatica))return p.grupoElectrostatica;
  if(p.id===21||/sin estructura metálica/i.test(p.estructura||''))return 'no_aplica';
  if(p.categoria==='escritorios')return 'escritorio';
  if(p.categoria==='recamara'||[15,16,17,18,19,27,28,31].includes(p.id))return 'grande';
  return 'pequeno';
 }
 function acabados(p){return (p.acabados||[{id:'mate',nombre:'Mate',netoCentavos:0},{id:'brillante',nombre:'Alto brillo',netoCentavos:99900}]).map(a=>a.id==='brillante'?{...a,nombre:'Poliuretano de alto brillo',netoCentavos:99900}:a);}
 function normalizar(p){
  const a=acabados(p), hasGloss=a.some(a=>a.id==='brillante');
  const extra=(grupoMetal(p)==='no_aplica'?'Sin estructura metálica: pintura electrostática no aplicable.':'Pintura electrostática según la tarifa del modelo.')+(hasGloss?' Alto brillo según el selector.':'');
  const exclusions=(p.exclusiones||'').replace(', color metálico o pintura electrostática',', otros colores metálicos');
  const glossText=t=>typeof t==='string'?t.replace(/con alto brillo incluido/gi,'con opción de alto brillo (+$999 MXN por pieza)').replace(/con alto brillo\./gi,'con opción de alto brillo (+$999 MXN por pieza).'):t;
  return {...p,ivaPorcentaje:0,politicaPrecios:'base-sin-iva-v2',grupoElectrostatica:grupoMetal(p),acabados:a,brillanteNetoCentavos:hasGloss?99900:0,
   ...(hasGloss?{acabado:'Mate sin adicional. Poliuretano de alto brillo: +$999 MXN por pieza.',acabadoPredeterminado:p.acabadoPredeterminado==='brillante'?'mate':p.acabadoPredeterminado}:{}),
   descripcion:hasGloss?glossText(p.descripcion):p.descripcion,incluye:hasGloss?glossText(p.incluye):p.incluye,
   exclusiones:exclusions+(exclusions.includes(extra)?'':' '+extra)};
 }
 function electrostatica(p){return TARIFAS[grupoMetal(p)];}
 function vigente(o,now=Date.now()){
  if(!o||!/^\d{4}-\d{2}-\d{2}$/.test(o.inicio||'')||!/^\d{4}-\d{2}-\d{2}$/.test(o.fin||''))return false;
  const start=Date.parse(o.inicio+'T00:00:00-06:00'),end=Date.parse(o.fin+'T23:59:59.999-06:00');
  return Number.isFinite(now)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&now>=start&&now<=end;
 }
 function calcular(p,varianteId,acabado,cantidad=1,now=Date.now(),metal='aceite'){
  if(!['aceite','electrostatica'].includes(metal)||metal==='electrostatica'&&grupoMetal(p)==='no_aplica')throw new Error('Acabado metálico no disponible para este producto.');
  const extraMetal=metal==='electrostatica'?electrostatica(p):0;
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
  const unitario=neto+a.netoCentavos+extraMetal,regularUnitario=regularNeto+a.netoCentavos+extraMetal,subtotal=unitario*cantidad;
  if(!Number.isSafeInteger(subtotal)||subtotal<0)throw new Error('Precio inválido.');
  const regularSubtotal=regularUnitario*cantidad,regularTotal=regularSubtotal;
  const iva=0,total=subtotal+iva,anticipo=Math.round(total*p.anticipoPorcentaje/100);
  return {cantidad,politicaPrecios:'base-sin-iva-v2',adicionalMaderaUnitarioCentavos:a.netoCentavos,adicionalMetalUnitarioCentavos:extraMetal,unitarioNetoCentavos:unitario,unitarioTotalCentavos:unitario,subtotalCentavos:subtotal,ivaCentavos:iva,totalCentavos:total,anticipoCentavos:anticipo,saldoCentavos:total-anticipo,
   promocionAplicada,totalRegularCentavos:regularTotal,ahorroTotalCentavos:regularTotal-total,unitarioRegularNetoCentavos:regularUnitario,unitarioRegularTotalCentavos:regularUnitario,descuentoNetoCentavos:(regularUnitario-unitario)*cantidad};
 }
 function moneda(c){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(c/100);}
 const api={calcular,moneda,acabados,vigente,normalizar,grupoMetal,electrostatica,AVISO,TARIFAS};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaderohPrecios=api;
})(globalThis);
