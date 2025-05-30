import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from "rollup-plugin-typescript2";
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import fs from 'fs';

import pkg from "./package.json" with { type: "json" };

// Custom SVG processing plugin
function svgPlugin() {
  return {
    name: 'svg-processor',
    load(id) {
      if (id.endsWith('.svg')) {
        let svgContent = fs.readFileSync(id, 'utf8');

        // Clean SVG content by removing problematic elements
        svgContent = svgContent
          .replace(/<\?xml[^>]*\?>/g, '') // Remove XML declaration
          .replace(/<!DOCTYPE[^>]*>/g, '') // Remove DOCTYPE
          .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
          .trim();

        // Ensure we have a valid SVG element
        if (!svgContent.startsWith('<svg')) {
          throw new Error(`Invalid SVG file: ${id}`);
        }

        // Create a proper data URL
        const base64 = Buffer.from(svgContent).toString('base64');
        const dataUrl = `data:image/svg+xml;base64,${base64}`;

        return `export default "${dataUrl}";`;
      }
    }
  };
}

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: "auto",
      },
      {
        file: pkg.module,
        format: 'esm',
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve(),
      commonjs(),
      postcss({
        extract: 'ChessBoard.css',
        minimize: true,
      }),
      svgPlugin(),
      copy({
        targets: [
          { src: 'src/icons/*', dest: 'dist/icons' }
        ]
      }),
      typescript({ useTsconfigDeclarationDir: true, clean: true }),
    ],
    external: ['react', 'react-dom'],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    plugins: [
      peerDepsExternal(),
      postcss({
        inject: false,
        extract: false,
      }),
      svgPlugin(),
      dts({
        tsconfig: './tsconfig.json',
      }),
    ],
    external: ['react', 'react-dom'],
  },
];
