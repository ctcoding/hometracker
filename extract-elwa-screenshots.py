#!/usr/bin/env python3
"""
Extrahiert ELWA-Daten aus Screenshots der my-PV Diagramme.
Verwendet die Anthropic Claude API zur Bildanalyse.
"""

import os
import base64
import json
import re
from pathlib import Path
from anthropic import Anthropic

# API Key aus Umgebungsvariable
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def encode_image(image_path):
    """Kodiert ein Bild als Base64."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

def analyze_screenshot(image_path, month, year):
    """
    Analysiert einen Screenshot und extrahiert die täglichen Energie- und Temperaturwerte.
    """
    print(f"Analysiere {image_path.name}...", flush=True)

    # Bild kodieren
    image_data = encode_image(image_path)

    # Prompt für Claude
    prompt = f"""Analysiere dieses ELWA-Energiediagramm für {month}/{year}.

Das Diagramm zeigt:
- Grüne Balken: Tägliche Energie in kWh (Y-Achse links)
- Rote durchgezogene Linie: Temperatur 1 in °C (Y-Achse rechts)
- Rote gestrichelte Linie: Temperatur 2 in °C (Y-Achse rechts)
- X-Achse: Tage des Monats (1-31)

Bitte extrahiere für JEDEN Tag des Monats folgende Werte:
- Energie in kWh (Höhe des grünen Balkens, auf 0.5 kWh genau)
- Temperatur 1 in °C (Position der durchgezogenen roten Linie, auf 2°C genau)
- Temperatur 2 in °C (Position der gestrichelten roten Linie, auf 2°C genau)

Wenn für einen Tag kein Balken sichtbar ist, verwende 0.0 für die Energie.
Wenn keine Temperaturlinie sichtbar ist, verwende null.

Gib die Daten im folgenden JSON-Format zurück (ein Objekt pro Tag):
```json
[
  {{"day": 1, "energy_kwh": 3.0, "temp1": 52, "temp2": 55}},
  {{"day": 2, "energy_kwh": 2.5, "temp1": 50, "temp2": 54}},
  ...
]
```

Wichtig: Sei so genau wie möglich beim Ablesen der Werte aus dem Diagramm. Gib nur das JSON-Array zurück, keine zusätzlichen Erklärungen."""

    # API-Aufruf
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ],
            }
        ],
    )

    # Antwort verarbeiten
    response_text = message.content[0].text

    # JSON extrahieren
    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
    if json_match:
        data = json.loads(json_match.group(0))
        return data
    else:
        print(f"Fehler: Konnte JSON nicht aus Antwort extrahieren")
        print(f"Antwort: {response_text}")
        return []

def generate_sql_inserts(data, date_prefix):
    """
    Generiert SQL INSERT-Statements aus den extrahierten Daten.
    """
    sql_statements = []

    for day_data in data:
        day = day_data['day']
        energy = day_data['energy_kwh']
        temp1 = day_data.get('temp1')
        temp2 = day_data.get('temp2')

        # Datum formatieren
        date = f"{date_prefix}-{day:02d}"

        # NULL für fehlende Temperaturen
        temp1_str = str(temp1) if temp1 is not None else 'NULL'
        temp2_str = str(temp2) if temp2 is not None else 'NULL'

        # SQL generieren
        sql = f"INSERT OR REPLACE INTO elwaReadings (date, energyKwh, temp1, temp2, source) VALUES ('{date}', {energy}, {temp1_str}, {temp2_str}, 'screenshot');"
        sql_statements.append(sql)

    return sql_statements

def main():
    # Screenshot-Verzeichnis
    screenshots_dir = Path(__file__).parent / "docs" / "elwa-screenshots"

    # Alle PNG-Dateien finden
    screenshot_files = sorted(screenshots_dir.glob("*.png"))

    print(f"Gefunden: {len(screenshot_files)} Screenshots", flush=True)
    print()

    all_sql = []

    # Jeden Screenshot verarbeiten
    for screenshot_path in screenshot_files:
        # Monat und Jahr aus Dateinamen extrahieren
        # Format: mypv-1601502406190027-2025-02.png
        match = re.search(r'-(\d{4})-(\d{2})\.png$', screenshot_path.name)
        if not match:
            print(f"Überspringe {screenshot_path.name} (ungültiges Format)")
            continue

        year = match.group(1)
        month = match.group(2)
        date_prefix = f"{year}-{month}"

        # Screenshot analysieren
        try:
            data = analyze_screenshot(screenshot_path, month, year)

            if data:
                # SQL generieren
                sql_statements = generate_sql_inserts(data, date_prefix)
                all_sql.extend(sql_statements)
                print(f"✓ {len(data)} Tage extrahiert für {month}/{year}")
            else:
                print(f"✗ Keine Daten extrahiert für {month}/{year}")
        except Exception as e:
            print(f"✗ Fehler bei {screenshot_path.name}: {e}")

        print()

    # SQL ausgeben
    print("\n-- SQL INSERT-Statements --\n")
    for sql in all_sql:
        print(sql)

    print(f"\nInsgesamt {len(all_sql)} Einträge generiert")

if __name__ == "__main__":
    main()
