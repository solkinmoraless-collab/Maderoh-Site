import {getDatabase} from '@netlify/database';
import {createNoticeHandler,dispatchNotices} from './avisos.mjs';
let database;
const getPool=()=>{database??=getDatabase();return database.pool;};
export const notices=createNoticeHandler({getPool});
export const sendNotices=async()=>{
 // Evitar conexión o envíos en previews y antes de activar WhatsApp.
 const {whatsappConfig}=await import('./avisos.mjs');if(!whatsappConfig().enabled)return;
 await dispatchNotices(await getPool());
};
