"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const font_list_1 = __importDefault(require("font-list"));
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
function createWindow() {
    const mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: "Simple PAO",
        icon: path_1.default.join(__dirname, '../public/icon.png') // TODO: Add icon
    });
    // Check if we are in dev mode (Vite typically runs on localhost:5173)
    const isDev = !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    // IPC for System Fonts
    electron_1.ipcMain.handle('get-system-fonts', () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const fonts = yield font_list_1.default.getFonts();
            // Remove quotes if present
            return fonts.map((f) => f.replace(/"/g, ''));
        }
        catch (e) {
            console.error("Failed to list fonts", e);
            return [];
        }
    }));
    // IPC for Saving Project
    electron_1.ipcMain.handle('save-project', (event, data, targetPath) => __awaiter(void 0, void 0, void 0, function* () {
        let filePath = targetPath;
        let canceled = false;
        if (!filePath) {
            const result = yield electron_1.dialog.showSaveDialog({
                filters: [{ name: 'Simple PAO Project', extensions: ['spao'] }]
            });
            canceled = result.canceled;
            filePath = result.filePath;
        }
        if (canceled || !filePath) {
            return { success: false };
        }
        try {
            yield fs.writeFile(filePath, data, 'utf-8');
            return { success: true, filePath };
        }
        catch (e) {
            console.error('Failed to save file', e);
            return { success: false };
        }
    }));
    // IPC for Loading Project
    electron_1.ipcMain.handle('load-project', () => __awaiter(void 0, void 0, void 0, function* () {
        const { canceled, filePaths } = yield electron_1.dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Simple PAO Project', extensions: ['spao'] }]
        });
        if (canceled || filePaths.length === 0) {
            return null;
        }
        try {
            const data = yield fs.readFile(filePaths[0], 'utf-8');
            return { data, filePath: filePaths[0] };
        }
        catch (e) {
            console.error('Failed to read file', e);
            return null;
        }
    }));
    // Save Image/PDF binary file
    electron_1.ipcMain.handle('save-file', (event, buffer, defaultName) => __awaiter(void 0, void 0, void 0, function* () {
        const { canceled, filePath } = yield electron_1.dialog.showSaveDialog({
            defaultPath: defaultName || 'export.png',
            filters: [
                { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
                { name: 'PDF', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!canceled && filePath) {
            // Convert ArrayBuffer to Node.js Buffer
            yield fs.writeFile(filePath, Buffer.from(buffer));
            return true;
        }
        return false;
    }));
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
//# sourceMappingURL=main.js.map