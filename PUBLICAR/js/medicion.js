(function(){
 'use strict';
 const allowedPages=['index.html','productos.html','producto.html','personaliza.html','preguntas-frecuentes.html','envios.html','facturacion.html','aviso-privacidad.html','terminos-condiciones.html'];
 const names={index:'index.html',productos:'productos.html',producto:'producto.html',personaliza:'personaliza.html','preguntas-frecuentes':'preguntas-frecuentes.html',envios:'envios.html',facturacion:'facturacion.html','aviso-privacidad':'aviso-privacidad.html','terminos-condiciones':'terminos-condiciones.html'};
 const path=location.pathname.split('/').filter(Boolean).at(-1)||'index.html',page=names[path]||path;
 if(!allowedPages.includes(page))return;
 const key='maderoh-measure-choice-v1',visitorKey='maderoh-measure-visitor-v1',sessionKey='maderoh-measure-session-v1';
 const get=k=>{try{return localStorage.getItem(k);}catch{return null;}},set=(k,v)=>{try{localStorage.setItem(k,v);}catch{}},remove=k=>{try{localStorage.removeItem(k);}catch{}};
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const valid=s=>/^[a-f0-9]{32}$/.test(s||'');
 let choice=get(key),memoryVisitor=null,memorySession=null,queue=[],timer=null,busy=false,stopped=false,controller=null,banner,statusNode,lastSession='',productId=null;
 const seenViews=new Set(),recent=new Map();
 const restricted=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
 function source(){
  const map={facebook:'facebook',fb:'facebook',instagram:'instagram',ig:'instagram',tiktok:'tiktok',youtube:'youtube',google:'google',whatsapp:'whatsapp',wa:'whatsapp'};
  const utm=new URLSearchParams(location.search).get('utm_source');if(utm)return map[utm.toLowerCase()]||'other';
  if(!document.referrer)return 'direct';let host;try{host=new URL(document.referrer).hostname;}catch{return 'other';}
  if(host===location.hostname)return 'direct';
  for(const [domain,name]of [['facebook.com','facebook'],['fb.com','facebook'],['instagram.com','instagram'],['tiktok.com','tiktok'],['youtube.com','youtube'],['youtu.be','youtube'],['google.com','google'],['google.com.mx','google'],['whatsapp.com','whatsapp'],['wa.me','whatsapp']])if(host===domain||host.endsWith('.'+domain))return name;
  return 'other';
 }
 function context(){
  let visitor=get(visitorKey)||memoryVisitor;if(!valid(visitor)){visitor=random();set(visitorKey,visitor);}memoryVisitor=visitor;
  let session;try{session=JSON.parse(get(sessionKey)||'null');}catch{}session=session||memorySession;
  if(!session||!valid(session.id)||!Number.isFinite(session.last)||Date.now()-session.last>30*60000||session.last>Date.now()+60000||!['direct','facebook','instagram','tiktok','youtube','google','whatsapp','other'].includes(session.source)||!['mobile','tablet','desktop'].includes(session.device))session={id:random(),last:Date.now(),source:source(),device:window.innerWidth<768?'mobile':window.innerWidth<1100?'tablet':'desktop'};
  session.last=Date.now();set(sessionKey,JSON.stringify(session));memorySession=session;
  return {visitor,session:session.id,source:session.source,device:session.device};
 }
 function push(type,id,ctx){queue.push({ctx,event:{id:random(),type,page,productId:id||null}});if(queue.length>50)queue.shift();}
 function track(type,id){
  if(choice!=='accepted'||restricted()||stopped||document.visibilityState==='prerender')return;
  if(id!=null&&(!Number.isSafeInteger(id)||id<1))return;
  const k=type+':'+(id||''),now=Date.now();if(type!=='page_view'&&now-(recent.get(k)||0)<700)return;recent.set(k,now);
  const ctx=context();
  if(lastSession!==ctx.session){lastSession=ctx.session;if(type!=='page_view')push('page_view',null,ctx);}
  push(type,id,ctx);clearTimeout(timer);timer=setTimeout(flush,250);
 }
 async function flush(){
  if(busy||!queue.length||choice!=='accepted'||restricted()||stopped)return;
  busy=true;const first=queue[0].ctx,batch=[];while(queue.length&&batch.length<10&&queue[0].ctx.session===first.session)batch.push(queue.shift());
  controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  try{await fetch('/.netlify/functions/maderoh-events',{method:'POST',credentials:'same-origin',cache:'no-store',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,...first,events:batch.map(x=>x.event)}),signal:controller.signal});}catch{/* Medición opcional: un fallo no bloquea la web ni crea solicitudes. */}finally{clearTimeout(timeout);busy=false;controller=null;if(queue.length)timer=setTimeout(flush,250);}
 }
 function productView(id){productId=id;if(choice!=='accepted'||restricted()||seenViews.has(id))return;seenViews.add(id);track('product_view',id);}
 window.MaderohAnalytics={productClick:id=>track('product_click',id),productView,quoteClick:id=>track('quote_click',id)};
 function start(){if(restricted())return;stopped=false;track('page_view');if(productId)productView(productId);}
 function updateChoice(value){
  choice=value;set(key,value);banner.hidden=true;statusNode.textContent=value==='accepted'?'Medición opcional activada.':'Medición opcional desactivada.';
  if(value==='accepted'){seenViews.clear();lastSession='';start();}
  else{stopped=true;clearTimeout(timer);queue=[];controller?.abort();remove(visitorKey);remove(sessionKey);memoryVisitor=null;memorySession=null;lastSession='';seenViews.clear();}
 }
 function node(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
 function init(){
  banner=node('section',null,'measure-choice');banner.setAttribute('aria-label','Medición opcional de navegación');
  const body=node('div'),title=node('strong','Medición de navegación'),copy=node('p','¿Nos permites contar visitas y conocer los modelos más consultados? Es opcional y puedes cambiar tu decisión cuando quieras. No guardamos nombres, teléfonos ni mensajes en estas estadísticas.');body.append(title,copy);
  const link=node('a','Ver privacidad');link.href='/aviso-privacidad.html#medicion-navegacion';body.append(link);
  const controls=node('div',null,'measure-controls');
  const accept=node('button','Permitir medición'),reject=node('button','Continuar sin medición');accept.type=reject.type='button';accept.addEventListener('click',()=>updateChoice('accepted'));reject.addEventListener('click',()=>updateChoice('rejected'));controls.append(accept,reject);banner.append(body,controls);
  const head=document.querySelector('.site-header');if(head)head.after(banner);else document.body.prepend(banner);
  const preferences=node('div',null,'measure-preferences'),button=node('button','Preferencias de navegación');button.type='button';statusNode=node('span');statusNode.setAttribute('role','status');
  button.addEventListener('click',()=>{banner.hidden=false;if(restricted()){copy.textContent='Tu navegador solicita no realizar seguimiento. Respetamos esa preferencia y no enviamos eventos de navegación.';accept.disabled=true;reject.textContent='Cerrar';}banner.scrollIntoView({behavior:'smooth',block:'center'});reject.focus();});preferences.append(button,statusNode);
  const footer=document.getElementById('site-footer');if(footer)footer.after(preferences);else document.body.append(preferences);
  banner.hidden=choice==='accepted'||choice==='rejected'||restricted();
  if(restricted()){updateChoice('rejected');banner.hidden=true;}else if(choice==='accepted')start();
  const display=document.getElementById('variant-product');if(page==='producto.html'&&display&&!display.hidden){const id=Number(new URLSearchParams(location.search).get('id'));if(Number.isSafeInteger(id)&&id>0)productView(id);}
  document.addEventListener('click',event=>{
   const target=event.target.closest('a,button');if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
   if(target.id==='quote-print'||target.id==='quote-whatsapp'||target.id==='sales-mobile-action'){track('quote_click',productId);if(target.id!=='quote-print')track('whatsapp_click',productId);return;}
   if(target.tagName==='A'){
    let u;try{u=new URL(target.href,location.href);}catch{return;}
    if(u.origin===location.origin&&['/producto.html','/producto'].includes(u.pathname)){const id=Number(u.searchParams.get('id'));if(id>0)track('product_click',id);}
    if(u.hostname==='wa.me'||u.hostname==='api.whatsapp.com')track('whatsapp_click',productId);
   }
  },true);
  document.getElementById('configurador')?.addEventListener('submit',()=>track('quote_click'));
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
  window.addEventListener('storage',e=>{if(e.key===key&&e.newValue!==choice){choice=e.newValue;if(choice!=='accepted'){stopped=true;queue=[];controller?.abort();}else{seenViews.clear();lastSession='';start();}}});
 }
 if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init,{once:true});
})();
