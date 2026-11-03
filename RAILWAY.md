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
