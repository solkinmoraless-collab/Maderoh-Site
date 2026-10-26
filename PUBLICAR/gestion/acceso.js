'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const endpoint='/.netlify/functions/maderoh-access',productsEndpoint='/.netlify/functions/maderoh-admin-products';
 const textFields=['nombre','subcategoria','descripcion','medidas','madera','estructura','acabado','fabricacion','entrega','incluye','garantia','condiciones','exclusiones','construccion','alturas','modificacionLabel'];
 const boolFields=['activo','destacado','apoyos','esPedidoPequeno','envioSiempreCotizar','precioPendiente'];
 let csrf='',list=[],categories={},defaults={},current=null,dirty=false,busy=false,rowId=0;
 const status=(id,message,error=false)=>{const n=$(id);n.textContent=message;n.classList.toggle('error',error);};
 const notice=(message,error=false,panel=false)=>status(panel?'panel-notice':'notice',message,error);
 const message=(m,e=false)=>status('editor-notice',m,e);
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function uid(prefix){return prefix+'-'+Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>b.toString(16).padStart(2,'0')).join('');}
 async function request(url,body,binary=false){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
  try{
   const options={credentials:'same-origin',cache:'no-store',signal:controller.signal};
   if(body!==undefined){options.method='POST';options.headers={'Content-Type':binary?(body.type||'image/webp'):'application/json','X-Maderoh-CSRF':csrf};options.body=binary?body:JSON.stringify(body);}
   const response=await fetch(url,options);let data;
   try{data=await response.json();}catch{throw new Error('El servidor no devolvió una respuesta válida.');}
   if(!response.ok){const e=new Error(data.error||'No se pudo completar la operación.');e.status=response.status;throw e;}
   return data;
  }catch(error){if(error.name==='AbortError')throw new Error('La conexión tardó demasiado. Revisa la lista antes de repetir una creación o carga.');throw error;}
  finally{clearTimeout(timer);}
 }
 const api=(action,body)=>request(endpoint+'?action='+action,body);
 const adminApi=body=>request(productsEndpoint,body);
 function markDirty(value=true){dirty=value;$('dirty-label').textContent=value?'Cambios pendientes de guardar':'';updatePhotoControls();}
 function updatePhotoControls(){const disabled=busy||dirty||!current?.product?.id;$('photo-files').disabled=disabled;$('upload-photos').disabled=disabled;for(const button of $('admin-gallery').querySelectorAll('button'))button.disabled=disabled;}
 function setBusy(value){busy=value;$('editor-fields').disabled=value;$('save-product').disabled=value;for(const id of ['new-product','close-editor','reload-product','refresh-list'])$(id).disabled=value;for(const b of $('product-rows').querySelectorAll('button'))b.disabled=value;updatePhotoControls();}
 function canLeave(){return !dirty||window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
 function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
 function renderList(){
  const query=normalize($('admin-search').value),state=$('admin-state').value;
  const matches=list.filter(r=>{const p=r.product;return (!query||normalize(p.nombre+' '+p.categoriaNombre).includes(query))&&(state==='all'||(state==='active'?p.activo:!p.activo));});
  $('product-rows').replaceChildren();
  for(const row of matches){const p=row.product,tr=node('tr');for(const [i,value]of [p.id,p.nombre,p.categoriaNombre,p.activo?'Publicado':'Borrador / inactivo'].entries()){const cell=node('td',value);cell.dataset.label=['ID','Modelo','Categoría','Estado'][i];tr.append(cell);}const cell=node('td');cell.dataset.label='Acción';const b=node('button','Editar','secondary compact');b.type='button';b.setAttribute('aria-label','Editar '+p.nombre);b.disabled=busy;b.addEventListener('click',()=>openProduct(p.id));cell.append(b);tr.append(cell);$('product-rows').append(tr);}
  if(!matches.length){const tr=node('tr'),td=node('td','No se encontraron modelos.');td.colSpan=5;tr.append(td);$('product-rows').append(tr);}
  $('list-count').textContent=list.length+' modelos · '+list.filter(r=>r.product.activo).length+' publicados · '+matches.length+' en esta lista';
  $('count-products').textContent=list.length;$('count-galleries').textContent=list.length;
 }
 async function refreshList(){const data=await adminApi();list=data.products;categories=data.categories;defaults=data.defaults;renderList();}
 async function dashboard(){
  const data=await api('dashboard');await refreshList();
  $('access').hidden=true;$('dashboard').hidden=false;
  $('current-user').textContent='Sesión de '+data.user.username;
  $('count-galleries').textContent=data.counts.galerias;$('count-admins').textContent=data.counts.administradores;
  notice('Catálogo conectado. Los cambios guardados se reflejan al recargar el sitio público.',false,true);
  $('dashboard-title').tabIndex=-1;$('dashboard-title').focus();
 }
 async function access(){
  csrf='';dirty=false;current=null;list=[];$('product-rows').replaceChildren();$('admin-gallery').replaceChildren();$('editor').hidden=true;
  $('dashboard').hidden=true;$('access').hidden=false;$('login-form').hidden=true;$('setup-form').hidden=true;
  try{const data=await api('status');if(data.needsSetup){$('setup-form').hidden=false;notice(data.setupConfigured?'Crea la primera cuenta administrativa.':'La activación inicial no está disponible. Revisa la configuración del propietario.',!data.setupConfigured);$('setup-form').querySelector('button').disabled=!data.setupConfigured;}else{$('login-form').hidden=false;notice('Ingresa con tu usuario y contraseña.');}}
  catch(error){notice(error.message,true);}
 }
 function rowInput(parent,label,value,type='text',min,max){
  const labelNode=node('label',label);const input=node('input');input.id='row-'+(++rowId);input.type=type;input.value=value??'';input.required=true;if(type==='number'){input.min=String(min??0);input.max=String(max??10000000);input.step='0.01';}else input.maxLength=200;labelNode.htmlFor=input.id;labelNode.append(input);parent.append(labelNode);return input;
 }
 function addPriceRow(kind,item={}){
  const container=$(kind==='variant'?'variant-rows':kind==='finish'?'finish-rows':'tier-rows');const row=node('div',undefined,'price-row');row.dataset.id=item.id||uid(kind==='finish'?'a':'v');
  const name=rowInput(row,kind==='tier'?'Desde (piezas)':kind==='variant'?'Medida / configuración':'Nombre del acabado',kind==='tier'?(item.desde??15):(item.nombre||''),kind==='tier'?'number':'text',1,1000);name.className='row-name';if(kind==='tier')name.step='1';
  if(kind==='variant'){const extra=node('div',undefined,'mattress-fields');for(const [key,label]of [['colchonAnchoCm','Ancho del colchón (cm)'],['colchonLargoCm','Largo del colchón (cm)']]){const input=rowInput(extra,label,item[key]??'','number',30,400);input.required=false;input.step='0.1';input.className=key;}row.append(extra);}
  const price=rowInput(row,kind==='finish'?'Adicional neto MXN':'Precio neto MXN',(Number(item.netoCentavos||0)/100).toFixed(2),'number',kind==='finish'?0:0.01,10000000);price.className='row-price';
  const remove=node('button','Quitar','secondary compact');remove.type='button';remove.setAttribute('aria-label','Quitar '+(kind==='variant'?'configuración':kind==='finish'?'acabado':'precio por cantidad'));remove.addEventListener('click',()=>{row.remove();if(kind==='finish')refreshFinishSelect();markDirty();});row.append(remove);container.append(row);
  if(kind==='finish')name.addEventListener('input',refreshFinishSelect);
  updateConfigurationControls();return row;
 }
 function updateConfigurationControls(){const pending=$('p-precioPendiente').checked;for(const input of $('variant-rows').querySelectorAll('input'))input.disabled=pending;for(const button of $('variant-rows').querySelectorAll('button'))button.disabled=pending;$('add-variant').disabled=pending;for(const extra of $('variant-rows').querySelectorAll('.mattress-fields'))extra.hidden=$('p-tipoMedida').value!=='colchon';}
 function refreshFinishSelect(selected){
  const select=$('p-default-finish'),old=selected??select.value;select.replaceChildren();
  for(const row of $('finish-rows').children){const option=node('option',row.querySelector('.row-name').value||'Acabado sin nombre');option.value=row.dataset.id;select.append(option);}
  if([...select.options].some(o=>o.value===old))select.value=old;
 }
 function money(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>10000000)throw new Error('Revisa los importes de las configuraciones y acabados.');return Math.round(n*100);}
 function priceRows(kind){
  const container=$(kind==='variant'?'variant-rows':kind==='finish'?'finish-rows':'tier-rows');
  return [...container.children].map(row=>{if(kind==='tier')return{desde:Number(row.querySelector('.row-name').value),netoCentavos:money(row.querySelector('.row-price').value)};const result={id:row.dataset.id,nombre:row.querySelector('.row-name').value.trim(),netoCentavos:money(row.querySelector('.row-price').value)};if(kind==='variant')for(const key of ['colchonAnchoCm','colchonLargoCm']){const value=row.querySelector('.'+key).value;result[key]=value===''?null:Number(value);}return result;});
 }
 function renderEditor(record){
  current=record;const p=record.product;const isNew=!p.id;
  $('editor').hidden=false;$('editor-title').textContent=isNew?'Crear modelo nuevo':p.nombre;
  $('editor-updated').textContent=isNew?'Se guardará primero como borrador.':'Modelo #'+p.id+(record.updatedAt?' · Actualizado '+new Date(record.updatedAt).toLocaleString('es-MX'):'');
  for(const field of textFields)$('p-'+field).value=p[field]||'';
  $('p-categoria').replaceChildren();const prompt=node('option','Selecciona una categoría');prompt.value='';$('p-categoria').append(prompt);for(const [key,name]of Object.entries(categories)){const option=node('option',name);option.value=key;$('p-categoria').append(option);}$('p-categoria').value=p.categoria||'';
  $('p-cantidadMinima').value=p.cantidadMinima||1;$('p-tipoMedida').value=p.tipoMedida||'mueble';
  for(const field of boolFields)$('p-'+field).checked=p[field]===true;
  for(const collection of ['cafeterias','tiendas'])$('p-'+collection).checked=(p.colecciones||[]).includes(collection);
  $('variant-rows').replaceChildren();for(const v of p.variantes||[])addPriceRow('variant',v);
  $('finish-rows').replaceChildren();for(const a of p.acabados||[])addPriceRow('finish',a);refreshFinishSelect(p.acabadoPredeterminado);
  $('tier-rows').replaceChildren();for(const t of p.precioVolumen||[])addPriceRow('tier',t);
  const hasPhotos=!!record.gallery?.imagenes?.length;$('p-activo').disabled=!hasPhotos;
  $('publish-help').textContent=hasPhotos?'Para retirar el modelo del sitio, desmarca Publicado y guarda los cambios.':'Guarda el borrador y sube al menos una fotografía antes de publicarlo.';
  $('save-product').textContent=isNew?'Guardar borrador':'Guardar cambios';$('reload-product').hidden=isNew;
  const link=$('view-product');link.hidden=!p.activo;if(p.activo)link.href='/producto.html?id='+p.id;else link.removeAttribute('href');
  $('admin-gallery').replaceChildren();
  for(const image of record.gallery?.imagenes||[]){
   const item=node('article',undefined,'photo-card'),img=node('img');img.src=image.url;img.alt=image.alt||p.nombre;img.loading='lazy';item.append(img);
   item.append(node('p',image.url===record.gallery.imagenPrincipal?'Portada actual':'Fotografía del modelo'));
   const controls=node('div',undefined,'photo-actions');
   if(image.url!==record.gallery.imagenPrincipal){const main=node('button','Usar de portada','secondary compact');main.type='button';main.addEventListener('click',()=>photoAction('main-image',image.id));controls.append(main);}
   const remove=node('button','Retirar foto','secondary compact');remove.type='button';remove.addEventListener('click',()=>photoAction('remove-image',image.id));controls.append(remove);item.append(controls);$('admin-gallery').append(item);
  }
  if(!hasPhotos)$('admin-gallery').append(node('p',isNew?'Guarda primero el modelo para agregar sus fotografías.':'Este modelo todavía no tiene fotografías.','helper'));
  updateConfigurationControls();markDirty(false);updatePhotoControls();
 }
 async function openProduct(id){if(busy||!canLeave())return;try{setBusy(true);const record=await request(productsEndpoint+'?id='+encodeURIComponent(id));renderEditor(record);message('');$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('p-nombre').focus({preventScroll:true});}catch(error){notice(error.message,true,true);if(error.status===401)await access();}finally{setBusy(false);}}
 $('new-product').addEventListener('click',()=>{if(busy||!canLeave())return;renderEditor({product:{...defaults,nombre:'',categoria:'',descripcion:'',medidas:'',madera:'',estructura:'',activo:false,destacado:false,apoyos:true,cantidadMinima:1,variantes:[{id:'estandar',nombre:'',netoCentavos:0}],acabados:[{id:'mate',nombre:'Mate',netoCentavos:0},{id:'brillante',nombre:'Alto brillo',netoCentavos:50000}],acabadoPredeterminado:'mate',acabado:'Mate incluido. Alto brillo con costo adicional.',colecciones:[]},gallery:{imagenes:[]},revision:0});message('Completa el modelo y guárdalo como borrador.');$('editor').scrollIntoView({behavior:'smooth'});$('p-nombre').focus({preventScroll:true});});
 $('close-editor').addEventListener('click',()=>{if(!canLeave())return;markDirty(false);current=null;$('editor').hidden=true;});
 $('reload-product').addEventListener('click',()=>{if(current?.product?.id)openProduct(current.product.id);});
 $('product-form').addEventListener('input',()=>markDirty());$('product-form').addEventListener('change',()=>markDirty());
 $('p-precioPendiente').addEventListener('change',updateConfigurationControls);$('p-tipoMedida').addEventListener('change',updateConfigurationControls);
 $('add-variant').addEventListener('click',()=>{addPriceRow('variant');markDirty();});$('add-finish').addEventListener('click',()=>{addPriceRow('finish');refreshFinishSelect();markDirty();});$('add-tier').addEventListener('click',()=>{addPriceRow('tier');markDirty();});
 $('product-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!current)return;setBusy(true);message('Guardando modelo…');
  try{
   const product={};for(const field of textFields)product[field]=$('p-'+field).value;
   for(const field of boolFields)product[field]=$('p-'+field).checked;
   product.categoria=$('p-categoria').value;product.cantidadMinima=Number($('p-cantidadMinima').value);product.colecciones=['cafeterias','tiendas'].filter(c=>$('p-'+c).checked);
   product.tipoMedida=$('p-tipoMedida').value;product.variantes=product.precioPendiente?(current.product.id?current.product.variantes:[]):priceRows('variant');product.acabados=priceRows('finish');product.precioVolumen=priceRows('tier');product.acabadoPredeterminado=$('p-default-finish').value;
   const isNew=!current.product.id;
   const record=await adminApi({action:'save',id:current.product.id||null,revision:current.revision,product});renderEditor(record);
   message(isNew?'Borrador guardado. Ahora puedes subir sus fotografías.':record.product.activo?'Cambios guardados y publicados. Recarga el sitio público para verlos.':'Cambios guardados. El modelo está fuera del catálogo público.');
   await refreshList();
  }catch(error){message(error.message,true);if(error.status===401){notice('Tu sesión terminó. Inicia de nuevo para guardar los cambios.',true,true);}}
  finally{setBusy(false);}
 });
 async function photoAction(action,imageId){
  if(busy||!current?.product?.id)return;if(dirty){message('Guarda los cambios del modelo antes de modificar las fotografías.',true);return;}
  if(action==='remove-image'&&!window.confirm('¿Retirar esta fotografía del catálogo del modelo?'))return;
  setBusy(true);message('Actualizando fotografías…');
  try{renderEditor(await adminApi({action,id:current.product.id,revision:current.revision,imageId}));await refreshList();message(action==='main-image'?'Portada actualizada.':'Fotografía retirada del catálogo.');}
  catch(error){message(error.message,true);}finally{setBusy(false);}
 }
 async function prepareImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error(file.name+': utiliza JPG, PNG o WebP de hasta 20 MB.');
  const source=URL.createObjectURL(file);const image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se pudo abrir '+file.name));image.src=source;});const scale=Math.min(1,2000/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la imagen.');ctx.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.84));if(!blob||blob.size>4194304)throw new Error(file.name+': reduce el tamaño de la imagen antes de subirla.');return blob;}
  finally{URL.revokeObjectURL(source);}
 }
 $('upload-photos').addEventListener('click',async()=>{
  if(busy||dirty||!current?.product?.id)return;
  const files=[...$('photo-files').files];if(!files.length){message('Selecciona al menos una fotografía.',true);return;}
  if(files.length+(current.gallery.imagenes.length||0)>12){message('Cada modelo admite hasta 12 fotografías.',true);return;}
  setBusy(true);let uploaded=0;
  try{for(const file of files){message('Preparando y subiendo fotografía '+(uploaded+1)+' de '+files.length+'…');const blob=await prepareImage(file);const record=await request(productsEndpoint+'?action=upload&id='+current.product.id+'&revision='+current.revision,blob,true);renderEditor(record);uploaded++;}$('photo-files').value='';await refreshList();message(uploaded+' fotografía(s) guardada(s). Ya puedes publicar el modelo si estaba como borrador.');}
  catch(error){message((uploaded?uploaded+' fotografía(s) ya se guardaron. ':'')+error.message,true);}finally{setBusy(false);}
 });
 $('admin-search').addEventListener('input',renderList);$('admin-state').addEventListener('change',renderList);$('refresh-list').addEventListener('click',async()=>{try{await refreshList();notice('Lista actualizada.',false,true);}catch(error){notice(error.message,true,true);}});
 for(const action of ['login','setup'])$(action+'-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');
  if(action==='setup'&&$('setup-password').value!==$('setup-confirm').value){notice('Las contraseñas no coinciden.',true);$('setup-confirm').focus();return;}
  button.disabled=true;notice(action==='setup'?'Creando tu cuenta…':'Verificando acceso…');
  try{const data=await api(action,Object.fromEntries(new FormData(form)));csrf=data.csrf;form.reset();await dashboard();}
  catch(error){notice(error.message,true);if(error.status===409)await access();}finally{button.disabled=false;}
 });
 $('logout').addEventListener('click',async()=>{if(busy||!canLeave())return;$('logout').disabled=true;try{await api('logout',{});await access();}catch(error){if(error.status===401)await access();else notice(error.message,true,true);}finally{$('logout').disabled=false;}});
 window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
 (async()=>{try{const data=await api('session');csrf=data.csrf;await dashboard();}catch(error){if(error.status===401)await access();else notice(error.message,true);}})();
})();
