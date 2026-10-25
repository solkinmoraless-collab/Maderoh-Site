(function(){
'use strict';
const {calcular,acabados}=globalThis.MaderohPrecios;
globalThis.MaderohEvaluar=function evaluar(p,b){
 const quantity=b.cantidad===undefined?(p.cantidadMinima||1):b.cantidad;
 if(!Number.isSafeInteger(quantity)||quantity<(p.cantidadMinima||1)||quantity>1000)throw new Error(`Cantidad permitida: ${p.cantidadMinima||1} a 1,000 piezas.`);
 const variant=p.variantes.find(v=>v.id===b.variante);
 if(!variant&&b.variante!=='custom')throw new Error('Medida no disponible.');
 if(!acabados(p).some(a=>a.id===b.acabado)&&b.acabado!=='custom')throw new Error('Acabado no disponible.');
 if(!['aceite','electrostatica','custom'].includes(b.metal||'aceite'))throw new Error('Acabado metálico no disponible.');
 if(!['niveladores','ruedas','sin_apoyos'].includes(b.apoyos||'sin_apoyos'))throw new Error('Apoyos no disponibles.');
 const revision=!variant || b.modificaciones===true || b.acabado==='custom' || (b.metal&&b.metal!=='aceite') || b.anchoCm!=null || b.largoCm!=null || !!b.comentarios;
 const envioPendiente=p.envioSiempreCotizar===true||b.entrega!=='cdmx'||!!(p.esPedidoPequeno&&quantity<10);
 return {producto:p.nombre,variante:variant||null,cantidad:quantity,acabado:b.acabado,revision,ivaPorcentaje:p.ivaPorcentaje,
  ...(revision?{}:calcular(p,b.variante,b.acabado,quantity)),
  envioPendiente,envioCentavos:envioPendiente?null:0,motivoEnvio:p.envioSiempreCotizar===true?'Entrega y alcance del armado por cotizar según las condiciones del modelo.':b.entrega!=='cdmx'?'Destino fuera de CDMX: envío y alcance del armado por confirmar.':envioPendiente?'Entrega en CDMX por cotizar: envío gratuito desde 10 piezas.':'Transporte y armado en CDMX incluidos, conforme a agenda y accesos. En productos pequeños se incluye el envío.',
  fabricacion:p.fabricacion,registrado:false};
};

})();
