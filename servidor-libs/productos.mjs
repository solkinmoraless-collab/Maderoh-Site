import {randomUUID} from 'node:crypto';
import {Failure,response,bodyFrom,transaction,quota,requireAdmin} from './acceso.mjs';
import {CATEGORIES,DEFAULTS,PLACEHOLDER,validId,validRevision,validateProduct,readProduct,checkRevision,persist} from './catalogo.mjs';

const LIMIT=4194304;
async function imageBody(req){
 if(!['image/jpeg','image/png','image/webp'].includes((req.headers.get('content-type')||'').split(';')[0]))throw new Failure(415,'Selecciona una imagen JPG, PNG o WebP.');
 if(Number(req.headers.get('content-length'))>LIMIT)throw new Failure(413,'La imagen supera 4 MB.');
 if(!req.body)throw new Failure(400,'No se recibio una imagen.');
 const reader=req.body.getReader();const chunks=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw new Failure(413,'La imagen supera 4 MB.');}chunks.push(value);}
 if(!size)throw new Failure(400,'La imagen esta vacia.');
 return Buffer.concat(chunks);
}
export function createProductsHandlers({getPool,getStore,processImage}){
 const fail=error=>{
  if(error instanceof Failure)return response(error.status,{error:error.message},error.status===429?{'Retry-After':'3600'}:{});
  console.error('Maderoh productos: operacion no disponible.');return response(503,{error:'No fue posible completar la operacion. Intenta de nuevo o revisa la configuracion del servidor.'});
 };
 const catalog=async req=>{
  try{
   if(req.method!=='GET')return response(405,{error:'Metodo no permitido.'},{Allow:'GET'});
   const pool=await getPool();
   const rows=(await pool.query(`SELECT p.document,s.document AS gallery FROM public.maderoh_products p
    LEFT JOIN public.maderoh_settings s ON s.key='gallery:'||p.id::text
    WHERE p.document->'activo'='true'::jsonb ORDER BY p.id`)).rows;
   return response(200,{productos:rows.map(r=>r.document),galerias:Object.fromEntries(rows.map(r=>[r.document.id,r.gallery||{productId:r.document.id,imagenPrincipal:r.document.imagen,imagenes:[]}]))});
  }catch(e){return fail(e);}
 };
 const admin=async(req,context={})=>{
  let uploadedKey=null,store;
  try{
   if(!['GET','POST'].includes(req.method))return response(405,{error:'Metodo no permitido.'},{Allow:'GET, POST'});
   const pool=await getPool();const user=await requireAdmin(pool,req,req.method==='POST');
   const url=new URL(req.url);
   if(req.method==='GET'){
    if(url.searchParams.has('id'))return response(200,await readProduct(pool,validId(url.searchParams.get('id'))));
    const rows=(await pool.query(`SELECT p.document,p.revision,p.updated_at FROM public.maderoh_products p ORDER BY p.id`)).rows;
    return response(200,{categories:CATEGORIES,defaults:DEFAULTS,products:rows.map(r=>({product:r.document,revision:Number(r.revision),updatedAt:r.updated_at}))});
   }
   await quota(pool,'product:write:'+user.username,200,3600);
   if(url.searchParams.get('action')==='upload'){
    const id=validId(url.searchParams.get('id'));if(!url.searchParams.has('revision'))throw new Failure(400,'Recarga el modelo antes de subir una fotografia.');const revision=validRevision(Number(url.searchParams.get('revision')));
    const current=await readProduct(pool,id);checkRevision(current.revision,revision);
    if(current.gallery.imagenes.length>=12)throw new Failure(400,'Cada modelo admite hasta 12 fotografias.');
    await quota(pool,'product:upload:'+user.username,100,3600);
    const bytes=await imageBody(req);let clean;
    try{clean=await processImage(bytes);}catch{throw new Failure(400,'No se pudo abrir esa imagen. Usa una fotografia JPG, PNG o WebP valida.');}
    if(!clean?.length||clean.length>LIMIT)throw new Failure(413,'No se pudo preparar una imagen de menos de 4 MB.');
    const imageId=randomUUID();uploadedKey='images/'+imageId+'.webp';store=await getStore();
    await store.set(uploadedKey,new Blob([clean],{type:'image/webp'}),{metadata:{mime:'image/webp'}});
    const result=await transaction(pool,async client=>{
     await requireAdmin(client,req,true);
     const row=await readProduct(client,id,true);checkRevision(row.revision,revision);
     if(row.gallery.imagenes.length>=12)throw new Failure(400,'Cada modelo admite hasta 12 fotografias.');
     await client.query('INSERT INTO public.maderoh_media(id,product_id,blob_key,mime,byte_size,position) VALUES($1,$2,$3,$4,$5,$6)',[imageId,id,uploadedKey,'image/webp',clean.length,row.gallery.imagenes.length]);
     const image={id:imageId,url:'/.netlify/functions/maderoh-image?id='+imageId,alt:row.product.nombre,posicion:row.gallery.imagenes.length,principal:row.gallery.imagenes.length===0};
     row.gallery.imagenes.push(image);if(image.principal)row.gallery.imagenPrincipal=image.url;
     return persist(client,row.product,row.gallery,revision,user.username,'upload_image');
    });
    uploadedKey=null;return response(201,result);
   }
   const body=await bodyFrom(req,65536);
   if(!['save','main-image','remove-image'].includes(body.action))throw new Failure(400,'Operacion no disponible.');
   const result=await transaction(pool,async client=>{
    await requireAdmin(client,req,true);
    if(body.action==='save'&&body.id==null){
     if(body.product?.activo===true)throw new Failure(400,'Guarda el modelo como borrador y agrega sus fotografias antes de publicarlo.');
     await client.query('SELECT pg_advisory_xact_lock(4210942)');
     const id=Number((await client.query('SELECT COALESCE(max(id),0)+1 AS id FROM public.maderoh_products')).rows[0].id);
     const p=validateProduct(body.product,null,id);p.imagen=PLACEHOLDER;p.imagenes=[];
     const gallery={productId:id,imagenPrincipal:PLACEHOLDER,imagenes:[]};
     await client.query('INSERT INTO public.maderoh_products(id,document) VALUES($1,$2)',[id,JSON.stringify(p)]);
     return persist(client,p,gallery,0,user.username,'create_product');
    }
    const id=validId(body.id);const row=await readProduct(client,id,true);checkRevision(row.revision,body.revision);
    if(body.action==='save')return persist(client,validateProduct(body.product,row.product,id),row.gallery,row.revision,user.username,'update_product');
    const image=row.gallery.imagenes.find(im=>String(im.id)===String(body.imageId));
    if(!image)throw new Failure(404,'La fotografia ya no esta en este modelo. Recargalo para revisar la galeria.');
    if(body.action==='main-image')row.gallery.imagenPrincipal=image.url;
    else{
     if(row.product.activo&&row.gallery.imagenes.length===1)throw new Failure(400,'Desactiva el modelo antes de retirar su ultima fotografia.');
     row.gallery.imagenes=row.gallery.imagenes.filter(im=>im!==image);
    }
    return persist(client,row.product,row.gallery,row.revision,user.username,body.action==='main-image'?'set_main_image':'remove_image');
   });
   return response(body.action==='save'&&body.id==null?201:200,result);
  }catch(e){
   // Conservar objetos inmutables incluso si el COMMIT tiene un resultado incierto.
   // Nunca borrar fotos: una vista previa puede referir fotos de produccion.
   return fail(e);
  }
 };
 const image=async req=>{
  try{
   if(req.method!=='GET')return response(405,{error:'Metodo no permitido.'},{Allow:'GET'});
   const id=new URL(req.url).searchParams.get('id')||'';
   if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))throw new Failure(404,'Imagen no encontrada.');
   const pool=await getPool();
   const row=(await pool.query(`SELECT m.blob_key,m.mime,p.document FROM public.maderoh_media m
    JOIN public.maderoh_products p ON p.id=m.product_id WHERE m.id=$1`,[id])).rows[0];
   if(!row||(row.document.imagenes||[]).every(url=>url!=='/.netlify/functions/maderoh-image?id='+id))throw new Failure(404,'Imagen no encontrada.');
   const active=row.document.activo===true;if(!active)await requireAdmin(pool,req);
   const bytes=await (await getStore()).get(row.blob_key,{type:'arrayBuffer'});
   if(!bytes)throw new Failure(404,'Imagen no encontrada.');
   return new Response(bytes,{headers:{'Content-Type':row.mime,'Cache-Control':active?'public, max-age=300':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline; filename="maderoh-'+id+'.webp"'}});
  }catch(e){return fail(e);}
 };
 return {catalog,admin,image};
}
