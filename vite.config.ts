import {defineConfig} from 'vite';
export default defineConfig({build:{target:'es2022',rollupOptions:{input:{creator:'index.html',viewer:'viewer.html'}}}});
