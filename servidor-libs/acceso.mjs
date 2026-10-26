import {randomBytes, createHash, timingSafeEqual, scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';

const scrypt=promisify(scryptCallback);
const COOKIE='__Host-maderoh_admin_v1';
const TTL=8*60*60;
const USER=/^[a-z0-9._-]{3,40}$/;
const HASH=/^[a-f0-9]{64}$/;
const OPTIONS={N:131072,r:8,p:1,maxmem:256*1024*1024};
const sha=value=>createHash('sha256').update(value).digest('hex');
const csrfFor=token=>sha('maderoh-csrf-v1:'+token);
const equal=(a,b)=>{const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
class Failure extends Error{constructor(status,message){super(message);this.status=status;}}

function response(status,body,extra={}){
 return new Response(JSON.stringify(body),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",...extra}});
}
function cookie(token,age=TTL){return `${COOKIE}=${token}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;}
function tokenFrom(req){
 const cookies=(req.headers.get('cookie')||'').split(';').map(c=>c.trim().split('='));
 const matches=cookies.filter(([k])=>k===COOKIE);
 return matches.length===1&&HASH.test(matches[0][1]||'')?matches[0][1]:null;
}
function sameOrigin(req){
 const origin=req.headers.get('origin');
 if(!origin||origin!==new URL(req.url).origin)throw new Failure(403,'Solicitud no autorizada.');
 const site=req.headers.get('sec-fetch-site');
 if(site&&site!=='same-origin'&&site!=='none')throw new Failure(403,'Solicitud no autorizada.');
}
async function bodyFrom(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))throw new Failure(415,'Se requiere una solicitud JSON.');
 if(Number(req.headers.get('content-length'))>4096)throw new Failure(413,'Solicitud demasiado grande.');
 if(!req.body)throw new Failure(400,'Solicitud vacia.');
 const reader=req.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new Failure(413,'Solicitud demasiado grande.');}chunks.push(value);}
 try{const b=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!b||typeof b!=='object'||Array.isArray(b))throw 0;return b;}
 catch{throw new Failure(400,'Solicitud invalida.');}
}
function credentials(body){
 if(typeof body.username!=='string'||typeof body.password!=='string')throw new Failure(400,'Completa usuario y contrasena.');
 const username=body.username.trim().toLowerCase();const password=body.password;
 if(!USER.test(username))throw new Failure(400,'Usuario: de 3 a 40 caracteres; letras, numeros, punto, guion o guion bajo.');
 if(password.length<12||password.length>128||Buffer.byteLength(password)>512)throw new Failure(400,'La contrasena debe tener de 12 a 128 caracteres.');
 return {username,password};
}
async function hashPassword(password,salt){return (await scrypt(password,salt,64,OPTIONS)).toString('hex');}
async function transaction(pool,fn){
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query("SET LOCAL statement_timeout = '10s'");const result=await fn(client);await client.query('COMMIT');return result;}
 catch(error){try{await client.query('ROLLBACK');}catch{}throw error;}
 finally{client.release();}
}
// Cada cuota se reserva con un unico UPSERT atomico, incluso entre instancias.
async function quota(pool,key,limit,seconds){
 const result=await pool.query(`INSERT INTO public.maderoh_rate_limits(key,hits,expires_at)
 VALUES($1,'[1]'::jsonb,now()+($2::int*interval '1 second'))
 ON CONFLICT(key) DO UPDATE SET
 hits=CASE WHEN maderoh_rate_limits.expires_at<=now() THEN '[1]'::jsonb ELSE maderoh_rate_limits.hits||'[1]'::jsonb END,
 expires_at=CASE WHEN maderoh_rate_limits.expires_at<=now() THEN now()+($2::int*interval '1 second') ELSE maderoh_rate_limits.expires_at END,
 updated_at=now()
 WHERE maderoh_rate_limits.expires_at<=now() OR jsonb_array_length(maderoh_rate_limits.hits)<$3
 RETURNING key`,[sha(key),seconds,limit]);
 if(!result.rows.length)throw new Failure(429,'Demasiados intentos. Espera antes de volver a intentar.');
}
async function limited(pool,context,username=''){
 const ip=typeof context.ip==='string'?context.ip.slice(0,128):'desconocida';
 await pool.query(`DELETE FROM public.maderoh_rate_limits WHERE key IN
 (SELECT key FROM public.maderoh_rate_limits WHERE expires_at<=now() LIMIT 100)`);
 await quota(pool,'access:global',60,60);
 await quota(pool,'access:ip:'+ip,10,900);
 if(username)await quota(pool,'access:user:'+username,10,900);
}
async function session(pool,req){
 const token=tokenFrom(req);if(!token)return null;
 const result=await pool.query(`SELECT s.username,s.generation,s.csrf_hash FROM public.maderoh_sessions s
 JOIN public.maderoh_admins a ON a.username=s.username
 WHERE s.token_hash=$1 AND s.expires_at>now() AND a.enabled=true AND a.generation=s.generation`,[sha(token)]);
 const row=result.rows[0];return row?{...row,token,csrf:csrfFor(token)}:null;
}
function verifyCsrf(req,s){if(!equal(sha(req.headers.get('x-maderoh-csrf')||''),s.csrf_hash))throw new Failure(403,'Sesion no valida. Vuelve a iniciar sesion.');}
async function newSession(client,username,generation,token,oldToken){
 await client.query('DELETE FROM public.maderoh_sessions WHERE expires_at<=now() OR token_hash=$1',[oldToken?sha(oldToken):'']);
 // Maximo 5 sesiones por cuenta: las anteriores se revocan al abrir otra.
 await client.query(`DELETE FROM public.maderoh_sessions WHERE token_hash IN
 (SELECT token_hash FROM public.maderoh_sessions WHERE username=$1 ORDER BY created_at DESC OFFSET 4)`,[username]);
 await client.query(`INSERT INTO public.maderoh_sessions(token_hash,username,generation,csrf_hash,expires_at)
 VALUES($1,$2,$3,$4,now()+interval '8 hours')`,[sha(token),username,generation,sha(csrfFor(token))]);
}
async function audit(client,actor,action){await client.query('INSERT INTO public.maderoh_audit(actor,action,entity) VALUES($1,$2,$3)',[actor,action,'acceso-administrativo']);}

export function createAccessHandler({getPool,env=process.env}){
 return async function handle(req,context={}){
  try{
   const action=new URL(req.url).searchParams.get('action')||'session';
   if(!['status','session','dashboard','setup','login','logout'].includes(action))return response(404,{error:'Ruta no encontrada.'});
   const expected=['setup','login','logout'].includes(action)?'POST':'GET';
   if(req.method!==expected)return response(405,{error:'Metodo no permitido.'},{Allow:expected});
   let body;
   if(expected==='POST'){sameOrigin(req);body=await bodyFrom(req);}
   const pool=await getPool();
   if(action==='status'){
    const exists=(await pool.query('SELECT EXISTS(SELECT 1 FROM public.maderoh_admins) AS present')).rows[0].present;
    return response(200,{needsSetup:!exists,setupConfigured:typeof env.MADEROH_SETUP_TOKEN==='string'&&env.MADEROH_SETUP_TOKEN.length>=32});
   }
   if(action==='session'||action==='dashboard'||action==='logout'){
    const s=await session(pool,req);
    if(!s)return response(401,{authenticated:false,error:'Inicia sesion para continuar.'},{'Set-Cookie':cookie('',0)});
    if(action==='session')return response(200,{authenticated:true,user:{username:s.username},csrf:s.csrf});
    if(action==='logout'){
     verifyCsrf(req,s);
     await transaction(pool,async c=>{await c.query('DELETE FROM public.maderoh_sessions WHERE token_hash=$1',[sha(s.token)]);await audit(c,s.username,'logout');});
     return response(200,{ok:true},{'Set-Cookie':cookie('',0)});
    }
    const counts=(await pool.query(`SELECT
      (SELECT count(*) FROM public.maderoh_products)::int AS productos,
      (SELECT count(*) FROM public.maderoh_settings WHERE key LIKE 'gallery:%')::int AS galerias,
      (SELECT count(*) FROM public.maderoh_admins WHERE enabled=true)::int AS administradores`)).rows[0];
    const products=(await pool.query(`SELECT id,document->>'nombre' AS nombre,document->>'categoriaNombre' AS categoria,document->'activo' AS activo
      FROM public.maderoh_products ORDER BY id`)).rows;
    return response(200,{user:{username:s.username},counts,products});
   }
   const {username,password}=credentials(body);
   await limited(pool,context,username);
   if(action==='setup'){
    const secret=env.MADEROH_SETUP_TOKEN;
    if(typeof secret!=='string'||secret.length<32)throw new Failure(503,'La activacion inicial no esta configurada en el servidor.');
    if(typeof body.setupToken!=='string'||body.setupToken.length>256||!equal(sha(body.setupToken),sha(secret)))throw new Failure(403,'Clave de activacion no valida.');
    const salt=randomBytes(32).toString('hex');const passwordHash=await hashPassword(password,salt);const token=randomBytes(32).toString('hex');
    await transaction(pool,async client=>{
     await client.query('SELECT pg_advisory_xact_lock(4210941)');
     const present=(await client.query('SELECT EXISTS(SELECT 1 FROM public.maderoh_admins) AS present')).rows[0].present;
     if(present)throw new Failure(409,'La primera cuenta ya fue creada. Utiliza Iniciar sesion.');
     await client.query('INSERT INTO public.maderoh_admins(username,password_hash,password_salt) VALUES($1,$2,$3)',[username,passwordHash,salt]);
     await newSession(client,username,1,token,tokenFrom(req));await audit(client,username,'first_admin_created');
    });
    return response(201,{ok:true,user:{username},csrf:csrfFor(token)},{'Set-Cookie':cookie(token)});
   }
   const admin=(await pool.query('SELECT username,password_hash,password_salt,password_algorithm,generation,enabled FROM public.maderoh_admins WHERE username=$1',[username])).rows[0];
   const hash=await hashPassword(password,admin?.password_salt||'maderoh-usuario-inexistente-v1');
   if(!admin||!admin.enabled||admin.password_algorithm!=='scrypt-N131072-r8-p1'||!equal(hash,admin.password_hash))throw new Failure(401,'Usuario o contrasena incorrectos.');
   const token=randomBytes(32).toString('hex');
   await transaction(pool,async client=>{
    // Revalidar la cuenta dentro de la transaccion evita sesiones de una clave revocada.
    const a=(await client.query('SELECT generation,enabled,password_hash FROM public.maderoh_admins WHERE username=$1 FOR UPDATE',[username])).rows[0];
    if(!a||!a.enabled||a.generation!==admin.generation||a.password_hash!==admin.password_hash)throw new Failure(401,'Usuario o contrasena incorrectos.');
    await newSession(client,username,a.generation,token,tokenFrom(req));await audit(client,username,'login');
   });
   return response(200,{ok:true,user:{username},csrf:csrfFor(token)},{'Set-Cookie':cookie(token)});
  }catch(error){
   if(error instanceof Failure)return response(error.status,{error:error.message},error.status===429?{'Retry-After':'900'}:{});
   // No imprimir cuerpos, claves, cookies, contrasenas ni cadenas de conexion.
   console.error('Maderoh acceso: operacion no disponible.');
   return response(503,{error:'El acceso administrativo no esta disponible. Intenta mas tarde o revisa la configuracion del servidor.'});
  }
 };
}
