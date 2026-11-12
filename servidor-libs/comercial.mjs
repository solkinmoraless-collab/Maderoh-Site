import {createHash} from 'node:crypto';
import {Failure,response,bodyFrom,transaction,quota,requireAdmin} from './acceso.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const STATES=['pendiente_anticipo','confirmado','en_produccion','listo','entregado','cancelado'],METHODS=['transferencia','efectivo','tarjeta','otro'];
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function id(v){if(!UUID.test(v||''))throw new Failure(400,'Identificador no válido. Recarga la lista.');return v;}
function text(v,max,required=false){if(v==null&&!required)return '';if(typeof v!=='string'||v.length>max||(required&&!v.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new Failure(400,'Revisa los campos del formulario.');return v.trim();}
function cents(v){if(!Number.isSafeInteger(v)||v<1||v>1000000000000)throw new Failure(400,'Importe no válido. Usa un importe positivo con hasta dos decimales.');return v;}
function revision(v,current){if(!Number.isSafeInteger(v)||v!==Number(current))throw new Failure(409,'Otra persona actualizó este registro. Recárgalo antes de guardar. Tus datos siguen en pantalla.');}
function date(v,required=false){if(!v&&!required)return null;if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v||v<'2000-01-01'||v>'2100-12-31')throw new Failure(400,'Fecha no válida.');return v;}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function fingerprint(v){return sha(v);}
function clientData(v){if(!v||typeof v!=='object'||v.activo!=null&&typeof v.activo!=='boolean')throw new Failure(400,'Completa el cliente.');const d={nombre:text(v.nombre,160,true),telefono:text(v.telefono,30,true),correo:text(v.correo,180),ubicacion:text(v.ubicacion,500),notas:text(v.notas,2000),activo:v.activo!==false};if(!/^[+\d ()-]{8,30}$/.test(d.telefono)||d.telefono.replace(/\D/g,'').length<10)throw new Failure(400,'Revisa el teléfono del cliente.');if(d.correo&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo))throw new Failure(400,'Revisa el correo del cliente.');return d;}
const clientDTO=r=>({id:r.id,client:r.document,revision:Number(r.revision),createdAt:r.created_at,updatedAt:r.updated_at});
async function readClient(c,clientId,lock=false){const r=(await c.query('SELECT * FROM public.maderoh_clients WHERE id=$1'+(lock?' FOR UPDATE':''),[clientId])).rows[0];if(!r)throw new Failure(404,'Cliente no encontrado.');return r;}
async function audit(c,user,action,entity,detail={}){await c.query('INSERT INTO public.maderoh_audit(actor,action,entity,detail) VALUES($1,$2,$3,$4)',[user,action,entity,JSON.stringify(detail)]);}
function filters(u){const q=text(u.searchParams.get('q')||'',120),page=Number(u.searchParams.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>10000)throw new Failure(400,'Página no válida.');return {q,like:'%'+q.replace(/[\\%_]/g,'\\$&')+'%',page};}
async function readOrder(c,orderId){
 const r=(await c.query(`SELECT o.*,o.delivery_date::text AS delivery_day,c.document AS current_client FROM public.maderoh_orders o JOIN public.maderoh_clients c ON c.id=o.client_id WHERE o.id=$1`,[orderId])).rows[0];if(!r)throw new Failure(404,'Pedido no encontrado.');
 const payments=(await c.query('SELECT id,amount_centavos,paid_on::text,method,reference,note,created_by,created_at,voided_at,voided_by,void_reason FROM public.maderoh_order_payments WHERE order_id=$1 ORDER BY created_at,id',[orderId])).rows.map(p=>({...p,amountCentavos:Number(p.amount_centavos)}));
 const paid=payments.filter(p=>!p.voided_at).reduce((n,p)=>n+p.amountCentavos,0),total=Number(r.total_centavos),target=Number(r.deposit_target_centavos);
 return {id:r.id,folio:r.folio,quoteId:r.quote_id,clientId:r.client_id,currentClient:r.current_client,snapshot:r.snapshot,totalCentavos:total,depositTargetCentavos:target,paidCentavos:paid,balanceCentavos:total-paid,depositMissingCentavos:Math.max(0,target-paid),state:r.state,deliveryDate:r.delivery_day,notes:r.notes,revision:Number(r.revision),createdAt:r.created_at,updatedAt:r.updated_at,payments};
}
async function lockOrder(c,orderId){const r=(await c.query('SELECT id,revision,state,total_centavos FROM public.maderoh_orders WHERE id=$1 FOR UPDATE',[orderId])).rows[0];if(!r)throw new Failure(404,'Pedido no encontrado.');return r;}
async function touch(c,orderId){await c.query('UPDATE public.maderoh_orders SET revision=revision+1,updated_at=now() WHERE id=$1',[orderId]);}
function fail(e){if(e instanceof Failure)return response(e.status,{error:e.message},e.status===429?{'Retry-After':'60'}:{});if(e.code==='23505')return response(409,{error:'Este registro ya existe. Actualiza la lista antes de repetir la operación.'});console.error('Maderoh comercial: operación no disponible.');return response(503,{error:'No fue posible completar la operación. Revisa la migración de clientes y pedidos y vuelve a consultar la lista antes de reintentar.'});}
export function createSalesHandlers({getPool}){
 const clients=async req=>{try{
  if(!['GET','POST'].includes(req.method))return response(405,{error:'Método no permitido.'},{Allow:'GET, POST'});const pool=await getPool(),user=await requireAdmin(pool,req,req.method==='POST'),u=new URL(req.url);
  if(req.method==='GET'){
   if(u.searchParams.has('id'))return response(200,clientDTO(await readClient(pool,id(u.searchParams.get('id')))));
   const {q,like,page}=filters(u),active=u.searchParams.get('active')==='true';
   const where=`WHERE ($1='' OR document->>'nombre' ILIKE $2 OR document->>'telefono' ILIKE $2 OR document->>'correo' ILIKE $2) AND ($3=false OR document->'activo'='true'::jsonb)`;
   const params=[q,like,active],total=Number((await pool.query('SELECT count(*) AS total FROM public.maderoh_clients '+where,params)).rows[0].total);
   const rows=(await pool.query('SELECT * FROM public.maderoh_clients '+where+' ORDER BY updated_at DESC,id LIMIT 25 OFFSET $4',[...params,(page-1)*25])).rows.map(clientDTO);
   return response(200,{rows,total,page,pages:Math.max(1,Math.ceil(total/25))});
  }
  await quota(pool,'sales:clients:'+user.username,120,60);const b=await bodyFrom(req,10000),clientId=id(b.id),d=clientData(b.client);if(!['create','update'].includes(b.action))throw new Failure(400,'Operación no válida.');
  const result=await transaction(pool,async c=>{
   await requireAdmin(c,req,true);
   if(b.action==='create'){
    const fp=fingerprint(d);await c.query('SELECT pg_advisory_xact_lock(4210945,hashtext($1))',[clientId]);const old=(await c.query('SELECT * FROM public.maderoh_clients WHERE id=$1',[clientId])).rows[0];if(old){if(old.creation_fingerprint!==fp)throw new Failure(409,'El intento de creación cambió. Revisa el cliente antes de crear otro.');return {created:false,row:clientDTO(old)};}
    const r=(await c.query('INSERT INTO public.maderoh_clients(id,document,creation_fingerprint) VALUES($1,$2,$3) RETURNING *',[clientId,JSON.stringify(d),fp])).rows[0];await audit(c,user.username,'client_created',clientId);return {created:true,row:clientDTO(r)};
   }
   const old=await readClient(c,clientId,true);revision(b.revision,old.revision);const r=(await c.query('UPDATE public.maderoh_clients SET document=$2,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *',[clientId,JSON.stringify(d)])).rows[0];await audit(c,user.username,'client_updated',clientId);return {created:false,row:clientDTO(r)};
  });return response(result.created?201:200,result.row);
 }catch(e){return fail(e);}};
 const orders=async req=>{try{
  if(!['GET','POST'].includes(req.method))return response(405,{error:'Método no permitido.'},{Allow:'GET, POST'});const pool=await getPool(),user=await requireAdmin(pool,req,req.method==='POST'),u=new URL(req.url);
  if(req.method==='GET'){
   const view=u.searchParams.get('view')||'list';
   if(view==='detail')return response(200,await transaction(pool,async c=>{await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');return readOrder(c,id(u.searchParams.get('id')));}));
   if(view==='quote'){
    const quoteId=id(u.searchParams.get('id')),r=(await pool.query('SELECT q.id,q.folio,q.snapshot,q.followup,q.revision,o.id AS order_id FROM public.maderoh_quotes q LEFT JOIN public.maderoh_orders o ON o.quote_id=q.id WHERE q.id=$1',[quoteId])).rows[0];if(!r)throw new Failure(404,'Cotización no encontrada.');return response(200,{...r,revision:Number(r.revision)});
   }
   if(view==='quotes'){
    const {q,like}=filters(u),rows=(await pool.query(`SELECT q.id,q.folio,q.snapshot->>'producto' AS producto,q.snapshot->'selection'->>'nombre' AS cliente FROM public.maderoh_quotes q LEFT JOIN public.maderoh_orders o ON o.quote_id=q.id WHERE q.followup->>'estado'='aceptada' AND o.id IS NULL AND ($1='' OR q.folio ILIKE $2 OR q.snapshot->>'producto' ILIKE $2) ORDER BY q.created_at DESC LIMIT 50`,[q,like])).rows;return response(200,{rows,limit:50});
   }
   if(view!=='list')throw new Failure(400,'Vista no válida.');
   const {q,like,page}=filters(u),state=u.searchParams.get('state')||'';if(state&&!STATES.includes(state))throw new Failure(400,'Estado no válido.');
   const where=`WHERE ($1='' OR o.folio ILIKE $2 OR o.snapshot->'quote'->>'folio' ILIKE $2 OR c.document->>'nombre' ILIKE $2 OR o.snapshot->'quote'->>'producto' ILIKE $2) AND ($3='' OR o.state=$3)`,params=[q,like,state];
   const total=Number((await pool.query('SELECT count(*) AS total FROM public.maderoh_orders o JOIN public.maderoh_clients c ON c.id=o.client_id '+where,params)).rows[0].total);
   const rows=(await pool.query(`SELECT o.id,o.folio,o.state,o.delivery_date::text,o.total_centavos::text,o.snapshot->'quote'->>'producto' AS producto,c.document->>'nombre' AS cliente,COALESCE(p.paid,0)::text AS paid FROM public.maderoh_orders o JOIN public.maderoh_clients c ON c.id=o.client_id LEFT JOIN (SELECT order_id,sum(amount_centavos) AS paid FROM public.maderoh_order_payments WHERE voided_at IS NULL GROUP BY order_id) p ON p.order_id=o.id ${where} ORDER BY o.created_at DESC,o.id LIMIT 25 OFFSET $4`,[...params,(page-1)*25])).rows.map(r=>({...r,totalCentavos:Number(r.total_centavos),paidCentavos:Number(r.paid),balanceCentavos:Number(r.total_centavos)-Number(r.paid)}));
   const summary=(await pool.query(`SELECT count(*)::int AS pedidos,count(*) FILTER(WHERE o.state='cancelado')::int AS cancelados,COALESCE(sum(o.total_centavos) FILTER(WHERE o.state<>'cancelado'),0)::text AS total,COALESCE(sum(COALESCE(p.paid,0)) FILTER(WHERE o.state<>'cancelado'),0)::text AS paid FROM public.maderoh_orders o LEFT JOIN (SELECT order_id,sum(amount_centavos) AS paid FROM public.maderoh_order_payments WHERE voided_at IS NULL GROUP BY order_id) p ON p.order_id=o.id`)).rows[0];
   return response(200,{rows,total,page,pages:Math.max(1,Math.ceil(total/25)),summary:{pedidos:summary.pedidos,cancelados:summary.cancelados,totalCentavos:Number(summary.total),paidCentavos:Number(summary.paid),balanceCentavos:Number(summary.total)-Number(summary.paid)}});
  }
  await quota(pool,'sales:orders:'+user.username,120,60);const b=await bodyFrom(req,65536);if(!['create','update','payment','void-payment'].includes(b.action))throw new Failure(400,'Operación no válida.');
  const result=await transaction(pool,async c=>{
   await requireAdmin(c,req,true);
   if(b.action==='create'){
    const orderId=id(b.id),quoteId=id(b.quoteId),clientId=id(b.clientId),total=cents(b.totalCentavos),deliveryDate=date(b.deliveryDate),scope=text(b.scope,5000,true),notes=text(b.notes,5000);if(b.confirmed!==true)throw new Failure(400,'Confirma con el cliente importe y alcance antes de crear el pedido.');
    const fp=fingerprint({quoteId,clientId,total,deliveryDate,scope,notes});
    const quote=(await c.query('SELECT * FROM public.maderoh_quotes WHERE id=$1 FOR UPDATE',[quoteId])).rows[0];if(!quote)throw new Failure(404,'Cotización no encontrada.');
    const sameId=(await c.query('SELECT id,creation_fingerprint FROM public.maderoh_orders WHERE id=$1',[orderId])).rows[0];if(sameId){if(sameId.creation_fingerprint!==fp)throw new Failure(409,'Este intento ya creó un pedido con otros datos. Consulta la lista.');return {created:false,data:await readOrder(c,orderId)};}
    const existing=(await c.query('SELECT id FROM public.maderoh_orders WHERE quote_id=$1',[quoteId])).rows[0];if(existing)throw new Failure(409,'La cotización ya tiene un pedido. Consúltalo en la lista.');
    if(quote.followup.estado!=='aceptada')throw new Failure(400,'Marca la cotización como Aceptada antes de convertirla en pedido.');revision(b.quoteRevision,quote.revision);
    const client=(await c.query('SELECT * FROM public.maderoh_clients WHERE id=$1 FOR SHARE',[clientId])).rows[0];if(!client||client.document.activo!==true)throw new Failure(400,'Selecciona un cliente activo.');revision(b.clientRevision,client.revision);
    const folio='PED-'+today().replaceAll('-','')+'-'+orderId.toUpperCase(),target=Math.round(total/2),snapshot={id:orderId,folio,quote:quote.snapshot,client:client.document,scope,totalCentavos:total,depositTargetCentavos:target,createdAt:new Date().toISOString()};
    await c.query('INSERT INTO public.maderoh_orders(id,quote_id,client_id,folio,snapshot,creation_fingerprint,total_centavos,deposit_target_centavos,delivery_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[orderId,quoteId,clientId,folio,JSON.stringify(snapshot),fp,total,target,deliveryDate,notes,user.username]);await audit(c,user.username,'order_created',orderId,{quoteId,clientId});return {created:true,data:await readOrder(c,orderId)};
   }
   const orderId=id(b.orderId),order=await lockOrder(c,orderId);
   if(b.action==='payment'){
    const paymentId=id(b.id),amount=cents(b.amountCentavos),paidOn=date(b.paidOn,true),method=METHODS.includes(b.method)?b.method:null,reference=text(b.reference,180),note=text(b.note,1000);if(!method||paidOn>today())throw new Failure(400,'Revisa el método y la fecha del pago recibido.');if(b.received!==true)throw new Failure(400,'Registra únicamente importes que ya recibiste.');
    const fp=fingerprint({orderId,amount,paidOn,method,reference,note}),old=(await c.query('SELECT * FROM public.maderoh_order_payments WHERE id=$1',[paymentId])).rows[0];if(old){if(old.order_id!==orderId||old.creation_fingerprint!==fp)throw new Failure(409,'Este intento ya registró un pago con otros datos. Revisa el historial.');return {data:await readOrder(c,orderId)};}
    revision(b.revision,order.revision);if(order.state==='cancelado')throw new Failure(400,'El pedido está cancelado. No se pueden registrar nuevos pagos.');
    const current=await readOrder(c,orderId);if(amount>current.balanceCentavos)throw new Failure(400,'El importe supera el saldo pendiente. Revisa pagos anteriores antes de continuar.');
    await c.query('INSERT INTO public.maderoh_order_payments(id,order_id,amount_centavos,paid_on,method,reference,note,creation_fingerprint,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[paymentId,orderId,amount,paidOn,method,reference,note,fp,user.username]);await touch(c,orderId);await audit(c,user.username,'payment_recorded',paymentId,{orderId,amountCentavos:amount});return {created:true,data:await readOrder(c,orderId)};
   }
   if(b.action==='void-payment'){
    const paymentId=id(b.paymentId),reason=text(b.reason,1000,true);if(b.correction!==true)throw new Failure(400,'La anulación es para corregir una captura, no para registrar una devolución de dinero.');const p=(await c.query('SELECT * FROM public.maderoh_order_payments WHERE id=$1 AND order_id=$2 FOR UPDATE',[paymentId,orderId])).rows[0];if(!p)throw new Failure(404,'Registro de pago no encontrado.');
    if(p.voided_at){if(p.void_reason!==reason)throw new Failure(409,'El registro ya fue anulado. Revisa el historial.');return {data:await readOrder(c,orderId)};}
    revision(b.revision,order.revision);await c.query('UPDATE public.maderoh_order_payments SET voided_at=now(),voided_by=$2,void_reason=$3 WHERE id=$1',[paymentId,user.username,reason]);await touch(c,orderId);await audit(c,user.username,'payment_voided',paymentId,{orderId});return {data:await readOrder(c,orderId)};
   }
   revision(b.revision,order.revision);if(!STATES.includes(b.state))throw new Failure(400,'Estado no válido.');if(order.state==='cancelado'&&b.state!=='cancelado')throw new Failure(400,'Un pedido cancelado se conserva. Para un acuerdo nuevo crea otra cotización.');const notes=text(b.notes,5000),deliveryDate=date(b.deliveryDate);if(b.state==='cancelado'&&!notes)throw new Failure(400,'Escribe el motivo de cancelación en las notas.');
   await c.query('UPDATE public.maderoh_orders SET state=$2,delivery_date=$3,notes=$4,revision=revision+1,updated_at=now() WHERE id=$1',[orderId,b.state,deliveryDate,notes]);await audit(c,user.username,'order_updated',orderId,{state:b.state});return {data:await readOrder(c,orderId)};
  });return response(result.created?201:200,result.data);
 }catch(e){return fail(e);}};
 return {clients,orders};
}
