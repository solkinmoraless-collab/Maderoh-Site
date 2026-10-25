"use strict";
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'PUBLICAR');
for(const name of ['index.html','productos.html','producto.html','personaliza.html','assets/catalogo.json','_headers','_redirects'])if(!fs.existsSync(path.join(root,name)))throw Error('Falta '+name);
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/catalogo.json'),'utf8'));
if(!data.productos.length)throw Error('El catalogo esta vacio.');
for(const p of data.productos)for(const photo of p.imagenes||[p.imagen])if(!fs.existsSync(path.join(root,photo)))throw Error('Falta una fotografia del catalogo.');
for(const name of ['data','database','admin','acceso.html','administracion.html','estadisticas.html','cotizaciones.html','cotizacion.html'])if(fs.existsSync(path.join(root,name)))throw Error('La salida debe incluir solo archivos publicos.');
console.log('Publicacion visual comprobada: '+data.productos.length+' modelos.');
