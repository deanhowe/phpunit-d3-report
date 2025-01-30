import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from "vite-plugin-singlefile"
import { createHtmlPlugin } from 'vite-plugin-html'
import terser from '@rollup/plugin-terser';

export default defineConfig({
    publicDir: 'resources',
    build: {
        outDir: 'public',
        },
    watch: {
        include: './src/**'
    },
    plugins: [
        tailwindcss(),
        viteSingleFile(),
        createHtmlPlugin({
            minify: true,
        }),
        terser({
            output: {
                comments: false,
            },
        })
    ],
})