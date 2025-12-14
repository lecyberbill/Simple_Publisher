"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getSystemFonts: () => electron_1.ipcRenderer.invoke('get-system-fonts'),
    saveProject: (data, path) => electron_1.ipcRenderer.invoke('save-project', data, path),
    loadProject: () => electron_1.ipcRenderer.invoke('load-project'),
    saveFile: (buffer, name) => electron_1.ipcRenderer.invoke('save-file', buffer, name)
});
//# sourceMappingURL=preload.js.map