import {Failure,response,bodyFrom,transaction,quota,requireAdmin} from './acceso.mjs';
import precios from './precios.cjs';

export const MARKETING_KEY='marketing:v1';
export const REDES=[
 {nombre:'Instagram',cuenta:'@maderoh_mx',url:'https://www.instagram.com/maderoh_mx/',descripcion:'Muebles, acabados y proyectos reales.'},
 {nombre:'TikTok',cuenta:'@maderoh_mx',url:'https://www.tiktok.com/@maderoh_mx',descripcion:'Conoce el trabajo y los detalles del taller.'},
 {nombre:'Facebook',cuenta:'Maderóh',url:'https://www.facebook.com/profile.php?id=61574687565250',descripcion:'Modelos, novedades y atención directa.'}
];
export const marketingDefault=()=>({campanas:[],redes:REDES.map(r=>({...r}))});
function texto(v,max,label){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new Failure(400,'Revisa '+label+'.');return v.trim();}
export function fecha(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
export function redURL(value,nombre){
 const raw=texto(value,500,'el enlace de '+nombre);if(!raw)return '';
 let u;try{u=new URL(raw);}catch{throw new Failure(400,'Usa un enlace HTTPS válido para '+nombre+'.');}
 const hosts={Instagram:['instagram.com','www.instagram.com'],TikTok:['tiktok.com','www.tiktok.com'],Facebook:['facebook.com','www.facebook.com','m.facebook.com']};
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts[nombre]?.includes(u.hostname))throw new Failure(400,'El enlace de '+nombre+' debe pertenecer a su sitio oficial y usar HTTPS.');
 for(const key of [...u.searchParams.keys()])if(key!=='id')u.searchParams.delete(key);
 u.hash='';return u.href;
}
export function validarMarketing(input,ids){
 if(!input||!Array.isArray(input.campanas)||input.campanas.length>30||!Array.isArray(input.redes)||input.redes.length!==3)throw new Failure(400,'Se admiten hasta 30 promociones y las tres redes oficiales.');
 const seen=new Set();const campanas=input.campanas.map(c=>{
  if(!c||typeof c!=='object'||!/[a-z0-9]/.test(c.id||'')||!/^[a-z0-9-]{1,64}$/.test(c.id)||seen.has(c.id))throw new Failure(400,'Identificador de promoción inválido.');seen.add(c.id);
  if(typeof c.activo!=='boolean'||!['descuento','anuncio'].includes(c.tipo))throw new Failure(400,'Revisa el tipo y estado de la promoción.');
  const titulo=texto(c.titulo,100,'el título'),textoPublico=texto(c.texto,500,'la descripción');if(!titulo)throw new Failure(400,'Cada promoción necesita un título.');
  if(!fecha(c.inicio)||!fecha(c.fin)||c.fin<c.inicio)throw new Failure(400,'Define fechas válidas de inicio y fin. La fecha final no puede ser anterior al inicio.');
  if(!Array.isArray(c.productos)||c.productos.length>1000||c.productos.some(id=>!Number.isSafeInteger(id)||id<1||!ids.has(id)))throw new Failure(400,'Selecciona modelos existentes.');
  const productos=[...new Set(c.productos)];if(c.tipo==='descuento'&&!productos.length)throw new Failure(400,'Selecciona al menos un modelo para cada descuento.');
  const porcentaje=c.tipo==='descuento'?c.porcentaje:0;if(!Number.isSafeInteger(porcentaje)||porcentaje<0||porcentaje>90||c.tipo==='descuento'&&porcentaje<1)throw new Failure(400,'El descuento debe ser un porcentaje entero del 1 al 90.');
  return {id:c.id,activo:c.activo,tipo:c.tipo,titulo,texto:textoPublico,inicio:c.inicio,fin:c.fin,porcentaje,productos};
 });
 const redes=REDES.map(def=>{const r=input.redes.find(r=>r?.nombre===def.nombre);if(!r)throw new Failure(400,'Falta la red '+def.nombre+'.');return {...def,cuenta:texto(r.cuenta,100,'la cuenta de '+def.nombre),url:redURL(r.url,def.nombre)};});
 return {campanas,redes};
}
export async function leerMarketing(client,lock=false){
 const row=(await client.query('SELECT document,revision,updated_at FROM public.maderoh_settings WHERE key=$1'+(lock?' FOR UPDATE':''),[MARKETING_KEY])).rows[0];
 return {document:row?.document||marketingDefault(),revision:row?Number(row.revision):0,updatedAt:row?.updated_at||null};
}
export function publicMarketing(document,now=Date.now()){
 const d=document||marketingDefault();return {redes:(d.redes||REDES).map(r=>({...r})),campanas:(d.campanas||[]).filter(c=>c.activo&&precios.vigente(c,now)).map(c=>({...c,url:c.productos.length===1?'/producto.html?id='+c.productos[0]:c.tipo==='descuento'?'/productos.html?promociones=1':'/productos.html',boton:c.tipo==='descuento'?'Ver modelos en promoción':'Ver productos',etiqueta:c.tipo==='descuento'?'PROMOCIÓN · MODELOS SELECCIONADOS':'EVENTO'}))};
}
export function productoConOfertas(product,document,now=Date.now()){
 const ofertas=(document?.campanas||[]).filter(c=>c.tipo==='descuento'&&c.activo&&precios.vigente(c,now)&&c.productos.includes(product.id)).map(({id,titulo,porcentaje,inicio,fin})=>({id,titulo,porcentaje,inicio,fin}));
 const p={...precios.normalizar(product),ofertas};delete p.ofertaVista;
 if(!p.precioPendiente&&p.variantes?.length){
  const cantidades=[p.cantidadMinima||1,...(p.precioVolumen||[]).map(t=>t.desde)],f=p.acabadoPredeterminado||precios.acabados(p)[0].id;
  const regular={...p,ofertas:[]};let antes=Infinity,ahora=Infinity,mejor=null;
  for(const v of p.variantes)for(const q of cantidades){
   const a=precios.calcular(regular,v.id,f,q,now),b=precios.calcular(p,v.id,f,q,now);
   antes=Math.min(antes,a.unitarioTotalCentavos);
   if(b.unitarioTotalCentavos<ahora){ahora=b.unitarioTotalCentavos;mejor=b;}
  }
  if(Number.isFinite(ahora))p.precio=ahora/100;
  if(ahora<antes&&mejor.promocionAplicada)p.ofertaVista={...mejor.promocionAplicada,antesCentavos:antes,ahoraCentavos:ahora,ahorroCentavos:antes-ahora};
 }
 return p;
}
export function createMarketingHandlers({getPool}){
 const fail=e=>{if(e instanceof Failure)return response(e.status,{error:e.message});console.error('Maderóh promociones: operación no disponible.');return response(503,{error:'No se pudieron consultar o guardar las promociones. Intenta nuevamente.'});};
 const publico=async req=>{try{if(req.method!=='GET')return response(405,{error:'Método no permitido.'},{Allow:'GET'});const data=await leerMarketing(await getPool());return response(200,{marketing:publicMarketing(data.document),serverNow:new Date().toISOString()});}catch(e){return fail(e);}};
 const admin=async req=>{
  try{
   if(!['GET','POST'].includes(req.method))return response(405,{error:'Método no permitido.'},{Allow:'GET, POST'});
   const pool=await getPool(),user=await requireAdmin(pool,req,req.method==='POST');
   if(req.method==='GET'){
    const row=await leerMarketing(pool);const productos=(await pool.query('SELECT id,document FROM public.maderoh_products ORDER BY id')).rows.map(r=>({id:Number(r.id),nombre:r.document.nombre,activo:r.document.activo}));
    return response(200,{...row,productos});
   }
   await quota(pool,'marketing:write:'+user.username,100,3600);const b=await bodyFrom(req,131072);
   if(!Number.isSafeInteger(b.revision)||b.revision<0)throw new Failure(400,'Recarga las promociones antes de guardar.');
   const result=await transaction(pool,async c=>{
    await requireAdmin(c,req,true);await c.query('SELECT pg_advisory_xact_lock(4210947)');const current=await leerMarketing(c,true);
    if(current.revision!==b.revision)throw new Failure(409,'Otra persona cambió las promociones. Tus cambios siguen en pantalla: cópialos antes de recargar y revisar la versión nueva.');
    const ids=new Set((await c.query('SELECT id FROM public.maderoh_products')).rows.map(r=>Number(r.id)));
    const document=validarMarketing(b.document,ids);
    await c.query(`INSERT INTO public.maderoh_settings(key,document,revision) VALUES($1,$2,1)
     ON CONFLICT(key) DO UPDATE SET document=EXCLUDED.document,revision=maderoh_settings.revision+1,updated_at=now()`,[MARKETING_KEY,JSON.stringify(document)]);
    await c.query('INSERT INTO public.maderoh_audit(actor,action,entity,detail) VALUES($1,$2,$3,$4)',[user.username,'marketing_updated',MARKETING_KEY,JSON.stringify({promociones:document.campanas.length})]);
    return {document,revision:current.revision+1,updatedAt:new Date().toISOString()};
   });return response(200,result);
  }catch(e){return fail(e);}
 };
 return {publico,admin};
}
