// Genera src/types/database.types.ts desde el esquema del Supabase LOCAL (supabase gen types).
//   pnpm gen:types          → escribe el archivo
//   pnpm gen:types:check    → falla (código 1) si el archivo del repo no coincide con el esquema
// La CLI se toma de SUPABASE_CLI o, si no está, de `supabase` en el PATH.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const destino = new URL('../src/types/database.types.ts', import.meta.url)
const cli = process.env.SUPABASE_CLI ?? 'supabase'
const generado = execFileSync(cli, ['gen', 'types', 'typescript', '--local', '--agent', 'no'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
}).replace(/\r\n/g, '\n')

if (process.argv.includes('--check')) {
  const actual = readFileSync(destino, 'utf8').replace(/\r\n/g, '\n')
  if (actual !== generado) {
    console.error('src/types/database.types.ts NO coincide con el esquema local: corre `pnpm gen:types`.')
    process.exit(1)
  }
  console.log('src/types/database.types.ts coincide con el esquema local (sin diferencias).')
} else {
  writeFileSync(destino, generado, 'utf8')
  console.log('Tipos escritos en src/types/database.types.ts')
}
