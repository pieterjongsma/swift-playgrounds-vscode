'use strict';

const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const extensionConfig = {
  target: 'node',
  entry: {
    extension: './src/extension.ts',
    playground: './src/tools',
    test_playgrounds: './src/test/playgrounds'
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin({})
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'template.playground/**/*', to: '', context: 'src' }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.swift$/,
        exclude: /node_modules/,
        type: 'asset/resource'
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          { loader: 'ts-loader' }
        ]
      }
    ]
  }
};

module.exports = [ extensionConfig ]
