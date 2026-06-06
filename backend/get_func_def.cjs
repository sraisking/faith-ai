const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('../.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('match_verses', {
    // let's see what happens if we pass empty or nothing or wrong params
  });
  console.log('rpc call without params:', data, error);
  
  // Let's run a query to get function definition
  const { data: funcData, error: funcError } = await supabase
    .from('verses')
    .select('id')
    .limit(1); // just checking connection
  console.log('Check verses table connection:', funcData, funcError);
  
  // Let's run raw SQL via RPC or query if there is any custom SQL executor, or let's select from information_schema orpg_proc.
  // Wait, we can't run raw SQL using select unless we have a specific RPC, but let's check if we can query pg_proc.
  // Actually, we can use a query on pg_catalog or information_schema?
  // Let's try selecting from pg_proc. But wait, is there select access on system catalog views through PostgREST?
  // Usually, Supabase does not expose pg_catalog tables via PostgREST API by default unless they are exposed in the 'public' schema or a custom RPC is created.
  // Let's see if we can query them, e.g. via supabase.from('pg_proc') or similar.
  // Wait, let's see if there is any custom RPC or function we can use.
}
run();
