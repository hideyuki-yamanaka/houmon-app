import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('members').select('id, name, address');
if (error) { console.error(error); process.exit(1); }

// 全角数字/英字/ハイフンが含まれてる住所を抽出
const fullwidthRe = /[０-９Ａ-Ｚａ-ｚ－―ー‐−]/;
const hits = data.filter(m => m.address && fullwidthRe.test(m.address));
console.log(`total members: ${data.length}`);
console.log(`with full-width chars: ${hits.length}`);
for (const m of hits.slice(0, 30)) {
  console.log(`  ${m.name}: ${m.address}`);
}
if (hits.length > 30) console.log(`  ... and ${hits.length - 30} more`);
