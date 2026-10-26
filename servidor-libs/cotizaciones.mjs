import {createHash} from 'node:crypto';
import prices from './precios.cjs';
import {Failure,response,bodyFrom,transaction,quota,requireAdmin} from './acceso.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const states=['nueva','contactada','en_revision','cotizada','aceptada','descartada'];
function text(v,max,required=false){if(v==null&&!required)return '';if(typeof v!=='string'||v.length>max||(required&&!v.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new Failure(400,'Revisa los campos de la solicitud.');return v.trim();}
function choice(v,values){if(!values.includes(v))throw new Failure(400,'Configuración no válida.');return v;}
function number(v,min,max,optional=false){if(optional&&(v==null||v===''))return null;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Failure(400,'Revisa las medidas o cantidades.');return v;}
function validate(b){
 if(!UUID.test(b.requestId||''))throw new Failure(400,'Identificador de solicitud no válido. Recarga la página.');
 const channel=choice(b.channel,['pdf','whatsapp']),kind=choice(b.kind,['producto','personalizado']),s={kind};
 if(kind==='producto'){
  if(!Number.isSafeInteger(b.productId)||b.productId<1||!Number.isSafeInteger(b.cantidad))throw new Failure(400,'Modelo o cantidad no válidos.');
  Object.assign(s,{referenciaCentavos:b.referenciaCentavos==null?null:number(b.referenciaCentavos,0,Number.MAX_SAFE_INTEGER),productId:b.productId,variante:text(b.variante,100,true),acabado:text(b.acabado,100,true),cantidad:number(b.cantidad,1,1000),entrega:choice(b.entrega,['cdmx','otro']),metal:choice(b.metal,['aceite','electrostatica','custom']),apoyos:choice(b.apoyos,['niveladores','ruedas','sin_apoyos']),modificaciones:b.modificaciones===true,color:text(b.color,80),anchoCm:number(b.anchoCm,1,2000,true),largoCm:number(b.largoCm,1,2000,true),comentarios:text(b.comentarios,700),destino:text(b.destino,180)});
 }else{
  if(b.privacyAccepted!==true)throw new Failure(400,'Acepta el aviso de privacidad para registrar tu solicitud.');
  for(const key of ['producto','nombre','telefono'])s[key]=text(b[key],key==='telefono'?30:120,true);
  if(!/^[+\d ()-]{8,30}$/.test(s.telefono)||s.telefono.replace(/\D/g,'').length<10)throw new Failure(400,'Revisa el teléfono de contacto.');
  s.correo=text(b.correo,180);if(s.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.correo))throw new Failure(400,'Revisa tu correo.');
  s.cantidad=number(b.cantidad,1,500);if(!Number.isInteger(s.cantidad))throw new Failure(400,'Cantidad no válida.');
  for(const key of ['ancho','profundidad','altura'])s[key]=number(b[key],1,2000,true);
  s.tamanoEspacio=number(b.tamanoEspacio,1,10000,true);
  for(const key of ['tipoProyecto','acabado','estructura','tipoNegocio','ubicacion'])s[key]=text(b[key],180);
  s.comentarios=text(b.comentarios,700);s.privacyAccepted=true;s.privacyVersion='cotizaciones-v1';s.marketingConsent=b.marketingConsent===true;
 }
 return {id:b.requestId,channel,selection:s};
}
function estimate(p,s){
 const v=p.variantes.find(v=>v.id===s.variante),a=prices.acabados(p).find(a=>a.id===s.acabado);
 if((!v&&s.variante!=='custom')||(!a&&s.acabado!=='custom')||s.cantidad<(p.cantidadMinima||1))throw new Failure(400,'La configuración cambió. Recarga el modelo para revisar sus opciones.');
 const revision=p.precioPendiente===true||!v||s.modificaciones||!a||s.metal!=='aceite'||s.anchoCm!==null||s.largoCm!==null||!!s.comentarios;
 const envioPendiente=p.envioSiempreCotizar===true||s.entrega!=='cdmx'||!!(p.esPedidoPequeno&&s.cantidad<10);
 let totals=null;try{if(!revision)totals=prices.calcular(p,s.variante,s.acabado,s.cantidad);}catch{throw new Failure(400,'El precio necesita revisión del taller.');}
 return {revision,envioPendiente,envioCentavos:envioPendiente?null:0,totals,variante:v?.nombre||'Medida personalizada',acabado:a?.nombre||'Acabado por definir'};
}
function receipt(row){const s=row.snapshot;return {id:s.id,folio:s.folio,createdAt:s.createdAt,producto:s.producto,estimate:s.estimate,canales:row.followup.canales||[],registrado:true};}
function rowJSON(row){return {id:row.id,folio:row.folio,snapshot:row.snapshot,followup:row.followup,revision:Number(row.revision),createdAt:row.created_at};}
function sameOrigin(req){if(req.headers.get('origin')!==new URL(req.url).origin||!['same-origin','none',null].includes(req.headers.get('sec-fetch-site')))throw new Failure(403,'Solicitud no autorizada.');}
function fail(e){if(e instanceof Failure)return response(e.status,{error:e.message},e.status===429?{'Retry-After':'900'}:{});console.error('Maderoh cotizaciones: operación no disponible.');return response(503,{error:'No se pudo guardar la solicitud. Intenta de nuevo; el mismo intento conservará su folio.'});}
export function createQuoteHandlers({getPool}){
 const create=async(req,context={})=>{
  try{
   if(req.method!=='POST')return response(405,{error:'Método no permitido.'},{Allow:'POST'});
   sameOrigin(req);const input=validate(await bodyFrom(req,12288)),fingerprint=sha(JSON.stringify(input.selection)),pool=await getPool();
   await pool.query(`DELETE FROM public.maderoh_rate_limits WHERE key IN (SELECT key FROM public.maderoh_rate_limits WHERE expires_at<=now() LIMIT 100)`);
   await quota(pool,'quote:global',300,60);await quota(pool,'quote:ip:'+String(context.ip||'desconocida').slice(0,128),20,900);
   const result=await transaction(pool,async c=>{
    await c.query('SELECT pg_advisory_xact_lock(4210943,hashtext($1))',[input.id]);
    const existing=(await c.query('SELECT * FROM public.maderoh_quotes WHERE id=$1 FOR UPDATE',[input.id])).rows[0];
    if(existing){
     if(existing.fingerprint!==fingerprint)throw new Failure(409,'Esta configuración cambió. Actualiza la solicitud antes de continuar.');
     if(!(existing.followup.canales||[]).includes(input.channel)){
      existing.followup={...existing.followup,canales:[...(existing.followup.canales||[]),input.channel]};
      await c.query('UPDATE public.maderoh_quotes SET followup=$2,revision=revision+1 WHERE id=$1',[input.id,JSON.stringify(existing.followup)]);
     }
     return {created:false,data:receipt(existing)};
    }
    const s=input.selection;let product=null,calc=null;
    if(s.kind==='producto'){
     const r=(await c.query('SELECT document,revision FROM public.maderoh_products WHERE id=$1 FOR SHARE',[s.productId])).rows[0];
     if(!r||r.document.activo!==true)throw new Failure(404,'El modelo ya no está disponible.');
     const p=r.document;calc=estimate(p,s);product={id:p.id,nombre:p.nombre,revision:Number(r.revision),medidas:p.medidas,madera:p.madera,estructura:p.estructura,fabricacion:p.fabricacion,entrega:p.entrega,incluye:p.incluye,garantia:p.garantia,condiciones:p.condiciones};
    }
    const createdAt=new Date().toISOString(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(createdAt)).replaceAll('-',''),folio='MDH-'+day+'-'+input.id.toUpperCase();
    const snapshot={id:input.id,folio,createdAt,origen:input.channel,producto:product?.nombre||s.producto,product,selection:s,estimate:calc,aviso:'Presupuesto orientativo. Precio, accesos, envío y agenda sujetos a confirmación del taller. No acredita pago ni confirma pedido.'};
    const followup={estado:'nueva',notas:'',canales:[input.channel]};
    await c.query('INSERT INTO public.maderoh_quotes(id,folio,fingerprint,snapshot,followup) VALUES($1,$2,$3,$4,$5)',[input.id,folio,fingerprint,JSON.stringify(snapshot),JSON.stringify(followup)]);
    return {created:true,data:receipt({snapshot,followup})};
   });return response(result.created?201:200,result.data);
  }catch(e){return fail(e);}
 };
 const admin=async req=>{
  try{
   if(!['GET','POST'].includes(req.method))return response(405,{error:'Método no permitido.'},{Allow:'GET, POST'});
   const pool=await getPool(),user=await requireAdmin(pool,req,req.method==='POST');
   if(req.method==='GET'){
    const u=new URL(req.url),id=u.searchParams.get('id');
    if(id){if(!UUID.test(id))throw new Failure(400,'Folio no válido.');const row=(await pool.query('SELECT * FROM public.maderoh_quotes WHERE id=$1',[id])).rows[0];if(!row)throw new Failure(404,'Solicitud no encontrada.');return response(200,rowJSON(row));}
    const state=u.searchParams.get('estado')||'',channel=u.searchParams.get('canal')||'',q=text(u.searchParams.get('q')||'',120),page=Number(u.searchParams.get('page')||1);
    if(state&&!states.includes(state)||channel&&!['pdf','whatsapp'].includes(channel)||!Number.isSafeInteger(page)||page<1||page>10000)throw new Failure(400,'Filtro no válido.');
    const params=[state,channel,'%'+q.replace(/[\\%_]/g,'\\$&')+'%'];
    const where=`WHERE ($1='' OR COALESCE(followup->>'estado','nueva')=$1) AND ($2='' OR followup->'canales' ? $2) AND (folio ILIKE $3 OR snapshot->>'producto' ILIKE $3 OR snapshot->'selection'->>'nombre' ILIKE $3)`;
    const total=Number((await pool.query('SELECT count(*) AS total FROM public.maderoh_quotes '+where,params)).rows[0].total);
    const rows=(await pool.query(`SELECT id,folio,created_at,snapshot->>'producto' AS producto,snapshot->'estimate' AS estimate,snapshot->'selection'->>'nombre' AS nombre,followup,revision FROM public.maderoh_quotes ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $4`,[...params,(page-1)*25])).rows;
    const counts=(await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE followup->'canales' ? 'pdf')::int AS pdf,count(*) FILTER(WHERE followup->'canales' ? 'whatsapp')::int AS whatsapp,count(*) FILTER(WHERE COALESCE(followup->>'estado','nueva')='nueva')::int AS nuevas FROM public.maderoh_quotes`)).rows[0];
    return response(200,{rows,total,page,pages:Math.max(1,Math.ceil(total/25)),counts,states});
   }
   await quota(pool,'quote:admin:'+user.username,200,3600);const b=await bodyFrom(req,10000);
   if(!UUID.test(b.id||'')||!Number.isSafeInteger(b.revision)||b.revision<0)throw new Failure(400,'Recarga la solicitud antes de guardar.');
   const estado=choice(b.estado,states),notas=text(b.notas,5000);
   const data=await transaction(pool,async c=>{
    await requireAdmin(c,req,true);const row=(await c.query('SELECT * FROM public.maderoh_quotes WHERE id=$1 FOR UPDATE',[b.id])).rows[0];
    if(!row)throw new Failure(404,'Solicitud no encontrada.');if(Number(row.revision)!==b.revision)throw new Failure(409,'Otra persona actualizó esta solicitud. Recárgala antes de guardar. Tus notas siguen en pantalla.');
    row.followup={...row.followup,estado,notas,updatedBy:user.username,updatedAt:new Date().toISOString()};
    await c.query('UPDATE public.maderoh_quotes SET followup=$2,revision=revision+1 WHERE id=$1',[b.id,JSON.stringify(row.followup)]);
    await c.query('INSERT INTO public.maderoh_audit(actor,action,entity,detail) VALUES($1,$2,$3,$4)',[user.username,'quote_followup',b.id,JSON.stringify({estado})]);row.revision=Number(row.revision)+1;return rowJSON(row);
   });return response(200,data);
  }catch(e){return fail(e);}
 };
 return {create,admin};
}
