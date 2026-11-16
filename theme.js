(() => {
  const storageKey = "personal-channel-theme";
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const normalize = (value) =>
    value === "light" || value === "dark" ? value : "system";
  let storage = null;
  let preference = "system";
  let select = null;

  try {
    storage = window.localStorage;
    preference = normalize(storage.getItem(storageKey));
  } catch {
    // Restricted storage still allows theme changes for this page visit.
  }

  function applyTheme() {
    const resolved =
      preference === "system"
        ? systemTheme.matches
          ? "dark"
          : "light"
        : preference;
    root.dataset.theme = resolved;
    root.dataset.themeMode = preference;
    themeColor?.setAttribute(
      "content",
      resolved === "dark" ? "#191b18" : "#f0f0e9",
    );
    if (select) select.value = preference;
  }

  // This script runs before the stylesheets to avoid a wrong-theme first frame.
  applyTheme();

  systemTheme.addEventListener("change", () => {
    if (preference === "system") applyTheme();
  });
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== storage) return;
    if (event.key !== storageKey && event.key !== null) return;
    preference = normalize(event.newValue);
    applyTheme();
  });

  function connectThemeControl() {
    select = document.getElementById("theme-select");
    if (!select) return;
    select.value = preference;
    select.disabled = false;
    select.addEventListener("change", () => {
      preference = normalize(select.value);
      applyTheme();
      try {
        storage?.setItem(storageKey, preference);
      } catch {
        // A denied write must not prevent the selected theme from applying.
      }
    });
    root.classList.add("theme-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connectThemeControl, {
      once: true,
    });
  } else {
    connectThemeControl();
  }
})();
