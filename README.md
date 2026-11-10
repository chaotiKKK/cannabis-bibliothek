# Cannabis Bibliothek

Offline-Windows-App (Electron) mit einer kuratierten Datenbank bekannter Cannabis-Sorten:
Wirkungsprofile, Terpene, Cannabinoide, Anbaudaten, Abstammung, medizinische Anwendungen –
dargestellt in Karten, Detailansichten, Vergleichsmodus, Statistik-Charts und einem Wirkungs-Finder.

## Starten

```bash
npm install      # einmalig
npm start        # startet die Desktop-App
```

## Windows-Build (portable .exe)

```bash
npm run build
```

Ergebnis: `release/Cannabis-Bibliothek-win32-x64/Cannabis-Bibliothek.exe`
(kein Installer, kein Code-Signing – einfach starten oder verknüpfen).

## Android-APK

Die Oberfläche läuft unverändert in einer Capacitor-WebView – kein Electron auf Android.

Voraussetzungen: JDK 21 und Android SDK (Platform 36, Build-Tools 36).

```bash
npm run android:sync   # Web-Assets in das Android-Projekt kopieren
npm run android:apk    # APK bauen
```

Ergebnis: `android/app/build/outputs/apk/debug/app-debug.apk`
(debug-signiert und direkt installierbar; für den Play Store wäre ein eigener Release-Key nötig).

## Aufbau

```
main.js          Electron-Hauptprozess (Fenster, Sicherheit, externe Links)
src/index.html   App-Gerüst, Sidebar-Navigation, Footer-Hinweis
src/styles.css   Design (dunkles „Budtender“-Theme), Layout, Charts-Optik
src/data.js      Strain-Datenbank + Wirkungs-Schlüssel
src/charts.js    SVG-Charts: Radar, Balken, Donut, Streudiagramm, Legende
src/app.js       Routing, Filter, Detailansicht, Vergleich, Statistik, Finder
```

## Ansichten

| Ansicht | Inhalt |
| --- | --- |
| **Bibliothek** | Kartenraster, Volltextsuche (Name, Aroma, Genetik, Wirkung, Anwendung), Filter für Typ, Wirkungen, THC-Bereich, Schwierigkeit und Terpen, Sortierung, Favoriten |
| **Wirkungs-Finder** | Gewünschte Wirkungen auswählen, App berechnet prozentuales Ranking aller Sorten |
| **Vergleich** | bis zu 3 Sorten: überlagertes Wirkungs-Radar, Differenztabelle, Terpenvergleich |
| **Statistik** | Typverteilung (Donut), THC-vs-CBD-Streudiagramm, häufigste Wirkungen, Terpen-Ranking, Schwierigkeitsverteilung |

Favoriten werden lokal im `localStorage` gespeichert und bleiben nach dem Schließen erhalten.

## Datenbank erweitern

Jede Sorte ist ein Objekt in `src/data.js`. Pflichtfelder:

```js
{
  id: 'meine-sorte',            // eindeutig, kleingeschrieben, mit Bindestrichen
  name: 'Meine Sorte',
  type: 'Hybrid',               // 'Sativa' | 'Indica' | 'Hybrid'
  ratio: 'Sativa 60 / Indica 40',
  thc: 21, cbd: 0.2, rating: 4.5,
  effects: { energetic: 4, relaxed: 3 },   // Werte 1–5, Schlüssel siehe EFFECT_KEYS
  flavors: ['Zitrus', 'Erde'],
  terpenes: { Limonen: 60, Myrcen: 40 }, // relative Anteile in %, Summe 100
  lineage: ['Elternsorte A', 'Elternsorte B'],
  flowering: '8–9 Wochen',
  yieldIndoor: '450–550 g/m²',
  yieldOutdoor: '550–700 g/Pflanze',
  height: 'Mittel',             // 'Kompakt' | 'Mittel' | 'Hoch'
  difficulty: 'Mittel',         // 'Einfach' | 'Mittel' | 'Anspruchsvoll'
  medical: ['Stress', 'Schmerzen'],
  description: 'Ein bis zwei Sätze.'
}
```

Wirkungs-Schlüssel: `euphoric`, `energetic`, `relaxed`, `creative`, `happy`, `sleepy`,
`hungry`, `focused`, `talkative`, `giggly`, `uplifted`, `couchlock`, `anxiolytic`, `painrelief`.
Fehlende Wirkungen werden automatisch als 0 gewertet.

Jedes Terpenprofil enthält acht Terpene: Myrcen, Limonen, Caryophyllen, α-Pinen, Linalool,
Terpinolen, Humulen und Ocimen. Die Werte sind relative Anteile und ergeben zusammen 100 %.

## Hinweis

Alle Angaben sind gerundete Durchschnitts- und Community-Werte, keine Laboranalysen.
Die App ist eine Informationssammlung und keine medizinische Beratung. Konsum erst ab 18 Jahren.
