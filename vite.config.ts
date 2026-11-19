/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias de shadcn/ui (components.json): @/components/ui/button → src/components/ui/button
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    // threads en vez de forks: en una carpeta de OneDrive un fork puede tardar más de los 60 s
    // que Vitest espera a que arranque el worker, y la corrida falla sin ejecutar pruebas.
    pool: 'threads',
    include: ['src/**/*.test.{ts,tsx}'],
    // Sin `globals`, Testing Library no registra su limpieza automática: la hace este archivo.
    setupFiles: ['src/test/setup.ts'],
  },
})
