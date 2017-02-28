'use strict';

var webpack = require('webpack');

//var prod = process.argv.indexOf('-p') !== -1;


module.exports = {
  context: __dirname + '/lib',

  entry: 'index.js',

  output: {
    path: 'dist/',
    filename: 'material.js',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },

  //devtool: (prod ? undefined : 'eval-source-map'),

  plugins: [
    //new webpack.optimize.UglifyJsPlugin(),
    //new webpack.HotModuleReplacementPlugin(),
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'index',
    //   filename: 'index.js',
    //   //minChunks: Infinity,
    //   //chunks: chunks,
    // })

  ],

  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: __dirname + '/node_modules',
      include: __dirname + '/lib',
      query: { presets: ['es2015'] }
    }]
  },

  //debug: true,
  //devtool: 'eval',

  resolve: {
    modulesDirectories: ['node_modules', 'lib'],
    extensions: ['.js', '']
  }
};
