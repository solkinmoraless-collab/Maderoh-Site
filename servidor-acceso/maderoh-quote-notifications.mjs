import {sendNotices} from '../servidor-libs/netlify-avisos.mjs';
export default async()=>{await sendNotices();};
export const config={schedule:'*/5 * * * *'};
