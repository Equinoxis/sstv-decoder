import { run } from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { getAnalyticsCategory } from "./analyticsConsent.js";
import { onCookiePreferencesUpdated } from "./theme.js";

export function initCookieConsent() {
  return run({
    mode: "opt-out",
    revision: 2,
    cookie: {
      name: "cc_cookie",
      expiresAfterDays: 182,
      sameSite: "Lax",
    },
    guiOptions: {
      consentModal: {
        layout: "cloud inline",
        position: "bottom center",
        equalWeightButtons: true,
      },
      preferencesModal: {
        layout: "box",
        equalWeightButtons: true,
      },
    },
    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      preferences: {},
      analytics: getAnalyticsCategory(),
    },
    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "Cookies on this site",
            description:
              "We use cookies to remember your consent and, if you allow it, your theme (light/dark). Analytics (Google Tag Manager, Microsoft Clarity) run by default; you can turn them off in preferences. All decoding stays in your browser.",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            showPreferencesBtn: "Manage preferences",
          },
          preferencesModal: {
            title: "Cookie preferences",
            serviceCounterLabel: "Services",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            savePreferencesBtn: "Save selection",
            closeIconLabel: "Close",
            sections: [
              {
                title: "Your privacy",
                description:
                  "This tool runs in your browser. You can change these settings at any time using “Cookie settings” in the footer.",
              },
              {
                title: "Strictly necessary",
                description:
                  "Required to store your consent and to show this banner appropriately. These cannot be turned off.",
                linkedCategory: "necessary",
              },
              {
                title: "Preferences",
                description:
                  "Lets us save your theme choice (system / light / dark) in your browser so it persists when you return.",
                linkedCategory: "preferences",
              },
              {
                title: "Analytics and measurement",
                description:
                  "Google Tag Manager and Microsoft Clarity for usage measurement. Enabled by default; turning this off clears related cookies and reloads the page.",
                linkedCategory: "analytics",
              },
            ],
          },
        },
      },
    },
    onConsent: onCookiePreferencesUpdated,
    onChange: onCookiePreferencesUpdated,
  });
}
