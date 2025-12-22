import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import path from 'path';
import fontList from 'font-list';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: "simple-publisher",
        icon: path.join(__dirname, '../public/icon.png') // TODO: Add icon
    });

    // Check if we are in dev mode (Vite typically runs on localhost:5173)
    const isDev = !app.isPackaged;

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // IPC for System Fonts
    ipcMain.handle('get-system-fonts', async () => {
        try {
            const fonts = await fontList.getFonts();
            // Remove quotes if present
            return fonts.map((f: string) => f.replace(/"/g, ''));
        } catch (e) {
            console.error("Failed to list fonts", e);
            return [];
        }
    });

    // IPC for Saving Project
    ipcMain.handle('save-project', async (event, data: string, targetPath?: string) => {
        let filePath = targetPath;
        let canceled = false;

        if (!filePath) {
            const result = await dialog.showSaveDialog({
                filters: [{ name: 'Simple PAO Project', extensions: ['spao'] }]
            });
            canceled = result.canceled;
            filePath = result.filePath;
        }

        if (canceled || !filePath) {
            return { success: false };
        }

        try {
            await fs.writeFile(filePath, data, 'utf-8');
            return { success: true, filePath };
        } catch (e) {
            console.error('Failed to save file', e);
            return { success: false };
        }
    });

    // IPC for Loading Project
    ipcMain.handle('load-project', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Simple PAO Project', extensions: ['spao'] }]
        });

        if (canceled || filePaths.length === 0) {
            return null;
        }

        try {
            const data = await fs.readFile(filePaths[0], 'utf-8');
            return { data, filePath: filePaths[0] };
        } catch (e) {
            console.error('Failed to read file', e);
            return null;
        }
    });

    // Save Image/PDF binary file
    ipcMain.handle('save-file', async (event, buffer: ArrayBuffer, defaultName: string) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            defaultPath: defaultName || 'export.png',
            filters: [
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
                { name: 'PDF', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        })

        if (!canceled && filePath) {
            // Convert ArrayBuffer to Node.js Buffer
            await fs.writeFile(filePath, Buffer.from(buffer));
            return true;
        }
        return false;
    })

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
