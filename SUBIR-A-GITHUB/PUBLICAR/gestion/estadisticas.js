(function(){
 'use strict';
 const $=id=>document.getElementById(id),endpoint='/.netlify/functions/maderoh-admin-analytics',access='/.netlify/functions/maderoh-access';
 const sources={direct:'Directo',facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',google:'Google',whatsapp:'WhatsApp',other:'Otros'},devices={mobile:'Móvil',tablet:'Tableta',desktop:'Escritorio'},pages={'index.html':'Inicio','productos.html':'Catálogo','producto.html':'Ficha de producto','personaliza.html':'Personaliza','preguntas-frecuentes.html':'Preguntas frecuentes','envios.html':'Envíos','facturacion.html':'Facturación','aviso-privacidad.html':'Privacidad','terminos-condiciones.html':'Términos'};
 let csrf='',loaded=null,applied=null,sequence=0,controller=null,exporting=false;
 const n=x=>new Intl.NumberFormat('es-MX').format(x),el=(tag,text)=>{const e=document.createElement(tag);if(text!=null)e.textContent=String(text);return e;},note=(s,error=false)=>{$('stats-notice').textContent=s;$('stats-notice').classList.toggle('error',error);};
 function expired(){$('stats-panel').hidden=true;$('stats-access').hidden=false;loaded=null;applied=null;for(const id of ['ranking-rows','daily-rows','source-bars','device-bars','page-rows','daily-chart'])$(id).replaceChildren();}
 async function json(url,options={}){const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...options});let d;try{d=await r.json();}catch{throw Error('El servidor no devolvió una respuesta válida.');}if(!r.ok){if(r.status===401)expired();throw Error(d.error||'No fue posible consultar el reporte.');}return d;}
 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function preset(){const t=today(),days=Number($('stats-preset').value);if(!days)return;$('stats-to').value=t;$('stats-from').value=new Date(Date.parse(t+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);$('download-ranking').disabled=true;}
 function cells(row,labels,values){values.forEach((v,i)=>{const c=el('td',v);c.dataset.label=labels[i];row.append(c);});}
 function empty(id,colspan,text){const row=el('tr'),cell=el('td',text);cell.colSpan=colspan;row.append(cell);$(id).append(row);}
 function chart(){if(!loaded)return;const metric=$('stats-metric').value,max=Math.max(1,...loaded.daily.map(d=>d[metric]));$('daily-chart').replaceChildren();
  for(const d of loaded.daily){const col=el('div');col.className='day-column';const b=el('button');b.type='button';b.style.height=Math.max(3,d[metric]/max*145)+'px';b.title=d.dia+': '+n(d[metric]);b.setAttribute('aria-label',d.dia+': '+n(d[metric])+' '+$('stats-metric').selectedOptions[0].textContent);b.addEventListener('click',()=>{$('chart-detail').textContent=d.dia+' · '+n(d.sesiones)+' sesiones · '+n(d.paginas)+' páginas · '+n(d.folios)+' folios';});col.append(b,el('span',d.dia.slice(8)));$('daily-chart').append(col);}
  const wrap=document.querySelector('.daily-chart-wrap');wrap.scrollLeft=wrap.scrollWidth;
  $('chart-detail').textContent=loaded.daily.some(d=>d[metric]>0)?'Selecciona una barra. El número inferior corresponde al día del mes.':'Sin actividad registrada para esta métrica en el periodo.';
 }
 function bars(id,rows,key,labels){$(id).replaceChildren();const max=Math.max(1,...rows.map(r=>r.sesiones));if(!rows.length){$(id).append(el('p','Sin sesiones medidas en el periodo.'));return;}for(const r of rows){const row=el('div'),p=el('p'),track=el('div'),fill=el('span');p.append(el('span',labels[r[key]]||r[key]),el('strong',n(r.sesiones)));track.className='metric-track';fill.style.width=(r.sesiones/max*100)+'%';track.append(fill);row.append(p,track);$(id).append(row);}}
 function render(data){
  loaded=data;const s=data.summary,q=data.quotes;
  for(const [id,v]of [['s-sessions',s.sesiones],['s-visitors',s.navegadores],['s-pages',s.paginas],['s-product-views',s.vistas_producto],['s-product-clicks',s.clics_producto],['s-quotes',q.folios]])$(id).textContent=n(v);
  $('stats-intents').textContent='Clics medidos para cotizar: '+n(s.intentos_cotizar)+' · Clics medidos hacia WhatsApp: '+n(s.clics_whatsapp);
  $('stats-quotes-summary').textContent=n(q.folios)+' folios · '+n(q.pdf)+' con preparación PDF · '+n(q.whatsapp)+' con preparación WhatsApp · '+n(q.aceptadas)+' con estado Aceptada';
  $('daily-rows').replaceChildren();for(const d of data.daily){const row=el('tr');cells(row,['Fecha','Sesiones','Páginas vistas','Folios'],[d.dia,n(d.sesiones),n(d.paginas),n(d.folios)]);$('daily-rows').append(row);}chart();
  $('ranking-rows').replaceChildren();for(const r of data.ranking){const row=el('tr');cells(row,['Modelo','Vistas','Navegadores','Clics','Folios','PDF','WhatsApp'],[r.modelo,n(r.vistas),n(r.navegadores),n(r.clics),n(r.folios),n(r.pdf),n(r.whatsapp)]);const info=el('span',r.modelo);info.append(el('small','#'+r.id+(r.activo?'':' · Inactivo / retirado')));row.firstElementChild.replaceChildren(info);$('ranking-rows').append(row);}if(!data.ranking.length)empty('ranking-rows',7,'Todavía no hay actividad de modelos en este periodo.');
  bars('source-bars',data.sources,'source',sources);bars('device-bars',data.devices,'device',devices);
  $('page-rows').replaceChildren();for(const p of data.pages){const row=el('tr');cells(row,['Página','Vistas'],[pages[p.page]||p.page,n(p.vistas)]);$('page-rows').append(row);}if(!data.pages.length)empty('page-rows',2,'Sin páginas medidas en el periodo.');
  $('stats-updated').textContent='Actualizado: '+new Date(data.generatedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})+' · Periodo: '+data.period.desde+' al '+data.period.hasta+' · CDMX';
 }
 async function load(){
  const id=++sequence;controller?.abort();controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),30000);$('download-ranking').disabled=true;note('Consultando estadísticas…');
  try{const params=new URLSearchParams({desde:$('stats-from').value,hasta:$('stats-to').value}),data=await json(endpoint+'?'+params,{signal:current.signal});if(id!==sequence)return;applied={desde:data.period.desde,hasta:data.period.hasta};render(data);$('download-ranking').disabled=exporting;note('Reporte actualizado. '+data.ranking.length+' modelos con actividad.');}
  catch(e){if(id!==sequence)return;note(e.name==='AbortError'?'La consulta tardó demasiado. Vuelve a intentarlo.':e.message,true);}finally{clearTimeout(timer);}
 }
 $('stats-filters').addEventListener('submit',e=>{e.preventDefault();load();});$('stats-preset').addEventListener('change',preset);for(const id of ['stats-from','stats-to'])$(id).addEventListener('input',()=>{$('stats-preset').value='custom';$('download-ranking').disabled=true;});$('stats-metric').addEventListener('change',chart);
 $('download-ranking').addEventListener('click',async()=>{
  if(!applied||exporting)return;exporting=true;$('download-ranking').disabled=true;const period={...applied},c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);note('Preparando ranking CSV…');
  try{const r=await fetch(endpoint+'?'+new URLSearchParams({...period,format:'csv'}),{cache:'no-store',credentials:'same-origin',signal:c.signal});if(!r.ok){if(r.status===401)expired();const d=await r.json();throw Error(d.error||'No fue posible descargar el ranking.');}if(!/^text\/csv/i.test(r.headers.get('content-type')||''))throw Error('El servidor no devolvió un archivo CSV.');const blob=await r.blob(),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='maderoh-ranking-'+period.desde+'-'+period.hasta+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);note('Archivo CSV preparado. Revisa las descargas de tu navegador.');}
  catch(e){note(e.name==='AbortError'?'La descarga tardó demasiado. Vuelve a intentarlo.':e.message,true);}finally{clearTimeout(timer);exporting=false;$('download-ranking').disabled=!loaded||$('stats-from').value!==applied?.desde||$('stats-to').value!==applied?.hasta;}
 });
 $('stats-logout').addEventListener('click',async()=>{try{await json(access+'?action=logout',{method:'POST',headers:{'Content-Type':'application/json','X-Maderoh-CSRF':csrf},body:'{}'});location.replace('/gestion/');}catch(e){note(e.message,true);}});
 (async()=>{try{const s=await json(access+'?action=session');csrf=s.csrf;$('stats-user').textContent='Sesión de '+s.user.username;$('stats-panel').hidden=false;$('stats-from').max=$('stats-to').max=today();preset();await load();}catch(e){$('stats-access').hidden=false;$('stats-error').textContent=e.message;}})();
})();
