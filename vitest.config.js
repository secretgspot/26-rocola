import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, './src/lib')
		}
	},
	test: {
		environment: 'node',
		include: ['test/**/*.test.{js,mjs,ts}'],
		globals: true,
		threads: false // better-sqlite3 issues in threads sometimes
	}
});
