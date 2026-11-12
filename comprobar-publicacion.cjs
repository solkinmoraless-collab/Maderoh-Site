'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'PUBLICAR');
for(const name of ['index.html','productos.html','producto.html','personaliza.html','gestion/index.html','gestion/acceso.js','gestion/acceso.css','gestion/cotizaciones.html','gestion/cotizaciones.js','gestion/cotizaciones.css','gestion/estadisticas.html','gestion/estadisticas.js','gestion/estadisticas.css','gestion/comercial.html','gestion/comercial.js','gestion/comercial.css','js/medicion.js','css/medicion.css','js/solicitudes.js','js/catalogo-remoto.js','_headers','_redirects'])if(!fs.existsSync(path.join(root,name)))throw Error('Falta '+name);
for(const name of ['data','database','admin','acceso.html','administracion.html','estadisticas.html','cotizaciones.html','cotizacion.html'])if(fs.existsSync(path.join(root,name)))throw Error('No publicar archivos privados: '+name);
const legacy=JSON.parse(fs.readFileSync(path.join(root,'assets/catalogo.json'),'utf8'));
if(legacy.productos.length||legacy.origen!=='netlify-database')throw Error('El catalogo publico debe consultar la base de datos.');
for(const name of ['maderoh-access.mjs','maderoh-products.mjs','maderoh-admin-products.mjs','maderoh-image.mjs','maderoh-quotes.mjs','maderoh-admin-quotes.mjs','maderoh-events.mjs','maderoh-admin-analytics.mjs','maderoh-admin-clients.mjs','maderoh-admin-orders.mjs'])if(!fs.existsSync(path.join(__dirname,'servidor-acceso',name)))throw Error('Falta funcion '+name);
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'),'utf8'));
for(const dependency of ['@netlify/database','@netlify/blobs','sharp'])if(!pkg.dependencies?.[dependency])throw Error('Falta dependencia '+dependency);
for(const name of ['index.html','productos.html','producto.html'])if(!fs.readFileSync(path.join(root,name),'utf8').includes('js/catalogo-remoto.js'))throw Error('Falta conexion de catalogo en '+name);
const redirects=fs.readFileSync(path.join(root,'_redirects'),'utf8');if(/^\s*\/\.netlify\//m.test(redirects))throw Error('No crear reglas para rutas reservadas de Netlify.');
console.log('Publicacion comprobada: catalogo remoto, editor y diez funciones, clientes, pedidos y pagos internos configuradas.');

for(const name of ["index.html", "productos.html", "producto.html", "personaliza.html", "preguntas-frecuentes.html", "envios.html", "facturacion.html", "aviso-privacidad.html", "terminos-condiciones.html"])if(!fs.readFileSync(path.join(root,name),'utf8').includes('/js/medicion.js'))throw Error('Falta medicion en '+name);

if(!fs.existsSync(path.join(__dirname,'netlify/database/migrations/20261026150000_maderoh_clientes_pedidos.sql')))throw Error('Falta migracion de clientes y pedidos.');

for(const name of ['academy.html','css/academy.css','gestion/avisos.html','gestion/avisos.js','gestion/avisos.css'])if(!fs.existsSync(path.join(root,name)))throw Error('Falta '+name);
for(const name of ['maderoh-admin-notifications.mjs','maderoh-quote-notifications.mjs'])if(!fs.existsSync(path.join(__dirname,'servidor-acceso',name)))throw Error('Falta '+name);
if(fs.readFileSync(path.join(root,'js/precios.js'),'utf8')!==fs.readFileSync(path.join(__dirname,'servidor-libs/precios.cjs'),'utf8'))throw Error('Los motores de precios deben ser idénticos.');
if(!fs.existsSync(path.join(__dirname,'netlify/database/migrations/20261112120000_maderoh_avisos_academy.sql')))throw Error('Falta migración de avisos y Academy.');
console.log('Actualización comprobada: Academy, precios sin IVA automático y avisos privados.');

// CONTEXT es de compilación, no se presupone que exista en Functions.
// Solo se empaqueta este nombre no secreto para bloquear envíos en previews.
const deployContext=['production','deploy-preview','branch-deploy'].includes(process.env.CONTEXT)?process.env.CONTEXT:'local';
fs.writeFileSync(path.join(__dirname,'servidor-libs/entorno.json'),JSON.stringify({context:deployContext})+'\n');

// La página debe cargar las dependencias antes del código que las utiliza.
for(const [page,consumer]of [['index.html','js/inicio-productos.js'],['productos.html','js/catalogo.js'],['producto.html','js/producto-config.js']]){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 const scripts=[...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m=>m[1].replace(/^\//,''));
 const provider=scripts.indexOf('js/ofertas.js'),client=scripts.indexOf(consumer);
 if(provider<0||client<0||provider>client)throw Error('Falta cargar js/ofertas.js antes de '+consumer+' en '+page);
}
