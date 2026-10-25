(async function(){
  'use strict';
  let config=globalThis.MADEROH_MARKETING;const host=document.getElementById('marketing-panels');
  if(!host || !config || host.dataset.ready==='true')return;
  host.dataset.ready='true';
  function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
  function safeUrl(value){
    if(typeof value!=='string'||!value.trim())return null;
    try{const u=new URL(value,location.href);return u.protocol==='https:' || (u.origin===location.origin && u.protocol==='http:')?u.href:null;}catch{return null;}
  }
  function wa(text){return 'https://wa.me/'+String(config.whatsapp).replace(/\D/g,'')+'?text='+encodeURIComponent(text);}
  function link(text,url,className){const node=el('a',className,text);node.href=url;if(new URL(url,location.href).origin!==location.origin){node.target='_blank';node.rel='noopener noreferrer';}return node;}
  function section(side,title,subtitle){
    const aside=el('aside','mp-rail mp-'+side),details=el('details','mp-panel'),summary=el('summary','mp-summary');
    const heading=el('span','mp-summary-title',title);summary.append(heading,el('span','mp-toggle','+'));details.append(summary);
    const cards=el('div','mp-cards');cards.append(el('p','mp-intro',subtitle));details.append(cards);aside.append(details);host.append(aside);return {cards,details};
  }
  function card(data,url){
    const article=el('article','mp-card');
    if(data.imagen){const imageUrl=safeUrl(data.imagen);if(imageUrl){const image=el('img','mp-photo');image.src=imageUrl;image.alt=data.titulo;image.loading='lazy';image.decoding='async';image.width=300;image.height=190;article.append(image);}}
    const body=el('div','mp-card-body');body.append(el('span','mp-kicker',data.etiqueta||'MADERÓH'),el('h2','mp-title',data.titulo),el('p','mp-copy',data.texto));if(url)body.append(link(data.boton||'Ver detalles',url,'mp-action'));article.append(body);return article;
  }
  const left=section('left','Promociones y eventos','Opciones para equipar tu espacio.'),right=section('right','Síguenos en redes','Conoce nuestros muebles y cómo los fabricamos.');
  if(config.volumen)left.cards.append(card(config.volumen,safeUrl(config.volumen.url)));
  const now=Date.now();
  for(const campaign of config.campanas||[]){
    if(campaign.activo!==true)continue;
    // Incomplete or expired date ranges never publish an offer.
    if(!campaign.inicio||!campaign.fin||!Number.isFinite(Date.parse(campaign.inicio))||!Number.isFinite(Date.parse(campaign.fin)))continue;
    if(now<Date.parse(campaign.inicio)||now>Date.parse(campaign.fin)||Date.parse(campaign.fin)<Date.parse(campaign.inicio))continue;
    left.cards.append(card(campaign,safeUrl(campaign.url)));
  }
  if(config.temporada)left.cards.append(card(config.temporada,wa('Hola, quisiera conocer las promociones y eventos de descuentos de Maderóh, sus condiciones y vigencia.')));
  for(const network of config.redes||[]){
    const article=el('article','mp-card mp-social');const body=el('div','mp-card-body');
    body.append(el('span','mp-social-icon',network.nombre==='Instagram'?'IG':network.nombre==='Facebook'?'f':'♪'),el('h2','mp-title',network.nombre),el('p','mp-handle',network.cuenta),el('p','mp-copy',network.descripcion));
    const url=safeUrl(network.url);body.append(link(url?'Visitar '+network.nombre:'Pedir enlace por WhatsApp',url||wa('Hola, ¿me compartes el enlace oficial de '+network.nombre+' de Maderóh?'),'mp-action'));article.append(body);right.cards.append(article);
  }
  // Open in wide-screen gutters; use native collapsible panels when placed inline.
  const media=typeof matchMedia==='function'?matchMedia('(min-width: 1780px)'):null;
  function adapt(){const wide=media?media.matches:innerWidth>=1780;left.details.open=wide;right.details.open=wide;}
  adapt();if(media?.addEventListener)media.addEventListener('change',adapt);
})();
