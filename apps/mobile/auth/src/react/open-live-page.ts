import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

const INK = "#070707";
const TEAL = "#04a3ac";

/**
 * Opens a live tydlii.com page in the in-app browser (Safari sheet / Chrome custom tab).
 * Web and a failed sheet fall back to the system handler.
 */
export async function openLivePage(url: string): Promise<void> {
  if (Platform.OS === "web") {
    await Linking.openURL(url);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: TEAL,
      toolbarColor: INK,
      secondaryToolbarColor: INK,
      enableBarCollapsing: true,
      showTitle: true,
    });
  } catch {
    await Linking.openURL(url);
  }
}
