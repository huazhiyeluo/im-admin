
import { resolve } from 'path';
import { defineConfig,loadEnv,ConfigEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const pathResolve = (dir: string): any => {
	return resolve(__dirname, '.', dir);
};

const alias: Record<string, string> = {
	'@': pathResolve('./src/'),
};

// https://vitejs.dev/config/
const viteConfig = defineConfig((mode: ConfigEnv) => {
  const env = loadEnv(mode.mode, process.cwd());
  const a = {
    plugins: [
      vue(),
    ],
    root: process.cwd(),
    resolve: {
      alias: alias
    },
    base: mode.command === 'serve' ? './' : env.VITE_PUBLIC_PATH,
    build: {
      outDir: 'public',
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8081/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      }
    }
  }
  console.log(a)
  return a
})


export default viteConfig;