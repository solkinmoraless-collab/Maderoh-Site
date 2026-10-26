(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
 const photo=$('variant-photo'),dialog=$('sales-photo-dialog');
 if(photo&&dialog){
  const open=$('sales-photo-open');
  function caption(){const name=$('variant-name').textContent||'Mueble Maderóh';const imgs=[...document.querySelectorAll('#product-gallery img')];const idx=imgs.findIndex(img=>img.src===photo.src);return name+(idx>=0?' · Fotografía '+(idx+1)+' de '+imgs.length:'');}
  function refreshPhoto(){const text=caption();$('sales-photo-caption').textContent=text;if(dialog.open){$('sales-photo-large').src=photo.src;$('sales-photo-large').alt=text;$('sales-photo-title').textContent=text;}}
  new MutationObserver(refreshPhoto).observe(photo,{attributes:true,attributeFilter:['src','alt']});
  open.addEventListener('click',()=>{if(!photo.getAttribute('src'))return;dialog.showModal();refreshPhoto();$('sales-photo-detail').textContent='Fotografía real del modelo. Color, medidas y configuración se confirman en la cotización.';});
  $('sales-photo-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 }
 const action=$('quote-whatsapp'),bar=$('sales-mobile-quote');
 if(action&&bar){
  function sync(){
   const visible=!$('variant-product').hidden;bar.hidden=!visible;if(visible)document.body.classList.add('sales-has-mobile-quote');
   $('sales-mobile-name').textContent=$('variant-name').textContent;$('sales-mobile-price').textContent=$('quote-total').textContent;
   const cta=$('sales-mobile-action'),href=action.getAttribute('href'),enabled=action.getAttribute('aria-disabled')==='false'&&!!href;
   cta.setAttribute('aria-disabled',String(!enabled));if(enabled)cta.href=href;else cta.removeAttribute('href');
   cta.textContent=enabled?'Cotizar este modelo':'Revisa la configuración';
  }
  const observer=new MutationObserver(sync);observer.observe(action,{attributes:true,attributeFilter:['href','aria-disabled']});
  observer.observe($('quote-summary'),{childList:true,subtree:true,characterData:true});observer.observe($('variant-product'),{attributes:true,attributeFilter:['hidden']});sync();
 }
 async function load(){
  if(!$('sales-product-facts')&&!document.querySelector('[data-model-id]'))return;
  try{
   const response=await window.MaderohCatalogo.respuesta();if(!response.ok)return;const {productos}=await response.json();
   for(const card of document.querySelectorAll('[data-model-id]')){const p=productos.find(p=>p.id===Number(card.dataset.modelId));if(!p){card.hidden=true;continue;}card.hidden=false;card.querySelector('h3').textContent=p.nombre;const img=card.querySelector('img');img.src=p.imagen;img.alt=p.nombre;const description=card.querySelector('p');if(description)description.textContent=p.madera||p.descripcion||'';}
   if(!$('sales-product-facts'))return;
   const p=productos.find(p=>String(p.id)===new URLSearchParams(location.search).get('id'));if(!p)return;
   for(const [label,value]of [['Medidas del modelo',p.medidas],['Madera',p.madera],['Estructura',p.estructura],['Fabricación',p.fabricacion],['Incluido',p.incluye],['Adicionales',p.exclusiones]]){
    if(!value)continue;const div=document.createElement('div');div.append(node('dt',label),node('dd',value));$('sales-facts-list').append(div);
   }
   $('sales-product-facts').hidden=false;
  }catch{/* La ficha principal conserva sus especificaciones y reintento de carga. */}
 }
 load();
})();
