const { app, BrowserWindow } = require('electron');
const express = require('express');
const cors = require('cors');
const path = require('path');
const url = require('url');

// Create an Express app
console.log('Creating Express server ');
const expressApp = express();
const port = 8000;

expressApp.use(cors());
expressApp.use(express.json());

const env = process.env.NODE_ENV || 'development';
  
// If development environment
if (env === 'development') {
  try {
    require('electron-reloader')(module, {
        debug: true,
        watchRenderer: true
    });
} catch (_) { console.log('Error', 24); }   
}


function createWindow() {
  const mainWindow = new BrowserWindow({webPreferences: {nodeIntegration: true}});
  mainWindow.loadURL('http://localhost:3000');
  mainWindow.maximize();

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
  //mainWindow.loadFile('index.html');
}


app.whenReady().then(() => {
    createWindow();
  });


  // Listen for the 'before-quit' event
app.on('before-quit', () => {
    // Add cleanup logic here before quitting
    console.log('Electron app is about to quit');
  });
  
  // Listen for the 'will-quit' event
  app.on('will-quit', () => {
    // Terminate the Express server process when Electron is quitting
    if (expressApp) {
      expressApp.kill();
      console.log('Express server has been terminated');
    }
  });


  // routes

  const itemRoutes = require('./Routes/itemsRoutes');


  expressApp.use(itemRoutes);
  

  expressApp.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });