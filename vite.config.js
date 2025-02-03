import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from "vite-plugin-singlefile"
import { createHtmlPlugin } from 'vite-plugin-html'
import terser from '@rollup/plugin-terser';


export default ({ mode }) => {
    process.env = {...process.env, ...loadEnv(mode, process.cwd())};

    const isProduction = process.env.VITE_NODE_ENV === 'production';

    return defineConfig({
        publicDir: 'resources',
        build: {
            outDir: process.env.VITE_OUT_DIR ?? 'docs',
            rollupOptions: {
                input: process.env.VITE_OUT_DIR ? 'PHPUnitBubbleReport.html' : 'index.html', // Change this to your new start file
            },

        },
        watch: {
            include: './src/**'
        },
        plugins: [
            tailwindcss(),
            viteSingleFile(),
            createHtmlPlugin({
                minify: isProduction,
            }),
            terser({
                output: {
                    comments: isProduction,
                },
            })
        ],
    })
}