import {defineConfig} from "vite";
import { fileURLToPath } from 'url';
import fs from 'fs';
//import {cjsToEsm, cjsToEsmTransformer} from "cjstoesm";

export default defineConfig({
    build: {
        ssr: true,
        target: 'node18.13',
        rollupOptions: {
            watch: {
                include: 'src/**',
            },
            external: [
                'readline',
                'path',
                'fs',
                'util',
                'url',
                'assert',
                'y18n',
                '#ansi-styles',
                '#supports-color',
                'child_process',
                'https',
                'http',
                'fs/promises',
                'os'
            ],
            input: {
                entry: fileURLToPath(new URL('./src/main.js', import.meta.url))
            },
            output: {
                assetFileNames: '[name].[ext]',
                entryFileNames: 'extensio.js',
                manualChunks: undefined,
                dir: './scripts'
            },
            plugins: [
                //commonjs(),
                {
                    name: 'postbuild-commands',
/*                    transform: (code) => {
                        return {
                            code: cjsToEsmTransformer()(code)
                        };
                    },*/
                    closeBundle: async () => {
                        fs
                            .writeFileSync(
                                './scripts/extensio.js',
                                '#!/usr/bin/env node\n' +
                                fs.readFileSync('./scripts/extensio.js', 'utf8'),
                                'utf8'
                            );
                    }
                },
            ]
        },
        cssCodeSplit: false,
        chunkSizeWarningLimit: 60000
    }
});