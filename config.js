// Configuration du player (modulable via localStorage et UI)
// Aucune URL absolue imposée. Même origine uniquement.
window.PLAYER_CONFIG = {
  DEFAULT_M3U8: "",                  // Optionnel: URL secours au démarrage
  DATA_PATH: "data/latest.json",     // Source de vérité pour l'auto-track
  POLL_MS: 20000,                    // Poll par défaut
  AUTO_TRACK: true                   // Active la surveillance latest.json
};
