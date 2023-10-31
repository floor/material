import esbuild from 'esbuild'
import svg from 'esbuild-plugin-svg'
import { livereloadPlugin } from '@jgoz/esbuild-plugin-livereload'

esbuild
  .build({
    entryPoints: ['./dist/demo.js'],
    outfile: './dist/demo-bundle.js',
    bundle: true,
    format: 'iife',
    minify: false,
    sourcemap: true,
    plugins: [svg() /*, livereloadPlugin() */],
    watch: {
      onRebuild (error, result) {
        if (error) console.error('watch build failed:', error)
        else {
          console.log('watch build succeeded:', result)
          // HERE: somehow restart the server from here, e.g., by sending a signal that you trap and react to inside the server.
        }
      }
    }
  }).then(result => {
    console.log('watching...')
  })
