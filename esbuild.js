import esbuild from 'esbuild'
import svg from 'esbuild-plugin-svg'

const outfile = `./dist/demo.js`

const option = {
  entryPoints: ['./dist/demo-bundle.js'],
  outfile,
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'iife',
  plugins: [svg()]
}

if (build.branch !== 'master') {
  option.sourcemap = true
}

esbuild
  .build(option)
  .catch(() => process.exit(1))
