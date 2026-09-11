export const registerPWA = () => {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability still works from the manifest even if registration is blocked.
    });
  });
};
