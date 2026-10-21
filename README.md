# Gym – persönlicher Trainingsplan fürs Fitnessstudio

Eine Web-App (PWA) fürs iPhone, die sich wie eine normale App auf den Home-Bildschirm legen lässt. Ohne App Store, ohne Mac, ohne Account. Alle Daten bleiben auf dem Gerät.

## Funktionen

**Training**
- **Fester Plan** aus vier Einheiten im Wechsel: Unterkörper A (Po-Fokus), Oberkörper A, Unterkörper B (Beine), Oberkörper B. Passt zu 2–3 Trainings pro Woche, verpasste Tage verschieben einfach die Reihenfolge.
- **Periodisierung**: Zyklen aus 6 Wochen – 3× Aufbau, 2× Kraft, 1× Deload – mit Kalenderansicht
- **Gewichte steigen automatisch** (Doppelprogression): In allen Sätzen das obere Ende geschafft → nächstes Mal mehr Gewicht. Zweimal deutlich zu schwer → etwas leichter. Beim Phasenwechsel wird das Gewicht über die geschätzte Maximalkraft umgerechnet.
- **Anleitung zu jeder Übung**: Einstellen am Gerät, Ausführung Schritt für Schritt, typische Fehler, Tipp, Muskelgrafik (vorne/hinten) und Link zu Videos
- **Alternativen** für jeden Platz im Plan (z. B. wenn ein Gerät fehlt oder belegt ist)
- **Geführter Player**: Aufwärmen, Aufwärmsatz, Pausen-Countdown, Gewicht und Wiederholungen eintragen, Stoppuhr für Halteübungen, Signaltöne, Sprachansage, Dehnen zum Schluss, optional Cardio
- **Fortschritt**: Sätze und bewegte Kilos pro Woche, Gewichte je Übung, Steigerungen, Bestleistungen, Körpergewicht und Körpermaße

**Ernährung**
- Kalorien- und Eiweißziel aus Körperdaten, Wochenplan mit Rezepten, Portionen automatisch angepasst, Gerichte tauschbar, vegetarisch und Reste-Modus optional
- Einkaufsliste aus dem Wochenplan, nach Abteilungen sortiert, mit eigenen Einträgen

Offline nutzbar, Hell- und Dunkelmodus, Backup als JSON.

## Aufs iPhone bringen (GitHub Pages)

1. Auf GitHub im Repo: **Settings → Pages → Build and deployment**: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`, speichern.
2. Nach ein bis zwei Minuten läuft die App unter `https://<benutzername>.github.io/gym/`.
3. Die Adresse in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**.

## Lokal testen

```sh
npx http-server -c-1 .
```

## Struktur

| Datei | Inhalt |
| --- | --- |
| `js/data/exercises.js` | Übungen mit Anleitungen, Trainingseinheiten und Varianten, Aufwärmen |
| `js/data/mobility.js` | Dehnübungen |
| `js/data/food.js` | Zutaten mit Nährwerten, Rezepte |
| `js/training.js` | Periodisierung, Gewichte und Satz-Ziele, Workout erstellen und auswerten, Statistik, Kalender |
| `js/body.js` | Muskelgrafik |
| `js/nutrition.js` | Kalorienbedarf, Wochenplan, Einkaufsliste |
| `js/views/*.js` | Ansichten (Heute, Plan, Übungen, Fortschritt, Essen, Profil, Player) |
| `js/app.js` | Navigation und Ereignisse |
| `sw.js` | Offline-Cache (bei Änderungen `VERSION` erhöhen) |
