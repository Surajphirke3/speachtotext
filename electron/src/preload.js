// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    saveText: (content) => ipcRenderer.invoke('save-text', content),
    // Add any other IPC methods you need here
  }
);

// Expose a function to check if the backend is available
contextBridge.exposeInMainWorld(
  'backendAPI',
  {
    checkBackendStatus: async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transcription/status');
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  }
);
