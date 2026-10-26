'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const endpoint='/.netlify/functions/maderoh-access';
 let csrf='';
 const notice=(message,error=false,panel=false)=>{const node=$(panel?'panel-notice':'notice');node.textContent=message;node.classList.toggle('error',error);};
 async function api(action,body){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const options={credentials:'same-origin',cache:'no-store',signal:controller.signal};
   if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-Maderoh-CSRF':csrf};options.body=JSON.stringify(body);}
   const response=await fetch(endpoint+'?action='+action,options);
   let data;try{data=await response.json();}catch{throw new Error('No se pudo leer la respuesta del servidor.');}
   if(!response.ok){const error=new Error(data.error||'No fue posible completar la operación.');error.status=response.status;throw error;}
   return data;
  }catch(error){if(error.name==='AbortError')throw new Error('La conexión tardó demasiado. Vuelve a intentar.');throw error;}
  finally{clearTimeout(timeout);}
 }
 async function dashboard(){
  const data=await api('dashboard');
  $('access').hidden=true;$('dashboard').hidden=false;
  $('current-user').textContent='Sesión de '+data.user.username;
  $('count-products').textContent=data.counts.productos;
  $('count-galleries').textContent=data.counts.galerias;
  $('count-admins').textContent=data.counts.administradores;
  $('product-rows').replaceChildren();
  for(const product of data.products){
   const tr=document.createElement('tr');
   for(const value of [product.id,product.nombre,product.categoria,product.activo===false?'Inactivo':'Activo']){const td=document.createElement('td');td.textContent=value??'—';tr.append(td);}
   $('product-rows').append(tr);
  }
  notice('Conectado a la base de datos.',false,true);
  $('dashboard-title').tabIndex=-1;$('dashboard-title').focus();
 }
 async function access(){
  csrf='';$('dashboard').hidden=true;$('access').hidden=false;$('login-form').hidden=true;$('setup-form').hidden=true;
  try{
   const status=await api('status');
   if(status.needsSetup){
    $('setup-form').hidden=false;
    notice(status.setupConfigured?'Crea la primera cuenta administrativa.':'Falta configurar MADEROH_SETUP_TOKEN en Netlify para activar la primera cuenta.',!status.setupConfigured);
    $('setup-form').querySelector('button').disabled=!status.setupConfigured;
   }else{$('login-form').hidden=false;notice('Ingresa con tu usuario y contraseña.');}
  }catch(error){notice(error.message,true);}
 }
 for(const action of ['login','setup'])$(action+'-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');
  if(action==='setup'&&$('setup-password').value!==$('setup-confirm').value){notice('Las contraseñas no coinciden.',true);$('setup-confirm').focus();return;}
  button.disabled=true;notice(action==='setup'?'Creando tu cuenta…':'Verificando acceso…');
  try{
   const body=Object.fromEntries(new FormData(form));const data=await api(action,body);csrf=data.csrf;form.reset();
   await dashboard();
  }catch(error){
   notice(error.message,true);
   if(error.status===409)await access();
  }finally{button.disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{
  $('logout').disabled=true;
  try{await api('logout',{});csrf='';$('product-rows').replaceChildren();$('current-user').textContent='';await access();}
  catch(error){if(error.status===401){await access();}else notice(error.message,true,true);}
  finally{$('logout').disabled=false;}
 });
 (async()=>{try{const data=await api('session');csrf=data.csrf;await dashboard();}catch(error){if(error.status===401)await access();else notice(error.message,true);}})();
})();
