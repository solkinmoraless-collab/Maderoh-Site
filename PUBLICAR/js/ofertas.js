(function(){
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const moneda=c=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(c/100);
 function vigente(o){if(!o)return false;const now=Date.now();return now>=Date.parse(o.inicio+'T00:00:00-06:00')&&now<=Date.parse(o.fin+'T23:59:59.999-06:00');}
 function precioHTML(p,actual){const o=p.ofertaVista;if(!o)return escape(actual);const regular=(p.precioDesde?'Desde ':'')+moneda(o.antesCentavos)+' MXN · sin IVA';if(!vigente(o))return escape(regular);return '<span class="offer-price" data-offer-end="'+escape(o.fin)+'" data-offer-regular="'+escape(regular)+'"><span class="offer-badge">-'+escape(o.porcentaje)+'% en precio base</span><s class="offer-before">'+(p.precioDesde?'Desde ':'')+moneda(o.antesCentavos)+' MXN</s><strong>'+escape(actual)+'</strong><span class="offer-saving">Ahorra '+moneda(o.ahorroCentavos)+' MXN por pieza.</span><span class="offer-until">Vigencia hasta '+escape(o.fin)+' · '+escape(o.titulo)+'</span></span>';}
 function mostrar(id,p){const n=document.getElementById(id);if(n)n.innerHTML=precioHTML(p,n.textContent);}
 setInterval(()=>{for(const el of document.querySelectorAll('[data-offer-end]'))if(Date.now()>Date.parse(el.dataset.offerEnd+'T23:59:59.999-06:00')){el.textContent=el.dataset.offerRegular;delete el.dataset.offerEnd;}},15000);
 window.MaderohOfertas={precioHTML,mostrar,vigente};
})();
