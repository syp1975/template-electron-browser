module.exports = {
  packagerConfig: {
    asar: true,
    icon: "./assets/icon", //icon for the executable (without extension, it will be added automatically for each platform)
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        //certificateFile: "./sign.crt", //recommended to sign the app in order to avoid untrusted app warnings
        iconUrl: __dirname + "/assets/icon.ico", //icon for the app in the programs list (control panel)
        setupIcon: "./assets/icon.ico", //icon for the app installer
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],
};
