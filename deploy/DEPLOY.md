# Hometracker VPS Deployment Guide

## Voraussetzungen
- Ubuntu/Debian VPS mit root-Zugang
- Node.js 20+ installiert (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`)
- Nginx installiert
- Git installiert
- Certbot für SSL (`apt install certbot python3-certbot-nginx`)

## 1. User erstellen (ohne Passwort)

```bash
# User erstellen (ohne Home-Verzeichnis, da wir /var/www nutzen)
sudo useradd -r -s /bin/bash hometracker

# Verzeichnisstruktur anlegen
sudo mkdir -p /var/www/hometracker/data
sudo chown -R hometracker:hometracker /var/www/hometracker
```

## 2. Repository klonen

```bash
sudo -u hometracker git clone https://github.com/ctcoding/hometracker.git /var/www/hometracker
```

## 3. Datenbank hochladen

Die SQLite-Datenbank muss separat hochgeladen werden (nicht im Git):
```bash
# Auf dem lokalen Mac (diesen Befehl anpassen):
scp /Users/christian/Apps/haustracker/server/data/haustracker.db user@vps:/tmp/

# Auf dem VPS:
sudo mv /tmp/haustracker.db /var/www/hometracker/data/
sudo chown hometracker:hometracker /var/www/hometracker/data/haustracker.db
```

## 4. Dependencies installieren & Build

```bash
cd /var/www/hometracker

# Frontend build
sudo -u hometracker npm install
sudo -u hometracker npm run build

# Backend build
cd /var/www/hometracker/server
sudo -u hometracker npm install
sudo -u hometracker npm run build
```

## 5. Systemd Service einrichten

```bash
# Service-Datei kopieren
sudo cp /var/www/hometracker/deploy/hometracker.service /etc/systemd/system/

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable hometracker
sudo systemctl start hometracker

# Status prüfen
sudo systemctl status hometracker
```

## 6. Nginx konfigurieren

```bash
# Config kopieren (erstmal ohne SSL)
sudo cp /var/www/hometracker/deploy/nginx-hometracker.conf /etc/nginx/sites-available/hometracker

# Erstmal nur HTTP aktivieren (für Certbot):
# Editiere /etc/nginx/sites-available/hometracker und kommentiere den SSL-Block aus

# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/hometracker /etc/nginx/sites-enabled/

# Nginx testen und neu laden
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL-Zertifikat mit Certbot

```bash
sudo certbot --nginx -d hometracker.tiehs.de
```

Certbot aktualisiert die Nginx-Config automatisch mit den SSL-Einstellungen.

## 8. Firewall (falls UFW aktiv)

```bash
sudo ufw allow 'Nginx Full'
```

## 9. Testen

```bash
# Backend direkt testen
curl http://localhost:3331/api/readings | head

# Frontend testen
curl -I https://hometracker.tiehs.de
```

---

## Nützliche Befehle

```bash
# Logs anzeigen
sudo journalctl -u hometracker -f

# Service neustarten
sudo systemctl restart hometracker

# App aktualisieren
cd /var/www/hometracker
sudo -u hometracker git pull
sudo -u hometracker npm install
sudo -u hometracker npm run build
cd server
sudo -u hometracker npm install
sudo -u hometracker npm run build
sudo systemctl restart hometracker
```

## Datenbank Backup

```bash
# Backup erstellen (auf VPS)
sudo -u hometracker cp /var/www/hometracker/data/haustracker.db /var/www/hometracker/data/haustracker.db.backup-$(date +%Y%m%d)

# Backup herunterladen (auf lokalem Mac)
scp user@vps:/var/www/hometracker/data/haustracker.db ./backup-haustracker.db
```

---

## Prompt für Claude auf dem VPS

Kopiere diesen Prompt in Claude Code auf dem VPS:

```
Ich möchte die Hometracker-App deployen. Das Repository ist bereits geklont unter /var/www/hometracker.

Bitte führe folgende Schritte aus:
1. Erstelle den User "hometracker" ohne Passwort (sudo useradd -r -s /bin/bash hometracker)
2. Setze die Berechtigungen: sudo chown -R hometracker:hometracker /var/www/hometracker
3. Installiere die Dependencies und erstelle den Production Build (Frontend + Backend)
4. Richte den Systemd-Service ein: sudo cp /var/www/hometracker/deploy/hometracker.service /etc/systemd/system/
5. Konfiguriere Nginx für hometracker.tiehs.de mit SSL via Certbot
6. Starte alle Services und verifiziere, dass alles läuft

Die SQLite-Datenbank liegt unter /var/www/hometracker/data/haustracker.db (wurde separat hochgeladen).
Der Backend-Server soll auf Port 3331 laufen.
```
