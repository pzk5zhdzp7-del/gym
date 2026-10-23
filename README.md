# Gym – persönlicher Trainingsplan fürs Fitnessstudio

Eine Web-App (PWA) fürs iPhone, die sich wie eine normale App auf den Home-Bildschirm legen lässt. Ohne App Store, ohne Mac, ohne Account. Alle Daten bleiben auf dem Gerät.

## Funktionen

**Training**
- **Fester Plan** aus vier Einheiten im Wechsel: Unterkörper A (Po-Fokus), Oberkörper A, Unterkörper B (Beine), Oberkörper B. Passt zu 2–3 Trainings pro Woche, verpasste Tage verschieben einfach die Reihenfolge.
- **Periodisierung**: Zyklen aus 6 Wochen – 3× Aufbau, 2× Kraft, 1× Deload – mit Kalenderansicht
- **Gewichte steigen automatisch** (Doppelprogression): In allen Sätzen das obere Ende geschafft → nächstes Mal mehr Gewicht. Zweimal deutlich zu schwer → etwas leichter. Beim Phasenwechsel wird das Gewicht über die geschätzte Maximalkraft umgerechnet.
- **Anleitung zu jeder Übung**: Einstellen am Gerät, Ausführung Schritt für Schritt, typische Fehler, Tipp, Muskelgrafik (vorne/hinten) und Link zu Videos
- **Eigene Übungen** mit eigener Anleitung: als Variante wählbar oder fest in einer Einheit eingeplant
- **Alternativen** für jeden Platz im Plan (z. B. wenn ein Gerät fehlt oder belegt ist)
- **Geführter Player**: Aufwärmen, Aufwärmsatz, Pausen-Countdown, Gewicht und Wiederholungen eintragen, Stoppuhr für Halteübungen, Signaltöne, Sprachansage, Dehnen zum Schluss, optional Cardio
- **Fortschritt**: Sätze und bewegte Kilos pro Woche, Gewichte je Übung, Steigerungen, Bestleistungen, Körpergewicht und Körpermaße
- **Muskelkater** je Muskelpartie eintragen (leicht, mittel, stark) über eine antippbare Muskelgrafik. Er wird jeden Tag eine Stufe schwächer. Ab mittlerem Muskelkater fallen Übungen für diese Muskeln aus dem Training (in der Gym-App wird wenn möglich eine andere Variante ohne diese Muskeln gewählt), bei leichtem gibt es einen Hinweis

**Ernährung**
- Kalorien- und Eiweißziel aus Körperdaten, Wochenplan mit Rezepten, Portionen automatisch angepasst, Gerichte tauschbar, vegetarisch und Reste-Modus optional
- Alle Rezepte zum Durchblättern, einzeln an- und abwählbar, Gericht für eine Mahlzeit selbst aussuchen
- Eigene Rezepte und Zutaten (bei gemeinsamem Plan in beiden Apps sichtbar)
- Einkaufsliste aus dem Wochenplan, nach Abteilungen sortiert, mit eigenen Einträgen
- „Auswärts gegessen“: Essen fotografieren, Claude schätzt kcal, Eiweiß, Kohlenhydrate und Fett, Werte prüfen und für den Tag eintragen (zusätzlich oder statt einer geplanten Mahlzeit). Ohne Schlüssel über die Claude-App (Teilen und Antwort einfügen), mit eigenem API-Schlüssel direkt in der App
- „Anderes Training“: Fußball, Joggen & Co. in eigenen Worten beschreiben, Claude macht daraus Einträge (Dauer, Intensität, Mehrverbrauch, Belastung je Körperbereich) und einen Tipp fürs nächste Training. Die Einträge stehen im Kalender und im Verlauf, der Mehrverbrauch erhöht das Kalorienziel des Tages. Läuft über die Claude-App (Teilen und Antwort einfügen), mit dem API-Schlüssel aus „Auswärts gegessen“ auch direkt

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
| `js/recipes.js` | Eigene Rezepte und Zutaten, Rezepte an/aus |
| `js/custom.js` | Eigene Übungen |
| `js/views/*.js` | Ansichten (Heute, Plan, Übungen, Fortschritt, Essen, Profil, Player) |
| `js/app.js` | Navigation und Ereignisse |
| `sw.js` | Offline-Cache (bei Änderungen `VERSION` erhöhen) |
