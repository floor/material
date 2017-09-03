// rollup.config.js
export default {
  entry: 'src/index.js',
  dest: 'bundle.js',
  format: 'cjs',
  external: ['moment'] // <-- suppresses the warning
};