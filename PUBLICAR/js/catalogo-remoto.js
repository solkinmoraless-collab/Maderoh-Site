(function(){
 'use strict';
 let pending=null,until=0;
 window.MaderohCatalogo={async respuesta(){
  if(!pending||Date.now()>until){
   until=Date.now()+30000;
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
   pending=fetch('/.netlify/functions/maderoh-products',{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal})
    .then(async response=>{if(!response.ok)throw new Error('No se pudo consultar el catalogo.');const data=await response.json();if(!Array.isArray(data.productos))throw new Error('Catalogo invalido.');return JSON.stringify(data);})
    .catch(error=>{pending=null;throw error;}).finally(()=>clearTimeout(timer));
  }
  return new Response(await pending,{headers:{'Content-Type':'application/json'}});
 }};
})();
