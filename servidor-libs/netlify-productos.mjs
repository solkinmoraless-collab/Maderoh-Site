import {getDatabase} from '@netlify/database';
import {getStore} from '@netlify/blobs';
import {createProductsHandlers} from './productos.mjs';
let database,media;
export const handlers=createProductsHandlers({
 getPool:()=>{database??=getDatabase();return database.pool;},
 getStore:()=>{media??=getStore({name:'maderoh-media-v1',consistency:'strong'});return media;},
 processImage:async bytes=>{
  const {default:sharp}=await import('sharp');
  const input=sharp(bytes,{limitInputPixels:20000000,failOn:'warning'});
  const meta=await input.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||(meta.pages||1)>1)throw Error('Formato no permitido');
  return input.rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 }
});
