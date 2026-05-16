import * as CookieConsent from "vanilla-cookieconsent";

const STORAGE_KEY = "sstv-decoder-theme";

const themeBar = document.getElementById("theme-bar");
const btnSystem = document.getElementById("theme-btn-system");
const btnLight = document.getElementById("theme-btn-light");
const btnDark = document.getElementById("theme-btn-dark");
const buttons = [btnSystem, btnLight, btnDark];

function getStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "light") root.classList.add("light");
  else if (mode === "dark") root.classList.add("dark");

  themeBar.dataset.themeMode = mode;

  buttons.forEach((btn) => {
    const active = btn.dataset.themeValue === mode;
    btn.classList.toggle("theme-bar__btn--active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
    btn.tabIndex = active ? 0 : -1;
  });
}

function setTheme(mode) {
  if (CookieConsent.acceptedCategory("preferences")) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }
  applyTheme(mode);
}

function syncThemeWithConsent() {
  if (CookieConsent.acceptedCategory("preferences")) {
    applyTheme(getStored());
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  applyTheme("system");
}

export function onCookiePreferencesUpdated() {
  syncThemeWithConsent();
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.themeValue));
});

applyTheme("system");
