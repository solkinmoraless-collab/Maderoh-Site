import {getDatabase} from '@netlify/database';
import {createSalesHandlers} from './comercial.mjs';
let database;
export const sales=createSalesHandlers({getPool:()=>{database??=getDatabase();return database.pool;}});
