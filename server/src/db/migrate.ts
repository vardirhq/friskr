import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

const sql = postgres(process.env.DATABASE_URL!);

await sql`
  create table if not exists _migrations (
    name text primary key,
    ran_at timestamptz not null default now()
  )
`;

const already = new Set(
  (await sql`select name from _migrations`).map((r) => r.name)
);

const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (already.has(file)) {
    console.log(`skip  ${file}`);
    continue;
  }
  const content = await readFile(join(migrationsDir, file), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(content);
    await tx`insert into _migrations (name) values (${file})`;
  });
  console.log(`ran   ${file}`);
}

await sql.end();
console.log('Migrations complete.');
