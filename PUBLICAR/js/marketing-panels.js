(async function(){
 'use strict';
 const host=document.getElementById('marketing-panels'),defaults=globalThis.MADEROH_MARKETING;
 if(!host||!defaults||host.dataset.ready==='true')return;
 host.dataset.ready='true';
 const destination='/index.html#promociones-activas';
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function safeUrl(value){if(typeof value!=='string'||!value.trim())return null;try{const u=new URL(value,location.href);return u.protocol==='https:'||(u.origin===location.origin&&u.protocol==='http:')?u.href:null;}catch{return null;}}
 function link(text,url,cls){const n=el('a',cls,text);n.href=url;if(new URL(url,location.href).origin!==location.origin){n.target='_blank';n.rel='noopener noreferrer';}return n;}
 function campaignLink(c){return '/index.html#promocion-'+encodeURIComponent(c.id);}
 function section(side,title,subtitle){const aside=el('aside','mp-rail mp-'+side),details=el('details','mp-panel'),summary=el('summary','mp-summary');summary.append(el('span','mp-summary-title',title),el('span','mp-toggle','+'));details.append(summary);const cards=el('div','mp-cards');cards.append(el('p','mp-intro',subtitle));details.append(cards);aside.append(details);host.append(aside);return {cards,details};}
 function card(data,url){const article=el('article','mp-card');if(data.imagen){const src=safeUrl(data.imagen);if(src){const image=el('img','mp-photo');image.src=src;image.alt=data.titulo;image.loading='lazy';image.decoding='async';image.width=300;image.height=190;article.append(image);}}const body=el('div','mp-card-body');body.append(el('span','mp-kicker',data.etiqueta||'MADERÓH'),el('h2','mp-title',data.titulo),el('p','mp-copy',data.texto));if(url)body.append(link(data.boton||'Ver detalles',url,'mp-action'));article.append(body);return article;}
 let center=document.getElementById('promociones-activas');
 const page=location.pathname.split('/').filter(Boolean).at(-1)||'index.html';
 if(!center&&['index','index.html'].includes(page)){center=el('section','offer-campaigns');center.id='promociones-activas';center.setAttribute('aria-label','Promociones vigentes');const main=document.querySelector('main');if(main)main.insertBefore(center,main.querySelector('.featured-section'));}
 if(center){center.hidden=false;center.replaceChildren(el('h2',null,'Promociones y eventos'),el('p',null,'Consultando promociones publicadas…'));}
 let config=globalThis.MaderohMarketing?await globalThis.MaderohMarketing.cargar():{...defaults,campanas:[],estadoPromociones:'error'};
 let clockStart=Date.now(),serverStart=Date.parse(config.serverNow)||clockStart;
 const now=()=>serverStart+(Date.now()-clockStart);
 const active=()=>config.estadoPromociones==='ok'?(config.campanas||[]).filter(c=>c.activo===true):[];
 function centerContent(){
  if(!center)return;
  center.hidden=false;center.replaceChildren(el('h2',null,'Promociones y eventos'));
  if(config.estadoPromociones!=='ok'){
   const status=el('p','promotion-load-state','No pudimos cargar las promociones en este momento. Intenta nuevamente.');status.setAttribute('role','status');const retry=el('button','btn btn-secondary','Volver a consultar');retry.type='button';retry.addEventListener('click',async()=>{retry.disabled=true;status.textContent='Consultando promociones…';config=await globalThis.MaderohMarketing.cargar(true);clockStart=Date.now();serverStart=Date.parse(config.serverNow)||clockStart;centerContent();});center.append(status,retry);return;
  }
  const campaigns=active();
  if(!campaigns.length){center.append(el('p','promotion-load-state','Por el momento no hay promociones publicadas en esta página. Aquí aparecerán los eventos y descuentos cuando estén disponibles.'),link('Explorar el catálogo →','/productos.html','text-link'));return;}
  const grid=el('div');
  for(const c of campaigns){
   const article=el('article','offer-campaign-card');article.id='promocion-'+c.id;article.dataset.campaignEnd=c.fin;
   article.append(el('span','offer-badge',c.tipo==='descuento'?c.porcentaje+'% en precio base':'Evento'),el('h3',null,c.titulo),el('p',null,c.texto),el('small',null,'Vigencia: '+c.inicio+' al '+c.fin+' · CDMX'));
   if(c.tipo==='descuento'){article.append(el('small',null,'Modelos seleccionados. Se aplica el mejor precio entre promoción y volumen, sin acumular.'),link('Ver modelos participantes →',safeUrl(c.url)||'/productos.html?promociones=1','text-link'));}
   else if(c.productos?.length)article.append(link('Ver modelos relacionados →',c.productos.length===1?'/producto.html?id='+c.productos[0]:'/productos.html','text-link'));
   grid.append(article);
  }
  center.append(grid);
 }
 centerContent();
 if(location.hash.startsWith('#promocion-'))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start',behavior:'auto'});
 const left=section('left','Promociones y eventos','Consulta los beneficios publicados y sus condiciones.'),right=section('right','Síguenos en redes','Conoce nuestros muebles y cómo los fabricamos.');
 if(config.volumen)left.cards.append(card(config.volumen,safeUrl(config.volumen.url)));
 for(const c of active()){const article=card({...c,texto:c.texto+' Vigencia: '+c.inicio+' al '+c.fin+' (CDMX).',boton:'Ver promoción en la página'},campaignLink(c));article.dataset.campaignEnd=c.fin;left.cards.append(article);}
 if(config.temporada)left.cards.append(card({...config.temporada,texto:config.estadoPromociones==='error'?'Consulta el estado de las promociones y vuelve a intentar su carga.':'Consulta los eventos, condiciones y modelos participantes de nuestras promociones publicadas.',boton:'Consultar promociones'},destination));
 for(const r of config.redes||[]){const url=safeUrl(r.url);if(!url)continue;const article=el('article','mp-card mp-social'),body=el('div','mp-card-body');body.append(el('span','mp-social-icon',r.nombre==='Instagram'?'IG':r.nombre==='Facebook'?'f':'♪'),el('h2','mp-title',r.nombre),el('p','mp-handle',r.cuenta),el('p','mp-copy',r.descripcion),link('Visitar '+r.nombre,url,'mp-action'));article.append(body);right.cards.append(article);}
 const media=typeof matchMedia==='function'?matchMedia('(min-width: 1780px)'):null;
 function adapt(){const wide=media?media.matches:innerWidth>=1780;left.details.open=right.details.open=wide;}
 adapt();media?.addEventListener?.('change',adapt);
 setInterval(()=>{let changed=false;config.campanas=(config.campanas||[]).filter(c=>{const ended=now()>Date.parse(c.fin+'T23:59:59.999-06:00');if(ended)changed=true;return !ended;});for(const item of host.querySelectorAll('[data-campaign-end]'))if(now()>Date.parse(item.dataset.campaignEnd+'T23:59:59.999-06:00'))item.remove();if(changed)centerContent();},15000);
})();
