import {getDatabase} from '@netlify/database';
import {createMarketingHandlers} from './marketing.mjs';
let database;
export const marketing=createMarketingHandlers({getPool:()=>{database??=getDatabase();return database.pool;}});
