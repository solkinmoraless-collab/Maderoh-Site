/* Maderóh · Publicidad del sitio. Los importes de venta se conservan en database/catalogo.json. */
globalThis.MADEROH_MARKETING = {
  whatsapp: '525577265340',
  redes: [
    { nombre:'Instagram', cuenta:'@maderoh_mx', url:'https://www.instagram.com/maderoh_mx/', descripcion:'Muebles, acabados y proyectos reales.' },
    { nombre:'Facebook', cuenta:'Maderóh_mx', url:null, descripcion:'Solicita el enlace de nuestra página.' },
    { nombre:'TikTok', cuenta:'Videos del taller', url:null, descripcion:'Solicita el enlace de nuestra cuenta.' }
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
    texto:'Pregunta por los modelos participantes, beneficios disponibles y vigencia de cada promoción.',
    boton:'Consultar promociones'
  },
  // Las campañas se activan únicamente con información aprobada.
  // Campos: activo, titulo, texto, url, boton, inicio y fin.
  // Las fechas deben ser ISO 8601 con zona horaria, por ejemplo: 2026-11-01T00:00:00-06:00.
  campanas: []
};
