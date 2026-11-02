// Runs before the application and styles, including on a direct/reloaded route.
(() => {
  let preference = 'system';
  try {
    const saved = localStorage.getItem('zdaj-theme');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // A blocked preference store must not prevent opening the learning app.
  }
  const theme =
    preference === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#101419' : '#f5f5f7');
})();
