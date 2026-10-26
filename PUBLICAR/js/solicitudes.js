(function(){
 'use strict';
 const ids=new Map();
 const uuid=()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');};
 async function requestId(selection){
  if(!crypto.subtle){const key=JSON.stringify(selection);if(!ids.has(key))ids.set(key,uuid());return ids.get(key);}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(selection)));
  const key='maderoh-request-v1:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  if(ids.has(key))return ids.get(key);let id;try{id=sessionStorage.getItem(key);}catch{}
  if(!/^[a-f0-9-]{36}$/.test(id||''))id=uuid();ids.set(key,id);try{sessionStorage.setItem(key,id);}catch{}return id;
 }
 window.MaderohSolicitudes={async guardar(selection,channel){
  const requestIdValue=await requestId(selection),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const r=await fetch('/.netlify/functions/maderoh-quotes',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selection,channel,requestId:requestIdValue}),signal:controller.signal});
   let data;try{data=await r.json();}catch{throw Error('No se pudo confirmar el registro. Vuelve a intentarlo.');}
   if(!r.ok)throw Error(data.error||'No se pudo guardar la solicitud.');return data;
  }catch(e){if(e.name==='AbortError')throw Error('La conexión tardó demasiado. Reintenta para recuperar el mismo folio.');throw e;}finally{clearTimeout(timer);}
 }};
})();
