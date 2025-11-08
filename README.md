# newplayer-prox (fixed)

Player HLS minimal sans contournement CORS. Le navigateur ne lit que `data/latest.json` (même origine).
- Coller une URL m3u8 dans l'input puis **Lire**.
- Option **Suivre automatiquement** `data/latest.json` toutes les `Polling (ms)`.
- **Enregistrer config locale** persiste AUTO_TRACK et Polling (localStorage).
- **Réinitialiser** efface la config locale.

## Démarrage
1. Placer une URL dans `data/latest.json` : `{ "m3u8": "https://...m3u8?token=..." }`
2. Ouvrir `index.html` via Pages ou serveur statique.
