import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    env: {
      VITE_HEMOCIONE_ID_URL: 'https://id.test',
      VITE_HEMOCIONE_ID_API_URL: 'https://id-api.test',
      VITE_HEMOCIONE_COLETA_URL: 'https://coleta.test',
      VITE_HEMOCIONE_DIGITAL_EVENT_URL: 'https://eventos.test',
    },
  },
})
