(function(){
 'use strict';
 const $=id=>document.getElementById(id),auth='/.netlify/functions/maderoh-access',endpoint='/.netlify/functions/maderoh-admin-quotes';
 const labels={nueva:'Nueva',contactada:'Contactada',en_revision:'En revisión',cotizada:'Cotizada',aceptada:'Aceptada',descartada:'Descartada'};
 let csrf='',page=1,pages=1,current=null,dirty=false,loading=false;
 const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n/100);
 const date=s=>new Date(s).toLocaleString('es-MX',{timeZone:'America/Mexico_City'});
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n;};
 const notice=(id,message,error=false)=>{$(id).textContent=message;$(id).classList.toggle('error',error);};
 async function request(url,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json','X-Maderoh-CSRF':csrf},body:JSON.stringify(body)}:{})});let data;try{data=await r.json();}catch{throw Error('El servidor no devolvió una respuesta válida.');}if(!r.ok){if(r.status===401){$('quotes-panel').hidden=true;$('quotes-access').hidden=false;current=null;dirty=false;$('quote-rows').replaceChildren();$('detail-facts').replaceChildren();$('followup-notes').value='';}throw Error(data.error||'Operación no disponible.');}return data;}catch(e){if(e.name==='AbortError')throw Error('La conexión tardó demasiado. Recarga la lista antes de reintentar.');throw e;}finally{clearTimeout(timer);}}
 const canLeave=()=>!dirty||window.confirm('Hay notas sin guardar. ¿Quieres descartarlas?');
 async function load(){
  if(loading)return;loading=true;notice('quotes-notice','Consultando solicitudes…');
  try{const query=new URLSearchParams({q:$('q-search').value,estado:$('q-state').value,canal:$('q-channel').value,page:String(page)}),data=await request(endpoint+'?'+query);pages=data.pages;
   if(page>pages){page=pages;loading=false;return load();}
   for(const [id,key]of [['q-total','total'],['q-new','nuevas'],['q-pdf','pdf'],['q-wa','whatsapp']])$(id).textContent=data.counts[key];
   $('quote-rows').replaceChildren();
   for(const r of data.rows){const tr=el('tr');const cells=[el('td'),el('td'),el('td'),el('td'),el('td')];cells[0].append(el('span',r.folio),el('small',date(r.created_at)));cells[1].append(el('span',r.producto),el('small',r.nombre||'Sin datos de contacto; referencia de catálogo'));cells[2].textContent=r.estimate?.totals?money(r.estimate.totals.totalCentavos)+' con IVA':'Por cotizar';cells[3].append(el('span',(r.followup.canales||[]).map(c=>c==='pdf'?'PDF':'WhatsApp').join(' · ')),el('small',labels[r.followup.estado]||'Nueva'));const b=el('button','Ver detalle');b.type='button';b.className='secondary compact';b.addEventListener('click',()=>open(r.id));cells[4].append(b);cells.forEach((c,i)=>{c.dataset.label=['Folio / fecha','Modelo / cliente','Importe','Canales / estado','Acción'][i];tr.append(c);});$('quote-rows').append(tr);}
   if(!data.rows.length){const tr=el('tr'),td=el('td','Todavía no hay solicitudes con estos filtros.');td.colSpan=5;tr.append(td);$('quote-rows').append(tr);}
   $('q-page').textContent='Página '+page+' de '+pages;$('q-prev').disabled=page<=1;$('q-next').disabled=page>=pages;notice('quotes-notice',data.total+' folios encontrados · 25 por página.');
  }catch(e){notice('quotes-notice',e.message,true);}finally{loading=false;}
 }
 function fact(container,label,value){if(value==null||value==='')return;const d=el('div');d.append(el('dt',label),el('dd',value));$(container).append(d);}
 function render(row){
  current=row;dirty=false;const s=row.snapshot,c=s.selection,e=s.estimate;
  $('quote-detail').hidden=false;$('detail-title').textContent=s.folio;$('detail-warning').textContent=s.aviso;$('detail-facts').replaceChildren();$('detail-conditions').replaceChildren();
  for(const [label,value]of [['Registrado (CDMX)',date(s.createdAt)],['Modelo',s.producto],['Canales',(row.followup.canales||[]).join(' · ')],['Nombre',c.nombre],['WhatsApp',c.telefono],['Correo',c.correo],['Cantidad',c.cantidad],['Configuración',e?.variante],['Acabado',e?.acabado||c.acabado],['Color de madera',c.color],['Metal',c.metal||c.estructura],['Apoyos',c.apoyos],['Destino',c.destino||c.ubicacion||c.entrega],['Comentarios',c.comentarios],['Ancho (cm)',c.anchoCm||c.ancho],['Largo (cm)',c.largoCm],['Profundidad (cm)',c.profundidad],['Altura (cm)',c.altura],['Tipo de proyecto',c.tipoProyecto],['Tipo de negocio',c.tipoNegocio],['Superficie (m²)',c.tamanoEspacio],['Permiso promocional',c.kind==='personalizado'?(c.marketingConsent?'Sí':'No'):null]])fact('detail-facts',label,value);
  if(e?.totals){for(const [label,key]of [['Subtotal','subtotalCentavos'],['IVA','ivaCentavos'],['Total de productos','totalCentavos'],['Referencia de anticipo','anticipoCentavos'],['Saldo de productos','saldoCentavos']])fact('detail-facts',label,money(e.totals[key]));fact('detail-facts','Envío',e.envioPendiente?'Pendiente de cotizar. El importe no es el total final.':'Incluido según condiciones originales del modelo.');}else fact('detail-facts','Precio','Pendiente de revisión por el taller.');
  for(const [key,label]of [['medidas','Medidas originales'],['madera','Madera'],['estructura','Metal'],['fabricacion','Fabricación'],['entrega','Entrega'],['incluye','Incluye'],['garantia','Garantía'],['condiciones','Condiciones']])fact('detail-conditions',label,s.product?.[key]);
  if(!s.product)fact('detail-conditions','Proyecto personalizado','Sin precio automático. Confirmar alcance y presupuesto con el cliente.');
  $('followup-state').value=row.followup.estado||'nueva';$('followup-notes').value=row.followup.notas||'';$('followup-updated').textContent=row.followup.updatedAt?'Último seguimiento: '+date(row.followup.updatedAt)+' · '+row.followup.updatedBy:'';notice('followup-notice','');
 }
 async function open(id){if(!canLeave())return;try{render(await request(endpoint+'?id='+encodeURIComponent(id)));$('quote-detail').scrollIntoView({behavior:'smooth'});}catch(e){notice('quotes-notice',e.message,true);}}
 $('quote-filters').addEventListener('submit',e=>{e.preventDefault();page=1;load();});
 $('q-prev').addEventListener('click',()=>{if(!loading&&page>1){page--;load();}});$('q-next').addEventListener('click',()=>{if(!loading&&page<pages){page++;load();}});
 $('q-close').addEventListener('click',()=>{if(canLeave()){$('quote-detail').hidden=true;current=null;dirty=false;}});
 $('followup-form').addEventListener('input',()=>dirty=true);
 $('followup-reload').addEventListener('click',()=>{if(current)open(current.id);});
 $('followup-form').addEventListener('submit',async e=>{e.preventDefault();if(!current)return;$('followup-save').disabled=true;$('followup-reload').disabled=true;const notes=$('followup-notes').value,state=$('followup-state').value;
  try{const row=await request(endpoint,{id:current.id,revision:current.revision,estado:state,notas:notes});if(notes===$('followup-notes').value&&state===$('followup-state').value)render(row);else{current=row;dirty=true;}notice('followup-notice',dirty?'Seguimiento guardado. Hay cambios nuevos pendientes.':'Seguimiento guardado.');await load();}catch(e){notice('followup-notice',e.message,true);}finally{$('followup-save').disabled=false;$('followup-reload').disabled=false;}});
 $('quotes-logout').addEventListener('click',async()=>{if(!canLeave())return;try{await request(auth+'?action=logout',{});dirty=false;location.replace('/gestion/');}catch(e){notice('quotes-notice',e.message,true);}});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 (async()=>{try{const s=await request(auth+'?action=session');csrf=s.csrf;$('quote-user').textContent='Sesión de '+s.user.username;$('quotes-panel').hidden=false;await load();}catch(e){$('quotes-access').hidden=false;$('initial-error').textContent=e.message;}})();
})();
