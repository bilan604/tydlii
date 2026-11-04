const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const quotePackage = path.resolve(projectRoot, "../../../packages/quote");
const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.resolve(projectRoot, "../shared"), quotePackage];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@tydlii/quote": quotePackage,
};

module.exports = config;
