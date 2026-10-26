import {getDatabase} from '@netlify/database';
import {createQuoteHandlers} from './cotizaciones.mjs';
let database;
export const quotes=createQuoteHandlers({getPool:()=>{database??=getDatabase();return database.pool;}});
