'use strict';
(()=>{
 const endpoint='/.netlify/functions/maderoh-admin-notifications',auth='/.netlify/functions/maderoh-access';
 const $=id=>document.getElementById(id),node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const labels={pending:'En cola',sending:'Enviando',accepted:'Aceptado por Meta (entrega no confirmada)',failed:'Requiere configuración o revisión',uncertain:'Envío no confirmado; revisar antes de reintentar'};
 let csrf='',page=1,pages=1,busy=false;
 async function request(url,body){
  const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{method:'POST',headers:{'Content-Type':'application/json','X-Maderoh-CSRF':csrf},body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){const error=Error(data.error||'No se pudieron cargar los avisos.');error.status=r.status;throw error;}return data;
 }
 function addLinks(){
  for(const nav of document.querySelectorAll('.admin-nav'))if(!nav.querySelector('[data-notices]')){const a=node('a','Avisos');a.href='/gestion/avisos.html';a.dataset.notices='';if($('notice-inbox'))a.setAttribute('aria-current','page');nav.append(a);}
 }
 function badges(data){for(const a of document.querySelectorAll('[data-notices]'))a.textContent='Avisos'+(data.counts.unread?' ('+data.counts.unread+')':'');}
 function status(text,error=false){if($('notice-status')){$('notice-status').textContent=text;$('notice-status').classList.toggle('error',error);}}
 function render(data){
  badges(data);if(!$('notice-inbox'))return;
  $('notice-unread').textContent=data.counts.unread;$('notice-total').textContent=data.counts.total;
  $('notice-wa').textContent=data.whatsapp.preview?'Vista previa: WhatsApp no envía mensajes.':data.whatsapp.enabled?'WhatsApp configurado. Cola revisada cada cinco minutos.':'WhatsApp pendiente de configurar. Los avisos sí se guardan en Gestión.';
  const host=$('notice-list');host.replaceChildren();
  for(const r of data.rows){
   const card=node('article');card.className='notice-card';card.classList.toggle('unread',!r.read_at);
   const date=new Date(r.created_at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'});
   card.append(node('p',(!r.read_at?'NUEVA · ':'')+date),node('h2',r.producto),node('p',r.folio));
   card.append(node('p',r.estimate?.totals?MaderohPrecios.moneda(r.estimate.totals.totalCentavos)+' MXN · importe preliminar sin IVA':'Precio por revisar con el taller'));
   card.append(node('p','Canales preparados: '+(r.followup.canales||[]).join(' · ')),node('p','WhatsApp: '+labels[r.state]));
   if(r.last_error)card.append(node('p',r.last_error));
   const actions=node('div');actions.className='photo-actions';const link=node('a','Abrir cotización y dar seguimiento →');link.href='/gestion/cotizaciones.html?id='+encodeURIComponent(r.quote_id);actions.append(link);
   if(!r.read_at){const b=node('button','Marcar como visto');b.type='button';b.className='secondary';b.addEventListener('click',()=>action({action:'read',id:r.quote_id}));actions.append(b);}
   if(['failed','uncertain'].includes(r.state)){const b=node('button','Reintentar WhatsApp');b.type='button';b.className='secondary';b.disabled=!data.whatsapp.enabled;b.addEventListener('click',()=>{if(confirm('Revisa primero WhatsApp. Si el mensaje anterior sí llegó, repetirlo enviará otro aviso. ¿Confirmas que deseas reintentar?'))action({action:'retry',id:r.quote_id,confirmed:true});});actions.append(b);}
   if(r.read_at)card.append(node('small','Visto por '+(r.read_by||'el equipo')+'. El seguimiento comercial continúa en Cotizaciones.'));
   card.append(actions);host.append(card);
  }
  if(!data.rows.length)host.append(node('p','Los nuevos folios aparecerán aquí. El historial anterior a esta actualización sigue en Cotizaciones.'));
  page=data.page;pages=data.pages;$('notice-page').textContent='Página '+page+' de '+pages;$('notice-prev').disabled=page<=1;$('notice-next').disabled=page>=pages;
 }
 async function action(body){if(busy)return;busy=true;for(const b of $('notice-inbox').querySelectorAll('button'))b.disabled=true;try{render(await request(endpoint+'?page='+page,body));status('Cambio guardado.');}catch(e){status(e.message,true);}finally{busy=false;$('notice-refresh').disabled=false;}}
 async function load(){if(busy||document.visibilityState==='hidden')return;busy=true;try{render(await request(endpoint+'?page='+page));status('Actualizado: '+new Date().toLocaleTimeString('es-MX'));}catch(e){if(e.status===401){for(const a of document.querySelectorAll('[data-notices]'))a.textContent='Avisos';if($('notice-inbox')){$('notice-inbox').hidden=true;$('notice-access').hidden=false;}}status(e.message,true);}finally{busy=false;}}
 addLinks();
 if($('notice-inbox')){
  $('notice-refresh').addEventListener('click',load);$('notice-prev').addEventListener('click',()=>{if(!busy&&page>1){page--;load();}});$('notice-next').addEventListener('click',()=>{if(!busy&&page<pages){page++;load();}});
  (async()=>{try{const s=await request(auth+'?action=session');csrf=s.csrf;$('notice-inbox').hidden=false;await load();}catch(e){$('notice-access').hidden=false;status(e.message,true);}})();
 }else{load();}
 document.addEventListener('maderoh-session-ready',load);setInterval(load,60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});
})();
