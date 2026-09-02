import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Standalone mobile client. Local development proxies to the existing Node
// Agent service; production can use VITE_AGENT_API_ORIGIN when same-origin
// routing is unavailable.
export default defineConfig({
  plugins:[react()],
  server:{proxy:{'/api':{target:process.env.VITE_AGENT_PROXY_TARGET||'http://127.0.0.1:8789',changeOrigin:true}}},
});
