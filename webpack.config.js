const webpack = require('webpack');

module.exports = (config, options, targetOptions) => {
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/^crypto$/, 'crypto-browserify')
  );
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/^stream$/, 'readable-stream')
  );

  config.resolve.fallback = {
    process: require.resolve('process/browser'),
    util: require.resolve('util/'),
    assert: require.resolve('assert/'),
  };

  return config;
};
