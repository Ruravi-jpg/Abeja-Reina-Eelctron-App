const { app, BrowserWindow } = require('electron');
require('dotenv').config();
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

function createWindow() {
  const mainWindow = new BrowserWindow({ webPreferences: { nodeIntegration: true } });
  console.log(process.env.NODE_ENV)
  if (process.env.NODE_ENV === 'development') {
    // Load the React development server in development environment
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // Start the Express server in production environment
    const expressServer = require('./Express/App.js'); // Adjust the path as needed
    mainWindow.loadFile('./React/index.html');
  }

  mainWindow.maximize();

  // Make sure the 'closed' event listener is attached to the BrowserWindow instance, not inside the createWindow function.
  mainWindow.on('closed', () => {
    // Gracefully shut down the Express server when the Electron app is closed.
    expressServer.close(() => {
      app.quit();
    });
  });
}

app.whenReady().then(() => {
  createWindow();
});

// Add the following code to handle closing all windows (if you haven't already):
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
