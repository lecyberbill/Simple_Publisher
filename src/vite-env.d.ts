export { };

declare global {
    interface Window {
        electronAPI: {
            getSystemFonts: () => Promise<string[]>;
            saveProject: (data: string, path?: string) => Promise<{ success: boolean, filePath?: string }>;
            loadProject: () => Promise<{ data: string, filePath: string } | null>;
            saveFile: (buffer: ArrayBuffer, name: string) => Promise<boolean>;
        };
    }
}
