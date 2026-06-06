const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('../.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- TEST 1: filter_book: gita ---');
  const res1 = await supabase.rpc('match_verses', {
    filter_book: 'gita',
    match_count: 2,
    match_threshold: -1,
    query_embedding: new Array(384).fill(0.1)
  });
  console.log('Result:', res1.data ? res1.data.length : res1.data, 'Error:', res1.error);

  console.log('--- TEST 2: filter_religion: hinduism ---');
  const res2 = await supabase.rpc('match_verses', {
    filter_religion: 'hinduism',
    match_count: 2,
    match_threshold: -1,
    query_embedding: new Array(384).fill(0.1)
  });
  console.log('Result:', res2.data ? res2.data.length : res2.data, 'Error:', res2.error);

  console.log('--- TEST 3: filter_religion: gita ---');
  const res3 = await supabase.rpc('match_verses', {
    filter_religion: 'gita',
    match_count: 2,
    match_threshold: -1,
    query_embedding: new Array(384).fill(0.1)
  });
  console.log('Result:', res3.data ? res3.data.length : res3.data, 'Error:', res3.error);

  console.log('--- TEST 4: filter_book: krishna ---');
  const res4 = await supabase.rpc('match_verses', {
    filter_book: 'krishna',
    match_count: 2,
    match_threshold: -1,
    query_embedding: new Array(384).fill(0.1)
  });
  console.log('Result:', res4.data ? res4.data.length : res4.data, 'Error:', res4.error);
}
run();
