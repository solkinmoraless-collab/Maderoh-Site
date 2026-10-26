(function(){
 'use strict';
 const $=id=>document.getElementById(id), money=MaderohPrecios.moneda;
 const size=$('variant-size'),finish=$('variant-finish'),delivery=$('variant-delivery'),mod=$('variant-storage'),qty=$('variant-quantity'),metal=$('variant-metal'),feet=$('variant-feet');
 let product,quote,sequence=0,controller;
 const whatsapp=$('quote-whatsapp'),printButton=$('quote-print');
 const printSelection=document.createElement('p');printSelection.id='print-selection';$('quote-summary').before(printSelection);
 const custom=()=>product.precioPendiente===true||!product.variantes.length||size.value==='custom'||mod.checked||finish.value==='custom'||metal.value!=='aceite';
 const color=()=>product.madera==='Sin madera.'?'No aplica':$('variant-color').value.trim()||'Por definir con el cliente';
 function row(label,value){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;div.append(dt,dd);return div;}
 function option(select,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
 function selection(){
  const v=product.variantes.find(v=>v.id===size.value), f=MaderohPrecios.acabados(product).find(a=>a.id===finish.value);
  return [`Producto: ${product.nombre}`,`Configuración: ${v?.nombre||'Medida o combinación personalizada'}`,`Cantidad: ${qty.value}`,`Acabado: ${f?.nombre||'Otro, por cotizar'}`,`Color: ${color()}`,
   ...(product.apoyos?[`Apoyos: ${feet.value==='ruedas'?'Ruedas':'Niveladores'} · incluidos`]:[]),
   ...(metal.value!=='aceite'?[`Pintura metálica: ${metal.value==='electrostatica'?'Electrostática, por cotizar':'Otra, por cotizar'}`]:[]),
   `Entrega: ${delivery.value==='cdmx'?'CDMX':$('customer-destination').value.trim()||'Otro estado, por definir'}`,`Incluye: ${product.incluye}`,
   ...(custom()?[`Ancho solicitado: ${$('custom-width').value||'Por confirmar'} cm`,`Largo solicitado: ${$('custom-length').value||'Por confirmar'} cm`,`Comentarios: ${$('custom-comments').value.trim()||'Por definir'}`]:[])];
 }
 function contact(){
  if(!product)return;
  const lines=['Hola, quiero confirmar este presupuesto orientativo de Maderóh:','',...selection()];
  if(custom())lines.push('Precio y anticipo pendientes de cotización.');
  else if(quote){lines.push(`Total de productos con IVA: ${money(quote.totalCentavos)} MXN`,`Subtotal: ${money(quote.subtotalCentavos)} MXN`,`IVA: ${money(quote.ivaCentavos)} MXN`,
   `${quote.envioPendiente?'Referencia del 50% de productos':'Anticipo del 50%'}: ${money(quote.anticipoCentavos)} MXN`,quote.motivoEnvio||'Entrega por confirmar.');}
  else return;
  lines.push(product.fabricacion,product.condiciones,'Quiero confirmar la configuración, accesos y agenda.');
  whatsapp.href=crearWhatsAppURL(lines.join('\n'));whatsapp.setAttribute('aria-disabled','false');whatsapp.textContent=custom()?'Solicitar cotización personalizada':'Continuar por WhatsApp';
  printSelection.textContent=[...selection(),product.fabricacion,product.garantia,product.condiciones].join('\n');
 }
 function payload(){return {productId:product.id,variante:size.value,acabado:finish.value,cantidad:Number(qty.value),entrega:delivery.value,metal:metal.value,apoyos:product.apoyos?feet.value:'sin_apoyos',modificaciones:custom(),color:color(),
  anchoCm:custom()&&$('custom-width').value?Number($('custom-width').value):null,largoCm:custom()&&$('custom-length').value?Number($('custom-length').value):null,comentarios:custom()?$('custom-comments').value.trim():''};}
 function changed(){}
 async function update(){
  changed();const id=++sequence;controller?.abort();controller=new AbortController();quote=null;
  $('custom-dimensions').hidden=!custom();$('customer-destination-field').hidden=delivery.value==='cdmx';$('customer-destination').required=delivery.value!=='cdmx';
  $('quote-error').hidden=true;printButton.disabled=true;whatsapp.removeAttribute('href');whatsapp.setAttribute('aria-disabled','true');$('quote-breakdown').replaceChildren();
  $('quote-tax-note').textContent='';$('quote-delivery-note').textContent='';
  const quantity=Number(qty.value);
  if(!Number.isSafeInteger(quantity)||quantity<(product.cantidadMinima||1)||quantity>1000){$('quote-total').textContent='Revisa la cantidad';$('quote-error').hidden=false;$('quote-error').textContent=`Pedido permitido: ${product.cantidadMinima||1} a 1,000 piezas.`;return;}
  if(custom()){$('quote-label').textContent='Proyecto personalizado';$('quote-total').textContent='Cotización a revisión';$('quote-tax-note').textContent='Precio y anticipo por confirmar después de revisar las modificaciones.';printButton.disabled=false;contact();return;}
  $('quote-label').textContent='Estimado de productos';$('quote-total').textContent='Calculando…';
  try{
   const q=MaderohEvaluar(product,payload());if(id!==sequence)return;quote=q;
   $('quote-total').textContent=money(q.totalCentavos)+' MXN';$('quote-tax-note').textContent='IVA incluido. Solicitar factura no cambia el precio.';
   if(q.cantidad>1)$('quote-breakdown').append(row('Precio unitario con IVA',money(q.unitarioTotalCentavos)),row('Cantidad',String(q.cantidad)));
   $('quote-breakdown').append(row('Subtotal',money(q.subtotalCentavos)),row('IVA 16%',money(q.ivaCentavos)),row(q.envioPendiente?'50% de productos (referencia)':'Anticipo 50%',money(q.anticipoCentavos)),row('Saldo de productos',money(q.saldoCentavos)));
   $('quote-delivery-note').textContent=(q.motivoEnvio||'')+(q.envioPendiente?' Envío, total final y pago se confirman en la cotización.':' Saldo después del armado en CDMX, cuando aplique.');printButton.disabled=false;contact();
  }catch(e){if(e.name==='AbortError'||id!==sequence)return;$('quote-total').textContent='Precio no disponible';$('quote-error').textContent=e.message;$('quote-error').hidden=false;}
 }
 async function start(){
  try{
   const id=new URLSearchParams(location.search).get('id');const r=await window.MaderohCatalogo.respuesta();if(!r.ok)throw new Error('No fue posible cargar el catálogo.');product=(await r.json()).productos.find(p=>String(p.id)===id);if(!product)throw new Error('Producto no disponible.');
   document.title=product.nombre+' | Maderóh';$('variant-name').textContent=product.nombre;document.querySelector('.eyebrow').textContent=product.categoriaNombre.toUpperCase()+' · '+product.subcategoria.toUpperCase();$('variant-description').textContent=product.descripcion;
   $('variant-photo').src=product.imagen;$('variant-photo').alt=product.nombre;
   for(const v of product.variantes)option(size,v.id,v.nombre+(v.colchonAnchoCm?` · colchón ${v.colchonAnchoCm} × ${v.colchonLargoCm} cm`:''));option(size,'custom',product.variantes.length?'Otra medida / configuración':'Combinación por cotizar');size.value=product.variantes.some(v=>v.id==='matrimonial')?'matrimonial':product.variantes[0]?.id||'custom';
   finish.replaceChildren();for(const a of MaderohPrecios.acabados(product))option(finish,a.id,a.nombre+(a.netoCentavos?' · +'+money(a.netoCentavos+Math.round(a.netoCentavos*product.ivaPorcentaje/100))+' con IVA por pieza':' · incluido'));option(finish,'custom','Otro acabado · por cotizar');finish.value=product.acabadoPredeterminado||'mate';
   qty.min=String(product.cantidadMinima||1);qty.value=String(product.cantidadMinima||1);$('quantity-note').textContent=product.precioVolumen?.length?`Pedido mínimo de ${product.cantidadMinima} piezas. ${product.precioVolumen.map(t=>`Desde ${t.desde} piezas del mismo diseño y logo: ${money(t.netoCentavos+Math.round(t.netoCentavos*product.ivaPorcentaje/100))} por pieza con IVA.`).join(' ')}`:product.esPedidoPequeno?'Envío gratuito en CDMX desde 10 piezas. Menor cantidad: envío por cotizar.':'';
   $('feet-field').hidden=!product.apoyos;feet.value=[19,30,33].includes(product.id)?'ruedas':'niveladores';metal.value='aceite';$('metal-field').hidden=product.id===21||product.id===22;
   $('wood-color-field').hidden=product.madera==='Sin madera.';
   $('modification-label').textContent=product.modificacionLabel;$('product-conditions').textContent=product.condiciones;
   $('measure-note').textContent=product.tipoMedida==='colchon'?'Las medidas corresponden al colchón. Se confirman medidas reales, dimensiones exteriores y accesos antes de fabricar.':'Las medidas exteriores y los accesos se confirman antes de fabricar. Cualquier cambio de medida requiere cotización personalizada.';
   $('custom-width-label').textContent=product.tipoMedida==='colchon'?'Ancho del colchón en cm':'Ancho / profundidad solicitada en cm';$('custom-length-label').textContent=product.tipoMedida==='colchon'?'Largo del colchón en cm':'Largo solicitado en cm';
   for(const [label,key]of [['Medidas','medidas'],['Incluye','incluye'],['Estructura','estructura'],['Madera','madera'],['Alturas','alturas'],['Construcción','construccion'],['Acabados','acabado'],['Fabricación','fabricacion'],['Entrega','entrega'],['Garantía','garantia'],['Adicionales','exclusiones'],['Promoción','promocion']])if(product[key])$('product-specs').append(row(label,product[key]));
   for(const [i,url]of(product.imagenes||[product.imagen]).entries()){const button=document.createElement('button'),img=document.createElement('img');button.type='button';button.setAttribute('aria-label',`Ver fotografía ${i+1} de ${product.nombre}`);img.src=url;img.alt='';button.append(img);button.addEventListener('click',()=>{$('variant-photo').src=url;});$('product-gallery').append(button);}
   $('variant-product').hidden=false;for(const e of [size,finish,delivery,mod,metal,feet])e.addEventListener('change',update);qty.addEventListener('input',update);
   for(const key of ['variant-color','custom-width','custom-length','custom-comments','customer-destination'])$(key).addEventListener('input',()=>{changed();contact();});
   printButton.addEventListener('click',()=>{contact();window.print();});await update();
  }catch(e){$('product-error').textContent=e.message;$('product-error').hidden=false;}finally{$('product-loading').hidden=true;}
 }
 start();
})();
