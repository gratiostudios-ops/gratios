const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);
// Shared response contracts live in backend/shared, outside Metro's project root.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../backend/shared')];
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((extension) => extension !== 'svg');
config.resolver.sourceExts.push('svg');
module.exports = config;
