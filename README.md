# Template Electron Browser

This is a template project for creating an Electron-based tabless-browser applications.

It is dessigned to render a website in a kiosk or panel display with minimal UI in fullscreen mode. It also can be used as a launcher for any web application in windowed mode.

Uses [Electron Forge](https://www.electronforge.io/) to build the app.

## How to download it

**Do not clone this repository unless you want to keep my git history.**

Instead you should download the project as a ZIP file and extract its contents to your desired location, this way you will start with a clean project.

If you work from the _CLI_, I would recommend [tiged](https://github.com/tiged/tiged) for this:

```bash
npm install -g tiged
tiged syp1975/template-electron-browser your-project-folder
```

## How to use it

- Install [Node.js](https://nodejs.org).
- Install project dependencies.

```bash
cd your-project-folder
npm install
```

- Edit `package.json` and update it with your project data.

```json
"name": "template-electron-browser",
"productName": "Electron Browser",
"description": "Electron-based tabless-browser application",
"author": "syp1975",
"version": "1.0.0",
"license": "MIT",
```

- Replace application icons located in the `assets` folder:
  - `icon.ico`: Windows platform.
  - `icon.icns`: MacOS platform.
  - `icon.png`: All platforms.
- Modify the default application configuration defined in `main.js`:

```js
const store = new Store({
  defaults: {
    ...
  },
});
```

- Start the application:

```bash
npm start
```

## How to build the application installer

```bash
npm run make
```

## License

MIT
