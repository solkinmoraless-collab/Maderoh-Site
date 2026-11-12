/* Maderóh · Publicidad del sitio. Los importes de venta se conservan en database/catalogo.json. */
globalThis.MADEROH_MARKETING = {
  whatsapp: '525577265340',
  redes: [
    { nombre:'Instagram', cuenta:'@maderoh_mx', url:'https://www.instagram.com/maderoh_mx/', descripcion:'Muebles, acabados y proyectos reales.' },
    { nombre:'Facebook', cuenta:'Maderóh', url:'https://www.facebook.com/profile.php?id=61574687565250', descripcion:'Modelos, novedades y atención directa.' },
    { nombre:'TikTok', cuenta:'@maderoh_mx', url:'https://www.tiktok.com/@maderoh_mx', descripcion:'Conoce el trabajo y los detalles del taller.' }
  ],
  volumen: {
    titulo:'Salseros con tu logo',
    etiqueta:'PRECIO POR VOLUMEN',
    texto:'Mejor precio desde 15 piezas del mismo diseño y logo. Pedido mínimo: 10 piezas.',
    imagen:'assets/images/productos/salseros-personalizados-para-restaurante-1.webp',
    url:'producto.html?id=21',
    boton:'Ver cantidades y precios'
  },
  temporada: {
    titulo:'Promociones y eventos',
    etiqueta:'BENEFICIOS DE TEMPORADA',
    texto:'Consulta los eventos, condiciones y modelos participantes de nuestras promociones publicadas.',
    boton:'Consultar promociones'
  },
  // Las campañas se activan únicamente con información aprobada.
  // Campos: activo, titulo, texto, url, boton, inicio y fin.
  // Las fechas deben ser ISO 8601 con zona horaria, por ejemplo: 2026-11-01T00:00:00-06:00.
  campanas: []
};

/* Una consulta compartida, con estado explícito de la lectura pública. */
(function(){
 let promise;
 globalThis.MaderohMarketing={cargar(force=false){
  if(force||!promise){
   const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
   promise=fetch('/.netlify/functions/maderoh-marketing',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:c.signal})
    .then(async r=>{if(!r.ok)throw Error('Promociones no disponibles');const data=await r.json();if(!data.marketing||!Array.isArray(data.marketing.redes)||!Array.isArray(data.marketing.campanas))throw Error('Promociones inválidas');return {...globalThis.MADEROH_MARKETING,...data.marketing,estadoPromociones:'ok',serverNow:data.serverNow};})
    .catch(()=>({...globalThis.MADEROH_MARKETING,campanas:[],estadoPromociones:'error'})).finally(()=>clearTimeout(timer));
  }
  return promise;
 }};
})();
