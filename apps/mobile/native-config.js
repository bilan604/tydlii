/**
 * Expo evaluates this file from app.config.ts with Node, so it stays plain JavaScript.
 * A project UUID is copied from EXPO_PUBLIC_EAS_PROJECT_ID or from an id already in the config.
 * Anything else is left unset. This does not submit to a store.
 */

const APPLE_AUTH_PLUGIN = "expo-apple-authentication";
const PROJECT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOOGLE_CLIENT_ID = /^([0-9]+-[0-9A-Za-z_-]+)\.apps\.googleusercontent\.com$/;

function readProjectId(value) {
  const id = typeof value === "string" ? value.trim() : "";
  return PROJECT_UUID.test(id) ? id : null;
}

function googleReversedScheme(clientId) {
  const match = GOOGLE_CLIENT_ID.exec(typeof clientId === "string" ? clientId.trim() : "");
  if (!match || !match[1]) return null;
  return `com.googleusercontent.apps.${match[1]}`;
}

function schemeList(scheme) {
  if (typeof scheme === "string" && scheme.trim()) return [scheme.trim()];
  if (!Array.isArray(scheme)) return [];
  return scheme.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function hasApplePlugin(plugins) {
  return (plugins ?? []).some(
    (plugin) => plugin === APPLE_AUTH_PLUGIN || (Array.isArray(plugin) && plugin[0] === APPLE_AUTH_PLUGIN),
  );
}

function extraWithProject(extra, projectId) {
  if (projectId) return { ...extra, eas: { ...extra?.eas, projectId } };
  if (!extra?.eas || !Object.prototype.hasOwnProperty.call(extra.eas, "projectId")) return extra;
  const easRest = { ...extra.eas };
  delete easRest.projectId;
  const rest = { ...extra };
  delete rest.eas;
  if (Object.keys(easRest).length > 0) return { ...rest, eas: easRest };
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function applyTydliiNativeConfig(config, env) {
  const fromEnv = readProjectId(env.EXPO_PUBLIC_EAS_PROJECT_ID);
  const existing = config.extra?.eas?.projectId;
  const fromFile = readProjectId(typeof existing === "string" ? existing : undefined);
  const projectId = fromEnv ?? fromFile;

  const schemes = new Set(schemeList(config.scheme));
  for (const name of ["EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"]) {
    const reversed = googleReversedScheme(env[name]);
    if (reversed) schemes.add(reversed);
  }
  const scheme = schemes.size <= 1 ? ([...schemes][0] ?? config.scheme) : [...schemes];

  const plugins = [...(config.plugins ?? [])];
  if (!hasApplePlugin(plugins)) plugins.push(APPLE_AUTH_PLUGIN);

  return {
    ...config,
    scheme,
    ios: { ...config.ios, usesAppleSignIn: true },
    plugins,
    extra: extraWithProject(config.extra, projectId),
  };
}

module.exports = { applyTydliiNativeConfig };
