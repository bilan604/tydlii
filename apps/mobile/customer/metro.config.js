const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const quotePackage = path.resolve(projectRoot, "../../../packages/quote");
const authPackage = path.resolve(projectRoot, "../auth");
const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.resolve(projectRoot, "../shared"), quotePackage, authPackage];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  ...(config.resolver.nodeModulesPaths ?? []),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@tydlii/quote": quotePackage,
  expo: path.resolve(projectRoot, "node_modules/expo"),
  "expo-apple-authentication": path.resolve(projectRoot, "node_modules/expo-apple-authentication"),
  "expo-constants": path.resolve(projectRoot, "node_modules/expo-constants"),
  "expo-web-browser": path.resolve(projectRoot, "node_modules/expo-web-browser"),
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

module.exports = config;
