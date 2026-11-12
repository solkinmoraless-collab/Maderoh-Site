import {getDatabase} from '@netlify/database';
import {createAnalyticsHandlers} from './estadisticas.mjs';
let database;
export const analytics=createAnalyticsHandlers({getPool:()=>{database??=getDatabase();return database.pool;}});
