const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('../.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: qData, error: qError } = await supabase.rpc('match_verses', {
    filter_religion: 'gita',
    match_count: 2,
    match_threshold: -1,
    query_embedding: new Array(384).fill(0.1)
  });
  console.log('RPC result with gita:', qData ? qData.length : qData, qError);
}
run();
