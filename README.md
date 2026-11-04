# RealmSpace

A desktop app for running a Dungeons & Dragons campaign, built like a project management tool but for game masters. It runs on Mac and Windows.

## What it does

- **Quests**: a board with four columns (Rumors, In progress, Completed, Failed). Drag a card to change its status.
- **Sessions**: a numbered log of what happened at each game night.
- **Characters**: the party and everyone else they meet.
- **Locations**: places grouped by region.
- **Connections**: link any quest, session, character, or location to any other, and jump between them.
- **Search**: across every name and note in the campaign.

Everything saves automatically to a single file on your computer. Use **Show campaign file** in the sidebar to find it (good for backups).

## Running it on your computer

You need [Node.js](https://nodejs.org) installed (the LTS version is fine). Then, in a terminal:

```bash
git clone https://github.com/kp2615/realmspace.git
cd realmspace
npm install
npm start
```

`npm install` is only needed the first time, or after the dependencies change.

## Making an installable app

```bash
npm run dist:mac   # creates a .dmg in the dist folder (run on a Mac)
npm run dist:win   # creates a Windows installer in the dist folder (best run on Windows)
```

These builds aren't code-signed yet, so the first time you open one, macOS and Windows will warn that the developer is unidentified. On a Mac, right-click the app and choose **Open**.

## How the code is laid out

| File | What it is |
| --- | --- |
| `main.js` | Opens the app window and reads and writes the campaign file |
| `preload.js` | The bridge that lets the interface save and load safely |
| `src/index.html` | The page the window shows |
| `src/styles.css` | All colors, type, and layout |
| `src/app.js` | The interface: views, the details panel, drag and drop |
| `src/sample.js` | The sample campaign offered on first launch |

The interface is plain HTML, CSS, and JavaScript with no build step, so you can edit `styles.css` and reload the window (View → Reload, or Cmd/Ctrl+R) to see changes.
