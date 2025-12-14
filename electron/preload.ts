import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),
    saveProject: (data: string, path?: string) => ipcRenderer.invoke('save-project', data, path),
    loadProject: () => ipcRenderer.invoke('load-project'),
    saveFile: (buffer: ArrayBuffer, name: string) => ipcRenderer.invoke('save-file', buffer, name)
});
