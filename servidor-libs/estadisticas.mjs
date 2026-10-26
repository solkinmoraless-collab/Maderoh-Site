import {createHash} from 'node:crypto';
import {Failure,response,bodyFrom,transaction,quota,requireAdmin} from './acceso.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const HEX=/^[a-f0-9]{32}$/;
const PAGES=['index.html','productos.html','producto.html','personaliza.html','preguntas-frecuentes.html','envios.html','facturacion.html','aviso-privacidad.html','terminos-condiciones.html'];
const TYPES=['page_view','product_view','product_click','quote_click','whatsapp_click'];
const SOURCES=['direct','facebook','instagram','tiktok','youtube','google','whatsapp','other'];
const DAY=86400000;
const mexicoDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function range(u){
 const today=mexicoDay(),end=u.searchParams.get('hasta')||today;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||!Number.isFinite(Date.parse(end+'T00:00:00Z'))||new Date(end+'T00:00:00Z').toISOString().slice(0,10)!==end)throw new Failure(400,'Selecciona fechas válidas.');
 const start=u.searchParams.get('desde')||new Date(Date.parse(end+'T00:00:00Z')-29*DAY).toISOString().slice(0,10);
 for(const s of [start,end]){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw new Failure(400,'Selecciona fechas válidas.');}
 const days=(Date.parse(end)-Date.parse(start))/DAY+1;
 if(days<1||days>93||end>today||start<'2020-01-01')throw new Failure(400,'Selecciona un periodo de 1 a 93 días, hasta el día de hoy.');
 return {desde:start,hasta:end,dias:days,zona:'America/Mexico_City'};
}
function validate(b){
 if(b.consent!==true||!HEX.test(b.visitor||'')||!HEX.test(b.session||'')||!SOURCES.includes(b.source)||!['mobile','tablet','desktop'].includes(b.device)||!Array.isArray(b.events)||!b.events.length||b.events.length>10)throw new Failure(400,'Evento no válido.');
 return b.events.map(e=>{
  if(!e||!HEX.test(e.id||'')||!PAGES.includes(e.page)||!TYPES.includes(e.type)||e.productId!=null&&(!Number.isSafeInteger(e.productId)||e.productId<1)||['product_view','product_click'].includes(e.type)&&!e.productId||e.type==='product_view'&&e.page!=='producto.html')throw new Failure(400,'Evento no válido.');
  return {id:sha('maderoh-event-v1:'+e.id),type:e.type,page:e.page,productId:e.productId??null};
 });
}
const windowSQL="occurred_at>=($1::date::timestamp AT TIME ZONE 'America/Mexico_City') AND occurred_at<(($2::date+1)::timestamp AT TIME ZONE 'America/Mexico_City')";
const quoteWindow="created_at>=($1::date::timestamp AT TIME ZONE 'America/Mexico_City') AND created_at<(($2::date+1)::timestamp AT TIME ZONE 'America/Mexico_City')";
async function report(pool,period){
 const params=[period.desde,period.hasta];
 // One consistent, read-only database snapshot for summary, charts, ranking and CSV.
 return transaction(pool,async c=>{
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
  const summary=(await c.query(`SELECT count(*) FILTER(WHERE type='page_view')::int AS paginas,count(DISTINCT visitor_hash) FILTER(WHERE type='page_view')::int AS navegadores,count(DISTINCT session_hash) FILTER(WHERE type='page_view')::int AS sesiones,count(*) FILTER(WHERE type='product_view')::int AS vistas_producto,count(*) FILTER(WHERE type='product_click')::int AS clics_producto,count(*) FILTER(WHERE type='quote_click')::int AS intentos_cotizar,count(*) FILTER(WHERE type='whatsapp_click')::int AS clics_whatsapp FROM public.maderoh_events WHERE ${windowSQL}`,params)).rows[0];
  const quotes=(await c.query(`SELECT count(*)::int AS folios,count(*) FILTER(WHERE followup->'canales' ? 'pdf')::int AS pdf,count(*) FILTER(WHERE followup->'canales' ? 'whatsapp')::int AS whatsapp,count(*) FILTER(WHERE followup->>'estado'='aceptada')::int AS aceptadas FROM public.maderoh_quotes WHERE ${quoteWindow}`,params)).rows[0];
  const daily=(await c.query(`WITH days AS (SELECT generate_series($1::date,$2::date,interval '1 day')::date AS dia),e AS (SELECT (occurred_at AT TIME ZONE 'America/Mexico_City')::date AS dia,count(*) FILTER(WHERE type='page_view')::int AS paginas,count(DISTINCT session_hash) FILTER(WHERE type='page_view')::int AS sesiones FROM public.maderoh_events WHERE ${windowSQL} GROUP BY 1),q AS (SELECT (created_at AT TIME ZONE 'America/Mexico_City')::date AS dia,count(*)::int AS folios FROM public.maderoh_quotes WHERE ${quoteWindow} GROUP BY 1) SELECT days.dia::text,COALESCE(e.paginas,0)::int AS paginas,COALESCE(e.sesiones,0)::int AS sesiones,COALESCE(q.folios,0)::int AS folios FROM days LEFT JOIN e USING(dia) LEFT JOIN q USING(dia) ORDER BY days.dia`,params)).rows;
  const ranking=(await c.query(`WITH e AS (SELECT product_id AS id,count(*) FILTER(WHERE type='product_view')::int AS vistas,count(DISTINCT visitor_hash) FILTER(WHERE type='product_view')::int AS navegadores,count(*) FILTER(WHERE type='product_click')::int AS clics FROM public.maderoh_events WHERE ${windowSQL} AND product_id IS NOT NULL AND type IN ('product_view','product_click') GROUP BY product_id),q AS (SELECT CASE WHEN snapshot->'product'->>'id' ~ '^[0-9]{1,15}$' THEN (snapshot->'product'->>'id')::bigint END AS id,count(*)::int AS folios,count(*) FILTER(WHERE followup->'canales' ? 'pdf')::int AS pdf,count(*) FILTER(WHERE followup->'canales' ? 'whatsapp')::int AS whatsapp,max(snapshot->>'producto') AS nombre FROM public.maderoh_quotes WHERE ${quoteWindow} GROUP BY 1),ids AS (SELECT id FROM e UNION SELECT id FROM q WHERE id IS NOT NULL) SELECT ids.id::text,COALESCE(p.document->>'nombre',q.nombre,'Modelo retirado #'||ids.id::text) AS modelo,COALESCE((p.document->>'activo')::boolean,false) AS activo,COALESCE(e.vistas,0)::int AS vistas,COALESCE(e.navegadores,0)::int AS navegadores,COALESCE(e.clics,0)::int AS clics,COALESCE(q.folios,0)::int AS folios,COALESCE(q.pdf,0)::int AS pdf,COALESCE(q.whatsapp,0)::int AS whatsapp FROM ids LEFT JOIN e USING(id) LEFT JOIN q USING(id) LEFT JOIN public.maderoh_products p ON p.id=ids.id ORDER BY vistas DESC,clics DESC,folios DESC,ids.id LIMIT 500`,params)).rows;
  const sources=(await c.query(`SELECT source,count(*)::int AS paginas,count(DISTINCT session_hash)::int AS sesiones FROM public.maderoh_events WHERE ${windowSQL} AND type='page_view' GROUP BY source ORDER BY sesiones DESC,source`,params)).rows;
  const devices=(await c.query(`SELECT device,count(*)::int AS paginas,count(DISTINCT session_hash)::int AS sesiones FROM public.maderoh_events WHERE ${windowSQL} AND type='page_view' GROUP BY device ORDER BY sesiones DESC,device`,params)).rows;
  const pages=(await c.query(`SELECT page,count(*)::int AS vistas FROM public.maderoh_events WHERE ${windowSQL} AND type='page_view' GROUP BY page ORDER BY vistas DESC,page`,params)).rows;
  return {period,summary,quotes,daily,ranking,sources,devices,pages,rankingLimit:500,generatedAt:new Date().toISOString()};
 });
}
function csvCell(v){let s=String(v??'').replace(/[\u0000-\u001f]/g,' ');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function rankingCSV(data){const rows=[['Desde (CDMX)','Hasta (CDMX)','ID','Modelo','Publicado','Vistas de ficha','Navegadores medidos','Clics al producto','Folios creados','PDF preparado','WhatsApp preparado'],...data.ranking.map(r=>[data.period.desde,data.period.hasta,r.id,r.modelo,r.activo?'Sí':'No',r.vistas,r.navegadores,r.clics,r.folios,r.pdf,r.whatsapp])];return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
function fail(e){if(e instanceof Failure)return response(e.status,{error:e.message},e.status===429?{'Retry-After':'60'}:{});console.error('Maderoh estadísticas: operación no disponible.');return response(503,{error:'No fue posible consultar las estadísticas. Intenta nuevamente.'});}
export function createAnalyticsHandlers({getPool}){
 const collect=async(req,context={})=>{
  try{
   if(req.method!=='POST')return response(405,{error:'Método no permitido.'},{Allow:'POST'});
   if(req.headers.get('origin')!==new URL(req.url).origin||!['same-origin','none',null].includes(req.headers.get('sec-fetch-site')))throw new Failure(403,'Solicitud no autorizada.');
   const b=await bodyFrom(req,8192),events=validate(b);
   if(req.headers.get('sec-gpc')==='1'||req.headers.get('dnt')==='1'||/bot\b|spider|crawler|headless|slurp/i.test(req.headers.get('user-agent')||''))return response(202,{ok:true,ignored:true});
   const pool=await getPool();
   if((req.headers.get('cookie')||'').includes('__Host-maderoh_admin_v1=')){try{await requireAdmin(pool,req);return response(202,{ok:true,ignored:true});}catch(e){if(!(e instanceof Failure)||e.status!==401)throw e;}}
   await pool.query(`DELETE FROM public.maderoh_rate_limits WHERE key IN (SELECT key FROM public.maderoh_rate_limits WHERE expires_at<=now() LIMIT 100)`);
   await quota(pool,'stats:global',600,60);await quota(pool,'stats:ip:'+String(context.ip||'desconocida').slice(0,128),120,60);await quota(pool,'stats:visitor:'+b.visitor,120,60);
   const visitor=sha('maderoh-visitor-v1:'+b.visitor),session=sha('maderoh-session-v1:'+b.visitor+':'+b.session);
   const saved=await transaction(pool,async c=>{
    const ids=[...new Set(events.map(e=>e.productId).filter(Boolean))];if(ids.length){const rows=(await c.query("SELECT id::text FROM public.maderoh_products WHERE id=ANY($1::bigint[]) AND document->'activo'='true'::jsonb",[ids])).rows;const allowed=new Set(rows.map(r=>r.id));if(ids.some(id=>!allowed.has(String(id))))throw new Failure(400,'Modelo no disponible.');}
    let n=0;for(const e of events){const r=await c.query(`INSERT INTO public.maderoh_events(id,type,page,product_id,visitor_hash,session_hash,source,device) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING RETURNING id`,[e.id,e.type,e.page,e.productId,visitor,session,b.source,b.device]);n+=r.rows.length;}return n;
   });return response(200,{ok:true,saved});
  }catch(e){return fail(e);}
 };
 const admin=async req=>{
  try{
   if(req.method!=='GET')return response(405,{error:'Método no permitido.'},{Allow:'GET'});
   const pool=await getPool();const user=await requireAdmin(pool,req);await quota(pool,'stats:report:'+user.username,60,60);const u=new URL(req.url),format=u.searchParams.get('format')||'json';if(!['json','csv'].includes(format))throw new Failure(400,'Formato no válido.');
   const data=await report(pool,range(u));if(format==='json')return response(200,data);
   return new Response(rankingCSV(data),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="maderoh-ranking-${data.period.desde}-${data.period.hasta}.csv"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }catch(e){return fail(e);}
 };
 return {collect,admin};
}
