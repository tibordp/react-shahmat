import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import postcss from 'rollup-plugin-postcss';
import copy from 'rollup-plugin-copy';
import audiosprite from 'audiosprite';
import fs from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

import pkg from './package.json' with { type: 'json' };

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
    },
  };
}

export function audiospritePlugin(opts = {}) {
  return {
    name: 'audiosprite',
    async buildStart() {
      // audiosprite shells out to ffmpeg; fail with a clear message instead
      // of a bare "spawn ffmpeg ENOENT" deep in the build.
      try {
        execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
      } catch {
        throw new Error(
          'ffmpeg is required to build the sound sprite but was not found on PATH. ' +
            'Install it first (macOS: `brew install ffmpeg`, Debian/Ubuntu: `apt-get install ffmpeg`).'
        );
      }

      const oggs = fs
        .readdirSync('src/sounds')
        .filter(f => f.endsWith('.ogg'))
        .map(f => `src/sounds/${f}`);
      const tempDir = fs.mkdtempSync(`${tmpdir()}/audiosprite-`);

      const { resources, spritemap } = await new Promise((resolve, reject) =>
        audiosprite(
          oggs,
          {
            // opus+mp3 covers every modern browser. The opus export uses
            // libopus (present in all common ffmpeg builds), unlike the ogg
            // export which needs libvorbis (missing from e.g. Homebrew's
            // ffmpeg 8). The .opus file is an ogg container and is emitted
            // under the .ogg name the SoundManager expects.
            export: 'opus,mp3',
            bitrate: 56,
            output: `${tempDir}/chess_sfx`,
            samplerate: 44100,
            ...opts,
          },
          (err, result) => {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              resolve(result);
            }
          }
        )
      );

      for (const res of resources) {
        const buff = fs.readFileSync(res);
        const filename = res
          .split('/')
          .pop()
          .replace(/\.opus$/, '.ogg');
        this.emitFile({
          type: 'asset',
          fileName: `sounds/${filename}`,
          source: buff,
        });
      }

      // emit JSON map as an asset so it can be imported
      this.emitFile({
        type: 'asset',
        fileName: 'sounds/chess_sfx.json',
        source: JSON.stringify({ spritemap }, null, 2),
      });
    },
  };
}

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        exports: 'auto',
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
      audiospritePlugin(),
      postcss({
        modules: {
          generateScopedName: '[name]__[local]___[hash:base64:5]',
          localsConvention: 'camelCase',
        },
        minimize: true,
        inject: true,
      }),
      svgPlugin(),
      copy({
        targets: [{ src: 'src/icons/*', dest: 'dist/icons' }],
      }),
      // Declarations are not emitted here — the second config bundles all
      // types into dist/index.d.ts via rollup-plugin-dts, which is what the
      // package.json "types"/"exports" fields point at.
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: false,
          declarationDir: undefined,
          outDir: './dist',
        },
      }),
    ],
    // Runtime dependencies must NOT be bundled — consumers install them via
    // the "dependencies" field, and inlining them would ship react-dnd twice.
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-dnd',
      'react-dnd-touch-backend',
      'dnd-core',
    ],
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
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-dnd',
      'react-dnd-touch-backend',
      'dnd-core',
    ],
  },
];
