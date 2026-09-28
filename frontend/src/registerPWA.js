// Registra o PWA somente em produção. O desenvolvimento Vite continua normal.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registro) => {
      // Novas versões passam a valer no próximo carregamento da página.
      registro.update().catch(console.warn);
    }).catch((erro) => console.warn("PWA não registrado:", erro));
  });
}
