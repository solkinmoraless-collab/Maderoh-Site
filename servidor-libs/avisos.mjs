import entorno from './entorno.json' with {type:'json'};
import {randomUUID} from 'node:crypto';
import {Failure,response,bodyFrom,requireAdmin,quota} from './acceso.mjs';
import prices from './precios.cjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export async function enqueueQuoteNotice(client,id){
 await client.query('INSERT INTO public.maderoh_quote_notifications(quote_id) VALUES($1) ON CONFLICT(quote_id) DO NOTHING',[id]);
}
export function whatsappConfig(env=process.env,deployContext=entorno.context){
 const keys=['MADEROH_WA_TOKEN','MADEROH_WA_PHONE_NUMBER_ID','MADEROH_WA_TO','MADEROH_WA_TEMPLATE','MADEROH_WA_LANGUAGE','MADEROH_WA_API_VERSION'];
 const missing=keys.filter(k=>!env[k]);
 const valid=!missing.length&&/^\d{5,30}$/.test(env.MADEROH_WA_PHONE_NUMBER_ID)&&/^\d{10,15}$/.test(env.MADEROH_WA_TO)&&/^[a-z0-9_]{1,512}$/.test(env.MADEROH_WA_TEMPLATE)&&/^[a-z]{2}(?:_[A-Z]{2})?$/.test(env.MADEROH_WA_LANGUAGE)&&/^v\d{1,3}\.0$/.test(env.MADEROH_WA_API_VERSION);
 return {configured:!!valid,enabled:!!valid&&deployContext==='production',missing,preview:deployContext!=='production'};
}
export function templatePayload(snapshot,env){
 const clean=s=>String(s).replace(/\s+/g,' ').trim().slice(0,180);
 const amount=snapshot.estimate?.totals?prices.moneda(snapshot.estimate.totals.totalCentavos)+' MXN sin IVA':'Pendiente de revisión';
 return {messaging_product:'whatsapp',to:env.MADEROH_WA_TO,type:'template',template:{name:env.MADEROH_WA_TEMPLATE,language:{code:env.MADEROH_WA_LANGUAGE},components:[{type:'body',parameters:[snapshot.folio,snapshot.producto,amount,'https://maderoh.store/gestion/cotizaciones.html?id='+snapshot.id].map(text=>({type:'text',text:clean(text)}))}]}};
}
// Una respuesta aceptada por Meta no confirma entrega. Los resultados ambiguos
// quedan para revisión, sin repetir automáticamente un mensaje posiblemente enviado.
export async function dispatchNotices(pool,{env=process.env,fetcher=fetch,limit=3,deployContext=entorno.context}={}){
 const config=whatsappConfig(env,deployContext);if(!config.enabled)return {processed:0,...config};
 await pool.query("UPDATE public.maderoh_quote_notifications SET state='uncertain',last_error='Envío interrumpido; revisa WhatsApp antes de reintentar.',updated_at=now() WHERE state='sending' AND claimed_at<now()-interval '2 minutes'");
 let processed=0;
 for(let i=0;i<Math.min(limit,3);i++){
  const claim=randomUUID();
  const row=(await pool.query(`WITH next_notice AS (
   SELECT quote_id FROM public.maderoh_quote_notifications WHERE state='pending' AND attempts<5 AND available_at<=now() ORDER BY created_at,quote_id FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE public.maderoh_quote_notifications n SET state='sending',attempts=n.attempts+1,claim_token=$1,claimed_at=now(),updated_at=now()
  FROM next_notice x WHERE n.quote_id=x.quote_id RETURNING n.quote_id,n.attempts`,[claim])).rows[0];
  if(!row)break;
  const quote=(await pool.query('SELECT snapshot FROM public.maderoh_quotes WHERE id=$1',[row.quote_id])).rows[0];
  let state='uncertain',messageId=null,error='Respuesta no confirmada; revisa WhatsApp antes de reintentar.';
  try{
   if(!quote)throw Error('missing_quote');
   const r=await fetcher('https://graph.facebook.com/'+env.MADEROH_WA_API_VERSION+'/'+env.MADEROH_WA_PHONE_NUMBER_ID+'/messages',{method:'POST',headers:{Authorization:'Bearer '+env.MADEROH_WA_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(templatePayload(quote.snapshot,env)),signal:AbortSignal.timeout(5000)});
   const data=await r.json().catch(()=>null);
   if(r.ok&&typeof data?.messages?.[0]?.id==='string'){state='accepted';messageId=data.messages[0].id.slice(0,300);error='';}
   else if(r.status===429){state=row.attempts<5?'pending':'failed';error='Meta rechazó temporalmente el envío (429).';}
   else if(r.status>=400&&r.status<500){state='failed';error='Meta rechazó el envío. Revisa token, destinatario y plantilla aprobada. HTTP '+r.status;}
   // No almacenar cuerpos de error del proveedor, tokens ni datos del cliente.
  }catch{/* El folio y el aviso permanecen guardados aunque falle WhatsApp. */}
  await pool.query(`UPDATE public.maderoh_quote_notifications SET state=$3,provider_message_id=$4,last_error=$5,available_at=now()+interval '15 minutes',updated_at=now() WHERE quote_id=$1 AND claim_token=$2 AND state='sending'`,[row.quote_id,claim,state,messageId,error]);
  processed++;
 }
 return {processed};
}
export function createNoticeHandler({getPool,env=process.env,deployContext=entorno.context}){
 return async req=>{
  try{
   if(!['GET','POST'].includes(req.method))return response(405,{error:'Método no permitido.'},{Allow:'GET, POST'});
   const pool=await getPool(),user=await requireAdmin(pool,req,req.method==='POST');
   if(req.method==='POST'){
    await quota(pool,'notices:'+user.username,120,3600);const b=await bodyFrom(req,2048);
    if(!UUID.test(b.id||''))throw new Failure(400,'Aviso no válido.');
    if(b.action==='read')await pool.query('UPDATE public.maderoh_quote_notifications SET read_at=COALESCE(read_at,now()),read_by=COALESCE(read_by,$2) WHERE quote_id=$1',[b.id,user.username]);
    else if(b.action==='retry'){
     if(b.confirmed!==true)throw new Failure(400,'Confirma que revisaste el envío anterior.');
     await pool.query("UPDATE public.maderoh_quote_notifications SET state='pending',attempts=0,available_at=now(),claim_token=NULL,last_error='',updated_at=now() WHERE quote_id=$1 AND state IN ('failed','uncertain')",[b.id]);
     await pool.query('INSERT INTO public.maderoh_audit(actor,action,entity,detail) VALUES($1,$2,$3,$4)',[user.username,'retry_quote_notice',b.id,'{}']);
    }else throw new Failure(400,'Acción no disponible.');
   }
   const url=new URL(req.url),page=Number(url.searchParams.get('page')||1);
   if(!Number.isSafeInteger(page)||page<1||page>10000)throw new Failure(400,'Página no válida.');
   const counts=(await pool.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE read_at IS NULL)::int AS unread FROM public.maderoh_quote_notifications')).rows[0];
   const rows=(await pool.query(`SELECT n.quote_id,n.created_at,n.read_at,n.read_by,n.state,n.attempts,n.last_error,n.provider_message_id,q.folio,q.snapshot->>'producto' AS producto,q.snapshot->'estimate' AS estimate,q.followup FROM public.maderoh_quote_notifications n JOIN public.maderoh_quotes q ON q.id=n.quote_id ORDER BY n.created_at DESC,n.quote_id DESC LIMIT 25 OFFSET $1`,[(page-1)*25])).rows;
   return response(200,{rows,counts,page,pages:Math.max(1,Math.ceil(counts.total/25)),whatsapp:whatsappConfig(env,deployContext)});
  }catch(e){if(e instanceof Failure)return response(e.status,{error:e.message});console.error('Maderóh avisos: operación no disponible.');return response(503,{error:'No se pudieron consultar los avisos. Revisa que la migración de avisos esté aplicada.'});}
 };
}
