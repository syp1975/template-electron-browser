//electron main process
if (require("electron-squirrel-startup")) return;

const { app, nativeImage, shell, BrowserWindow, Menu, MenuItem } = require("electron");
const Store = require("electron-store");
const path = require("path");
const fs = require("fs");
const tmp = require("tmp");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); //first bytes of a PNG file

//app configuration. the store is saved in the app userData directory as config.json
const store = new Store({
  defaults: {
    sites: [
      {
        label: "Google",
        url: "https://www.google.com",
      },
      //... more sites here
    ], //list of sites displayed in the navigate menu
    lastUrl: undefined, //last selected url from the sites list
    options: {
      title: app.getName(),
      backgroundColor: "black",
      minWidth: 800,
      minHeight: 600,
      show: false,
    }, //additional options for the main window creation
    maximize: true, //maximize the main window when the app starts
    allowPopups: true, //allow popups / new windows
    openExternal: false, //open new windows in the default browser
    allowedUrls: [], //external urls must start with one of these strings, any url is allowed if the list is empty
    lang: {
      navigate: {
        label: "Navigate",
        fullscreen: "Full screen",
        autohidemenus: "Hide menus automatically",
        previous: "Previous page",
        next: "Next page",
        reload: "Reload page",
        exit: "Exit",
      },
      edit: {
        label: "Edit",
        undo: "Undo",
        redo: "Redo",
        cut: "Cut",
        copy: "Copy",
        paste: "Paste",
        selectall: "Select all",
      },
      loading: "Loading",
    }, //text labels
  },
});

//list of sites to display in the navigate menu
const sites = store.get("sites", []);

//list of allowed urls (to open a new child window), empty list means any url is allowed
const allowedUrls = store.get("allowedUrls", []);

//new BrowserWindow options
const options = {
  title: app.getName(),
  backgroundColor: "black",
  minWidth: 800,
  minHeight: 600,
  ...store.get("options", {}),
  webPreferences: {
    devTools: store.get("devTools", false),
    disableDialogs: store.get("disableDialogs", false),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    safeDialogs: true,
  }, //enforce this security settings over the ones defined in config.json
  show: false, //don't show the window until the page is ready
};

//static menu items
const navMenu = new MenuItem({
  label: store.get("lang.navigate.label", "Navigate"),
  submenu: [
    {
      label: store.get("lang.navigate.fullscreen", "Full screen"),
      accelerator: "F11",
      click: () => {
        const fullScreen = !BrowserWindow.getFocusedWindow().fullScreen;
        BrowserWindow.getFocusedWindow().setFullScreen(fullScreen);
        store.set("options.fullscreen", fullScreen);
      },
      type: "checkbox",
    },
    {
      label: store.get("lang.navigate.autohidemenus", "Hide menus automatically"),
      accelerator: "F12",
      click: () => {
        const hide = !BrowserWindow.getFocusedWindow().autoHideMenuBar;
        BrowserWindow.getFocusedWindow().setAutoHideMenuBar(hide);
        BrowserWindow.getFocusedWindow().setMenuBarVisibility(!hide);
        store.set("options.autoHideMenuBar", hide);
      },
      type: "checkbox",
    },
    {
      label: store.get("lang.navigate.previous", "Previous page"),
      accelerator: "Alt+Left",
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.goBack();
      },
      enabled: () => BrowserWindow.getFocusedWindow().webContents.canGoBack(),
    },
    {
      label: store.get("lang.navigate.next", "Next page"),
      accelerator: "Alt+Right",
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.goForward();
      },
      enabled: () => BrowserWindow.getFocusedWindow().webContents.canGoForward(),
    },
    {
      label: store.get("lang.navigate.reload", "Reload page"),
      accelerator: "CmdOrCtrl+R",
      click: () => {
        BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
      },
    },
    {
      label: store.get("lang.navigate.exit", "Exit"),
      accelerator: "CmdOrCtrl+Q",
      click: () => {
        app.quit();
      },
    },
  ],
});
const editMenu = new MenuItem({
  label: store.get("lang.edit.label", "Edit"),
  submenu: [
    { label: store.get("lang.edit.undo", "Undo"), accelerator: "CmdOrCtrl+Z", selector: "undo:" },
    { label: store.get("lang.edit.redo", "Redo"), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
    { type: "separator" },
    { label: store.get("lang.edit.cut", "Cut"), accelerator: "CmdOrCtrl+X", selector: "cut:" },
    { label: store.get("lang.edit.copy", "Copy"), accelerator: "CmdOrCtrl+C", selector: "copy:" },
    { label: store.get("lang.edit.paste", "Paste"), accelerator: "CmdOrCtrl+V", selector: "paste:" },
    { label: store.get("lang.edit.selectall", "Select all"), accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
  ],
});

//last favicon fetched for each window, key is the window id, value is the temporary file path
const favicons = {};

//creates the application menu
const setApplicationMenu = () => {
  //show the list of sites defined in config.json
  const sites = store.get("sites") ?? [];
  let acc = 0;
  sites.forEach((site) => {
    //add the first 10 sites to the navigate menu
    if (typeof site.url === "string" && site.url.length > 0 && acc < 10) {
      navMenu.submenu.insert(
        acc++,
        new MenuItem({
          label: site.label ?? site.url,
          click: () => {
            store.set("lastUrl", site.url);
            BrowserWindow.getFocusedWindow().loadURL(site.url);
          },
          accelerator: `Alt+${acc % 10}`, //only first 10 sites are allowed to be accessed with Alt+1 to Alt+0
        })
      );
    }
  });
  //add a separator if there are sites defined in config.json
  if (acc > 0) navMenu.submenu.insert(acc, new MenuItem({ type: "separator" }));
  const menus = [navMenu, editMenu];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

//create the main window, maximize it and navigate to the last selected url
const createMainWindow = () => {
  const win = new BrowserWindow(options);
  if (store.get("maximize", true)) win.maximize();
  //get last selected url from config.json, defaults to first site in the list or google.com
  const lastUrl = store.get(
    "lastUrl",
    (Array.isArray(sites) && sites.length > 0 && sites[0].url) ?? "https://www.google.com"
  );
  win.loadURL(lastUrl);
  //adds event handlers to the main window
  initEventHandlers(win);
  return win;
};

const createChildWindow = (url) => {
  const win = new BrowserWindow({
    ...options,
    parent: options.modal === true ? BrowserWindow.getFocusedWindow() : undefined, //open the new window as a child of the focused window if it's a modal window
  });
  win.loadURL(url);
  initEventHandlers(win);
  return win;
};

//check if the url is allowed to be opened in the app
const isUrlAllowed = (url) => {
  //url should be a string and not empty
  if (typeof url !== "string" || url.length <= 0) return false;
  //list of allowed urls, empty list means any url is allowed
  if (!Array.isArray(allowedUrls) || allowedUrls.length <= 0) return true;
  //check if the url starts with one of the allowed urls
  return allowedUrls.some((allowedUrl) => url.toLowerCase().startsWith(allowedUrl.toLowerCase()));
};

//adds event handlers to the window
const initEventHandlers = (win) => {
  const content = win.webContents;

  //handles window.open (and target="_blank" for anchors) calls from the renderer process. replaces the deprecated "new-window" event
  content.setWindowOpenHandler(({ url }) => {
    //check if the url is allowed to be opened in the app
    if (store.get("allowPopups", true) && isUrlAllowed(url)) {
      //check if the new window should be opened in the default system browser or a new child window
      if (store.get("openExternal", false)) shell.openExternal(url);
      else createChildWindow(url);
    }
    //prevent the default behavior of the window.open call
    return { action: "deny" };
  });

  //show the window when the page is ready
  content.once("dom-ready", () => {
    win.show();
  });

  //show a loading app icon and progress bar while the page is loading
  content.on("did-start-loading", () => {
    win.setIcon(nativeImage.createFromPath(path.join(__dirname, "assets/loading.png")));
    win.setProgressBar(2, { mode: "indeterminate" });
  });

  //restore the app title and app icon when the page is loaded
  content.on("did-stop-loading", () => {
    win.setTitle(win.webContents.getTitle() ?? win.webContents.getURL());
    win.setIcon(nativeImage.createFromPath(favicons["_" + win.id] ?? path.join(__dirname, "assets/icon.png")));
    win.setProgressBar(-1);
  });

  //show the url being loaded in the app title
  content.on("did-start-navigation", (_, url) => {
    win.setTitle(`${store.get("lang.loading", "Loading")} ${url} ...`);
  });

  //fetch the page favicon and set it as the app icon
  content.on("page-favicon-updated", (_, icons) => {
    if (Array.isArray(icons) && icons.length > 0) {
      fetch(icons[0])
        .then((response) => {
          if (response.ok) return response.arrayBuffer();
          throw new Error(`Response status ${response.status}: ${response.statusText}`);
        })
        .then((arrayBuffer) => {
          const buffer = Buffer.from(arrayBuffer);
          //check if the favicon is a PNG image
          const isPNG = PNG_SIGNATURE.compare(buffer, 0, PNG_SIGNATURE.length) == 0;
          //save the favicon to a temporary file and set it as the app icon
          const icon = tmp.tmpNameSync({ postfix: isPNG ? ".png" : ".ico" });
          fs.writeFileSync(icon, buffer);
          win.setIcon(nativeImage.createFromPath(icon));
          //keep track of the last favicon fetched for the current window
          deleteFile(favicons["_" + win.id]);
          favicons["_" + win.id] = icon;
        })
        .catch((error) => {
          console.error("Error fetching favicon", error);
        });
    }
  });
};

const deleteFile = (file) => {
  if (!file || !fs.existsSync(file)) return;
  try {
    fs.rmSync(file);
  } catch {}
};

app.whenReady().then(() => {
  setApplicationMenu();
  createMainWindow();
});

app.on("window-all-closed", () => {
  //delete the temporary favicon files
  Object.values(favicons).forEach((icon) => deleteFile(icon));
  if (process.platform !== "darwin") app.quit();
});
