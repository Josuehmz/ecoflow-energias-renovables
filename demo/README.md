# Video demo

`grabar-demo.ts` graba el recorrido completo (≈ 4 min) con Playwright y el Chrome instalado:
login de la coordinadora, tablero, formulario con errores y creación correcta, login de un
instalador que solo ve lo suyo, cambio de estado permitido, transición ilegal rechazada por la base,
y el Studio local (tabla, relaciones y políticas RLS). Los rótulos en español y el cursor visible se
inyectan en cada página; no hay narración de voz.

```bash
supabase db reset                       # semilla limpia: la demo crea «Biblioteca Municipal Solar»
pnpm dev                                # app en http://127.0.0.1:5173 con .env.local del Supabase local
pnpm demo:grabar demo/salida            # → demo/salida/EcoFlow-demo.webm (VP9, 1920×1080)

# MP4 H.264 para entregar
ffmpeg -i demo/salida/EcoFlow-demo.webm -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
       -r 30 -movflags +faststart demo/salida/EcoFlow-demo.mp4
```

Playwright necesita su ffmpeg para grabar (`pnpm exec playwright install ffmpeg`). La carpeta
`demo/salida/` está ignorada por git: el video se entrega aparte.
