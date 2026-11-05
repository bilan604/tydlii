import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { PRIVACY_URL, TERMS_URL } from "../../../shared/src/legal";
import { brand } from "../model";

export { PRIVACY_URL, TERMS_URL };

/**
 * Opens a live tydlii.com legal page in the in-app browser (Safari view / Custom Tab).
 * Falls back to the system browser if that view cannot open. The apps do not keep a copy of the policy.
 */
export async function openLegalUrl(url: string): Promise<void> {
  try {
    const result = await WebBrowser.openBrowserAsync(url, {
      toolbarColor: brand.ink,
      secondaryToolbarColor: brand.ink,
      controlsColor: brand.teal,
      showTitle: true,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
    if (result.type === WebBrowser.WebBrowserResultType.LOCKED) {
      await Linking.openURL(url);
    }
  } catch {
    await Linking.openURL(url);
  }
}
