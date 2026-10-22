import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built page works when loaded from the app:// protocol.
export default defineConfig({ base: './', plugins: [react()], worker: { format: 'es' } });
