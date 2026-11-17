import pg from 'pg'; import fs from 'fs';
const du = fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'');
const c = new pg.Client({ connectionString: du }); await c.connect();
const q=(s,p=[])=>c.query(s,p).then(r=>r.rows);
// columns of protocol_calls
const cols = await q(`SELECT column_name FROM information_schema.columns WHERE table_name='protocol_calls' ORDER BY ordinal_position`);
console.log('protocol_calls cols:', cols.map(x=>x.column_name).join(', '));
// distinct series + any host/facilitator/moderator fields
const series = await q(`SELECT DISTINCT series FROM protocol_calls WHERE series ILIKE '%account%' OR series ILIKE '%aa%' OR series ILIKE '%4337%' OR series ILIKE '%abstraction%'`).catch(e=>[{series:'ERR '+e.message}]);
console.log('AA-related series:', series);
