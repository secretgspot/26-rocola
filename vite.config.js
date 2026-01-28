import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	server: {
		proxy: {
			'/ws': {
				target: 'ws://127.0.0.1:6789',
				ws: true,
				changeOrigin: true
			}
		}
	}
});
