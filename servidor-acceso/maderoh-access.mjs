import {getDatabase} from '@netlify/database';
import {createAccessHandler} from '../servidor-libs/acceso.mjs';

let database;
export default createAccessHandler({getPool:()=>{
 database??=getDatabase();
 return database.pool;
}});
