import {randomUUID} from 'node:crypto';
import {Failure} from './acceso.mjs';
import precios from './precios.cjs';
import defaults from './defaults.json' with {type:'json'};
const {calcular}=precios;
export const DEFAULTS=defaults;
export const CATEGORIES={recamara:'Recámaras',escritorios:'Escritorios',bancas:'Bancas',mesas:'Mesas y comedores',entretenimiento:'Centros de TV',negocios:'Negocios',almacenamiento:'Almacenamiento',otros:'Otros muebles'};
export const PLACEHOLDER='/assets/images/producto-pendiente.svg';
export const TEXT_FIELDS={nombre:160,subcategoria:160,descripcion:2500,medidas:1000,madera:2000,estructura:2000,acabado:2000,fabricacion:2000,entrega:2500,incluye:2500,garantia:2500,condiciones:5000,exclusiones:2500,construccion:2000,alturas:1000,modificacionLabel:300};
const cents=(v,label)=>{if(!Number.isSafeInteger(v)||v<0||v>1000000000)throw new Failure(400,label+': importe invalido.');return v;};
function text(value,max,label){if(typeof value!=='string'||value.length>max)throw new Failure(400,label+': texto invalido o demasiado largo.');return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();}
export function validId(value){const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw new Failure(400,'Producto invalido.');return id;}
export function validRevision(value){if(!Number.isSafeInteger(value)||value<0)throw new Failure(400,'Recarga el producto antes de guardar.');return value;}
export function galleryFor(p,g){
 const list=Array.isArray(g?.imagenes)?g.imagenes:[];
 return {productId:p.id,imagenPrincipal:g?.imagenPrincipal||p.imagen||PLACEHOLDER,imagenes:list.map(x=>({...x}))};
}
export function normalizeGallery(p,g){
 const entries=g.imagenes.map((im,i)=>({id:im.id,url:im.url,alt:im.alt||p.nombre,posicion:i,principal:im.url===g.imagenPrincipal}));
 if(entries.length&&!entries.some(im=>im.principal)){entries[0].principal=true;g.imagenPrincipal=entries[0].url;}
 const main=entries.find(im=>im.principal);
 const ordered=main?[main,...entries.filter(im=>im!==main)]:entries;
 return {productId:p.id,imagenPrincipal:main?.url||PLACEHOLDER,imagenes:ordered.map((im,i)=>({...im,posicion:i}))};
}
export function withGallery(p,g){return {...p,imagen:g.imagenPrincipal,imagenes:g.imagenes.map(i=>i.url)};}
export function validateProduct(input,old,id){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Failure(400,'Datos de producto invalidos.');
 const p={...DEFAULTS,...(old||{}),id,moneda:'MXN'};
 for(const [key,max]of Object.entries(TEXT_FIELDS))if(key in input)p[key]=text(input[key],max,key);
 if(!p.nombre||!p.descripcion||!p.medidas)throw new Failure(400,'Completa nombre, descripcion y medidas.');
 p.categoria=String(input.categoria||p.categoria||'');if(!CATEGORIES[p.categoria])throw new Failure(400,'Selecciona una categoria.');p.categoriaNombre=CATEGORIES[p.categoria];
 p.slug=old?.slug||(p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'modelo')+'-'+id;
 for(const key of ['activo','destacado','apoyos','esPedidoPequeno','envioSiempreCotizar','precioPendiente']){
  if(key in input&&typeof input[key]!=='boolean')throw new Failure(400,'Opcion de producto invalida.');
  p[key]=key in input?input[key]:(old?.[key]??(key==='apoyos'));
 }
 p.cantidadMinima=input.cantidadMinima??old?.cantidadMinima??1;
 if(!Number.isSafeInteger(p.cantidadMinima)||p.cantidadMinima<1||p.cantidadMinima>1000)throw new Failure(400,'Cantidad minima: de 1 a 1000.');
 p.ivaPorcentaje=old?.ivaPorcentaje??16;p.anticipoPorcentaje=old?.anticipoPorcentaje??50;
 for(const [key,max]of [['variantes',20],['acabados',10]]){
  const list=input[key]??old?.[key];if(!Array.isArray(list)||(!list.length&&!(key==='variantes'&&p.precioPendiente))||list.length>max)throw new Failure(400,'Agrega al menos una '+(key==='variantes'?'configuracion':'opcion de acabado')+'.');
  const seen=new Set();
  p[key]=list.map(item=>{
   if(!item||typeof item!=='object')throw new Failure(400,'Configuracion invalida.');
   const itemId=String(item.id||'');if(!/^[a-z0-9_-]{1,60}$/.test(itemId)||seen.has(itemId)||itemId==='custom')throw new Failure(400,'Identificador de configuracion invalido.');seen.add(itemId);
   const nombre=text(item.nombre,200,'Nombre de configuracion');if(!nombre)throw new Failure(400,'Escribe el nombre de cada configuracion y acabado.');
   const netoCentavos=cents(item.netoCentavos,'Precio');if(key==='variantes'&&netoCentavos<1)throw new Failure(400,'El precio de cada configuracion debe ser mayor a cero.');
   const previous=(old?.[key]||[]).find(x=>x.id===itemId);
   const result={...(previous||{}),id:itemId,nombre,netoCentavos};
   if(key==='variantes'&&('colchonAnchoCm' in item||'colchonLargoCm' in item)){
    const a=item.colchonAnchoCm,l=item.colchonLargoCm;
    if(a==null&&l==null){delete result.colchonAnchoCm;delete result.colchonLargoCm;}
    else{if(!Number.isFinite(a)||!Number.isFinite(l)||a<30||a>400||l<30||l>400)throw new Failure(400,'Revisa el ancho y largo del colchon en cada configuracion.');result.colchonAnchoCm=a;result.colchonLargoCm=l;}
   }
   return result;
  });
 }
 p.acabadoPredeterminado=input.acabadoPredeterminado??old?.acabadoPredeterminado??p.acabados[0].id;
 if(!p.acabados.some(a=>a.id===p.acabadoPredeterminado))throw new Failure(400,'Selecciona un acabado predeterminado disponible.');
 const tiers=input.precioVolumen??old?.precioVolumen??[];
 if(!Array.isArray(tiers)||tiers.length>20)throw new Failure(400,'Precios por cantidad invalidos.');
 const seenQty=new Set();p.precioVolumen=tiers.map(t=>{
  if(!Number.isSafeInteger(t.desde)||t.desde<p.cantidadMinima||t.desde>1000||seenQty.has(t.desde))throw new Failure(400,'Revisa las cantidades de los precios por volumen.');seenQty.add(t.desde);
  const netoCentavos=cents(t.netoCentavos,'Precio por cantidad');if(netoCentavos<1)throw new Failure(400,'El precio por cantidad debe ser mayor a cero.');return{desde:t.desde,netoCentavos};
 }).sort((a,b)=>a.desde-b.desde);
 const collections=input.colecciones??old?.colecciones??[];
 if(!Array.isArray(collections)||collections.some(x=>!['cafeterias','tiendas'].includes(x)))throw new Failure(400,'Coleccion invalida.');p.colecciones=[...new Set(collections)];
 p.tipoMedida=input.tipoMedida??old?.tipoMedida??'mueble';if(!['mueble','colchon'].includes(p.tipoMedida))throw new Failure(400,'Tipo de medida invalido.');
 p.brillanteNetoCentavos=p.acabados.find(a=>a.id==='brillante')?.netoCentavos??0;
 p.precioDesde=!p.precioPendiente&&(p.variantes.length>1||p.precioVolumen.length>0);
 const quantities=[p.cantidadMinima,...p.precioVolumen.map(t=>t.desde)];
 p.precio=p.precioPendiente?null:Math.min(...p.variantes.flatMap(v=>quantities.map(q=>calcular(p,v.id,p.acabadoPredeterminado,q).unitarioTotalCentavos)))/100;
 return p;
}
export async function readProduct(client,id,lock=false){
 const row=(await client.query(`SELECT id,document,revision,updated_at FROM public.maderoh_products WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];
 if(!row)throw new Failure(404,'Producto no encontrado.');
 const setting=(await client.query('SELECT document FROM public.maderoh_settings WHERE key=$1',['gallery:'+id])).rows[0];
 return {product:row.document,revision:Number(row.revision),updatedAt:row.updated_at,gallery:galleryFor(row.document,setting?.document)};
}
export function checkRevision(current,expected){if(current!==validRevision(expected))throw new Failure(409,'Este modelo cambio desde que lo abriste. Tus cambios no se guardaron. Recarga el modelo para revisar la version mas reciente.');}
export async function persist(client,product,gallery,revision,actor,action){
 gallery=normalizeGallery(product,gallery);product=withGallery(product,gallery);
 if(product.activo&&!gallery.imagenes.length)throw new Failure(400,'Agrega al menos una fotografia antes de publicar el modelo.');
 const row=(await client.query(`UPDATE public.maderoh_products SET document=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND revision=$3 RETURNING revision,updated_at`,[JSON.stringify(product),product.id,revision])).rows[0];
 if(!row)throw new Failure(409,'El modelo cambio. Recargalo antes de guardar.');
 await client.query(`INSERT INTO public.maderoh_settings(key,document) VALUES($1,$2)
 ON CONFLICT(key) DO UPDATE SET document=EXCLUDED.document,revision=maderoh_settings.revision+1,updated_at=now()`,['gallery:'+product.id,JSON.stringify(gallery)]);
 await client.query('INSERT INTO public.maderoh_audit(actor,action,entity,detail) VALUES($1,$2,$3,$4)',[actor,action,'product:'+product.id,JSON.stringify({revision:Number(row.revision)})]);
 return {product,gallery,revision:Number(row.revision),updatedAt:row.updated_at};
}
export function newVariantId(){return 'v-'+randomUUID().slice(0,8);}
