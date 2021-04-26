const webpack = require('webpack');

module.exports = (config, options, targetOptions) => {
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^crypto$/, 'crypto-browserify'));
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^stream$/, 'readable-stream'));

  return config;
};
