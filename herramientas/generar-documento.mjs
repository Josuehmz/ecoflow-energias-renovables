// Genera los diagramas y el PDF del Documento de Arquitectura desde docs/ARQUITECTURA.md
// (fuente única: los diagramas son los bloques ```mermaid del propio Markdown).
//
//   node herramientas/generar-documento.mjs              → docs/img/diagrama-N.svg|png y docs/ARQUITECTURA.pdf
//   node herramientas/generar-documento.mjs --verificar  → falla si un diagrama del .md no tiene su imagen
//                                                          o si la imagen es de otra versión del bloque
//
// Usa Playwright con el Chrome instalado (channel 'chrome') y mermaid desde node_modules (sin red).
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { marked } from 'marked'
import { chromium } from 'playwright'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const MD = join(RAIZ, 'docs', 'ARQUITECTURA.md')
const IMG = join(RAIZ, 'docs', 'img')
const PDF = join(RAIZ, 'docs', 'ARQUITECTURA.pdf')
const MERMAID = join(RAIZ, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
const REPO_BLOB = 'https://github.com/Josuehmz/ecoflow-energias-renovables/blob/main'

const fuente = readFileSync(MD, 'utf8').replace(/\r\n/g, '\n')
const bloques = [...fuente.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m, i) => ({
  n: i + 1,
  codigo: m[1],
  huella: createHash('sha256').update(m[1]).digest('hex').slice(0, 16),
}))

if (process.argv.includes('--verificar')) {
  let fallos = 0
  for (const b of bloques) {
    const svg = join(IMG, `diagrama-${b.n}.svg`)
    const ok = existsSync(svg) && readFileSync(svg, 'utf8').includes(`data-huella="${b.huella}"`) && existsSync(svg.replace('.svg', '.png'))
    if (!ok) fallos += 1
    console.log(`${ok ? 'ok' : 'FALLA'} diagrama ${b.n} (${b.huella})`)
  }
  process.exit(fallos === 0 ? 0 : 1)
}

mkdirSync(IMG, { recursive: true })
const navegador = await chromium.launch({ channel: process.env.DEMO_CHANNEL ?? 'chrome' })
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 })

// 1. Diagramas: SVG (con la huella del bloque, para --verificar) y PNG para el PDF.
await pagina.setContent('<!doctype html><html><body style="margin:0;background:#fff"><div id="d"></div></body></html>')
await pagina.addScriptTag({ path: MERMAID })
await pagina.evaluate(() => window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'Segoe UI, sans-serif' }))
for (const b of bloques) {
  const svg = await pagina.evaluate(async ({ n, codigo }) => {
    const { svg } = await window.mermaid.render(`diagrama${n}`, codigo)
    document.getElementById('d').innerHTML = svg
    return svg
  }, b)
  writeFileSync(join(IMG, `diagrama-${b.n}.svg`), svg.replace('<svg ', `<svg data-huella="${b.huella}" `), 'utf8')
  await pagina.locator('#d svg').screenshot({ path: join(IMG, `diagrama-${b.n}.png`) })
  console.log(`diagrama ${b.n} → docs/img/diagrama-${b.n}.svg y .png`)
}

// 2. HTML imprimible: cada bloque mermaid se cambia por su imagen.
let n = 0
const markdown = fuente.replace(/```mermaid\n[\s\S]*?```/g, () => {
  n += 1
  return `<p class="diagrama"><img src="img/diagrama-${n}.png" alt="Diagrama ${n}"></p>`
})
const cuerpo = marked.parse(markdown)
  // Los enlaces relativos del Markdown (../src/..., PROMPTS.md#...) se resolverían contra el archivo
  // temporal y quedarían en el PDF como file:///<carpeta del usuario>/...: rotos para el lector y con
  // una ruta personal. Se reescriben a la vista del archivo en GitHub; las imágenes siguen locales.
  .replace(/<a href="(?![a-z][a-z0-9+.-]*:|#)([^"]+)"/gi, (_, destino) => {
    const [ruta, ancla] = destino.split('#')
    const url = new URL(ruta, `${REPO_BLOB}/docs/`).href
    return `<a href="${url}${ancla ? `#${ancla}` : ''}"`
  })
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  body { font: 10.5pt/1.5 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
  h1 { font-size: 24pt; color: #065f46; margin: 0 0 6pt; }
  h2 { font-size: 15pt; color: #065f46; border-bottom: 2px solid #a7f3d0; padding-bottom: 3pt; margin-top: 18pt; break-after: avoid; }
  h2:not(:first-of-type) { break-before: page; }
  h3 { font-size: 12pt; margin-top: 12pt; break-after: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9pt; break-inside: auto; }
  th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; vertical-align: top; text-align: left; }
  th { background: #ecfdf5; }
  tr { break-inside: avoid; }
  code { font: 8.8pt Consolas, monospace; background: #f1f5f9; padding: 0 2pt; border-radius: 3pt; }
  pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8pt; border-radius: 6pt; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 8.3pt; }
  .diagrama { text-align: center; break-inside: avoid; }
  .diagrama img { max-width: 100%; max-height: 225mm; }
  a { color: #047857; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #cbd5e1; }
</style></head><body>${cuerpo}</body></html>`
// Se abre desde un archivo (no con setContent): una página about:blank no puede cargar imágenes file://.
const temporal = join(RAIZ, 'docs', '.ARQUITECTURA.imprimir.html')
writeFileSync(temporal, html, 'utf8')
await pagina.goto(pathToFileURL(temporal).href, { waitUntil: 'load' })
rmSync(temporal)
await pagina.pdf({
  path: PDF,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div style="font-size:8pt;color:#64748b;width:100%;text-align:right;padding-right:16mm">EcoFlow · Documento de Arquitectura</div>',
  footerTemplate: '<div style="font-size:8pt;color:#64748b;width:100%;text-align:center">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
  margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
})
await navegador.close()
console.log(`PDF → docs/ARQUITECTURA.pdf (${bloques.length} diagramas)`)
