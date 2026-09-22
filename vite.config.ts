import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const appVersion = '1.0.0';
    const buildTimestamp = new Date().toISOString();
    const buildHash = process.env.COMMIT_REF?.substring(0, 7) || process.env.DEPLOY_ID || Math.random().toString(36).substring(2, 9);

    const netlifyVersionPlugin = {
      name: 'netlify-version-generator',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({
            version: appVersion,
            buildTimestamp,
            buildHash,
            deployUrl: process.env.URL || null,
            environment: process.env.CONTEXT || mode
          }, null, 2)
        });
      }
    };

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
        cors: true,
        allowedHosts: true,
      },
      preview: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: true,
        cors: true,
        allowedHosts: true,
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
          manifest: {
            id: '/',
            name: 'Merl Magic',
            short_name: 'Merl',
            description: '3D Stage Structure Designer',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          },
          devOptions: {
            enabled: true,
            type: 'module',
          },
        }),
        netlifyVersionPlugin
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__APP_VERSION__': JSON.stringify(appVersion),
        '__BUILD_TIMESTAMP__': JSON.stringify(buildTimestamp),
        '__BUILD_HASH__': JSON.stringify(buildHash)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              three: ['three', '@react-three/fiber', '@react-three/drei']
            }
          }
        }
      }
    };
});
