const { app, BrowserWindow, BrowserView, ipcMain, session } = require('electron');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

let mainWindow;
let loginWindow;
const uri = "mongodb+srv://SpaceWalletRootUser:VvhEnifxJUkA4918@clusterspacewallet.kwbw5gv.mongodb.net/";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Conectado ao MongoDB com sucesso!");
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
    }
}

connectToMongoDB();

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: true,
        }
    });

    mainWindow.loadFile(path.join(__dirname,'index.html'));
    const mainSession = session.defaultSession;
    mainSession.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    const sites = {
        whatsapp: 'https://web.whatsapp.com/',
        facebook: 'https://www.facebook.com',
        instagram: 'https://instagram.com/',
        telegram: 'https://web.telegram.org/',
        discord: 'https://discord.com/login',
        slack: 'https://slack.com/workspace-signin',
        linkedin: 'https://www.linkedin.com/',
    };

    function createBrowserView(url) {
        const view = new BrowserView();
        view.webContents.loadURL(url);
        return view;
    }

    const views = {};
    for (const [name, url] of Object.entries(sites)) {
        views[name] = createBrowserView(url);
    }

    function updateBounds() {
        const { width, height } = mainWindow.getContentBounds();
        const sidebarWidth = 80;
        const contentWidth = width - sidebarWidth;
        const contentHeight = height;
        const activeView = mainWindow.getBrowserView();
        if (activeView) activeView.setBounds({ x: sidebarWidth, y: 0, width: contentWidth, height: contentHeight });
    }

    mainWindow.setBrowserView(views.facebook);
    updateBounds();
    mainWindow.on('resize', updateBounds);

    ipcMain.on('show-whatsapp', () => { mainWindow.setBrowserView(views.whatsapp); updateBounds(); });
    ipcMain.on('show-facebook', () => { mainWindow.setBrowserView(views.facebook); updateBounds(); });
    ipcMain.on('show-instagram', () => { mainWindow.setBrowserView(views.instagram); updateBounds(); });
    ipcMain.on('show-telegram', () => { mainWindow.setBrowserView(views.telegram); updateBounds(); });
    ipcMain.on('show-discord', () => { mainWindow.setBrowserView(views.discord); updateBounds(); });
    ipcMain.on('show-slack', () => { mainWindow.setBrowserView(views.slack); updateBounds(); });
    ipcMain.on('show-linkedin', () => { mainWindow.setBrowserView(views.linkedin); updateBounds(); });
}

function createLoginWindow() {
    loginWindow = new BrowserWindow({ width: 1200, height: 800, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
}

app.on('ready', createLoginWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.on('login-success', (_, username) => { loginWindow.close(); createMainWindow(); });
ipcMain.on('register-user', async (event, username, password) => {
    const db = client.db('SpaceWalletDB').collection('users');
    const existingUser = await db.findOne({ username });
    if (existingUser) return event.reply('register-failure', 'Nome de usuário já existe');
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insertOne({ username, password: hashedPassword });
    event.reply('register-success', 'Usuário registrado com sucesso');
    loginWindow.loadFile(path.join(__dirname, 'login.html'));
});

ipcMain.on('logout-success', () => { if (mainWindow) mainWindow.close(); createLoginWindow(); });
 