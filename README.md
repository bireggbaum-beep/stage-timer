# Stage Timer

Professioneller Präsentations-Timer für Webinare, Workshops und Bühnenauftritte.

**Live:** https://DEIN-USERNAME.github.io/stage-timer/

## Features

- Mehrere Segmente mit Titel und Dauer
- **Auto-Modus**: Wechselt automatisch zum nächsten Segment
- **Manuell-Modus**: Zeigt Überziehungszeit und wartet auf Bestätigung
- **Smart Compensate**: Kürzt verbleibende Segmente proportional, um die Endzeit einzuhalten
- Vollbildmodus & Tastatursteuerung (`Leertaste`, `← →`, `F`)
- Screen Wake Lock (Bildschirm bleibt an)
- DE / EN Sprachumschaltung
- Session-Zusammenfassung mit Effizienzwert

## Deployment auf GitHub Pages

### 1. Repo erstellen

```bash
gh repo create stage-timer --public
git init
git remote add origin git@github.com:DEIN-USERNAME/stage-timer.git
```

### 2. GitHub Pages aktivieren

Repo → **Settings** → **Pages** → Source: **GitHub Actions**

### 3. Pushen — fertig

```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

Der Workflow baut automatisch und deployed auf GitHub Pages.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Öffne http://localhost:5173

## Projektstruktur

```
src/
├── components/ui/   Eigene UI-Komponenten (Button, Input, Select, Card)
├── contexts/        TimerContext, LanguageContext
├── locales/         de.json, en.json
├── pages/           Setup, Timer, Summary
└── types/           timer.ts
```
