# dev-dsue.de auf Railway

Ein Node-Server liefert die Website aus und stellt unter `/admin` das Postfach bereit.
Die Installer bleiben bei GitHub Releases.

## Einrichten
1. railway.com → **New Project** → **Deploy from GitHub repo** → `desuee/dsue-ebsite`.
2. Im Service unter **Variables**:
   - `ALLOWED_USERS` = `kontakt@dev-dsue.de`
   - `IMAP_HOST` = IMAP-Server deines Mail-Anbieters (Standard `dmail01.bero-host.de`, Port 993)
   - `SMTP_HOST` = SMTP-Server (Standard wie IMAP, Port 465)
3. **Settings → Networking → Custom Domain** → `www.dev-dsue.de`. Railway zeigt ein CNAME-Ziel an.
4. Beim Domain-Anbieter den CNAME-Eintrag `www` auf dieses Ziel ändern (statt `desuee.github.io`).
5. Wenn alles läuft: GitHub → Settings → Pages ausschalten.

Das Passwort des Postfachs wird nirgends gespeichert: Es wird beim Anmelden vom Mailserver geprüft
und nur verschlüsselt im Arbeitsspeicher gehalten, bis du dich abmeldest (oder nach 60 Minuten Inaktivität).

## Studio (/admin/studio): Changelogs und Downloads
Mit demselben Login wie das Postfach. Damit Änderungen dauerhaft bleiben, schreibt das Studio direkt nach GitHub:
Changelogs und Versionen als `data/*.json` ins Repository, Programmdateien ins neueste GitHub-Release.
- Variable `GITHUB_TOKEN` = Fine-grained Token (github.com → Settings → Developer settings → Fine-grained tokens),
  nur für das Repository `desuee/dev-dsue-website`, Berechtigung **Contents: Read and write**.
- Ohne Token kann man im Studio alles ansehen, aber nichts veröffentlichen.

## Beta-Bereich (/beta): Login mit Discord, private Downloads
Beta-Tester melden sich mit Discord an. Wer auf dem AERA-Server eine der Rollen in `BETA_ROLE_IDS` hat, sieht den
neuesten Build. Die Installer liegen als Releases im **privaten** Repository `desuee/aera-beta`; der Server reicht sie
nur an angemeldete Tester weiter.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` – Discord Developer Portal → deine App → OAuth2
- Redirect im Portal eintragen: `https://www.dev-dsue.de/beta/callback`
- `DISCORD_GUILD_ID` – ID des AERA-Servers
- `BETA_ROLE_IDS` – IDs der Rollen Beta Tester und Developer, mit Komma getrennt
- `BETA_GITHUB_TOKEN` – Fine-grained Token, nur `desuee/aera-beta`, **Contents: Read-only**
- optional `PUBLIC_URL` (Standard `https://www.dev-dsue.de`), `SESSION_DAYS` (Standard 7)

Neuen Build veröffentlichen: github.com/desuee/aera-beta → Releases → Draft a new release → Tag z. B. `v0.9.3`,
Titel, Text („Was ist neu“), Exe reinziehen → Publish. Die Seite zeigt ihn sofort (spätestens nach 1 Minute).
