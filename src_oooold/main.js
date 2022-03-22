/* jshint esversion: 6 */
// 1280x720
const WINDOW_WIDTH = 1025;
const WINDOW_HEIGHT = 720;

const electron = require('electron');
const { app, BrowserWindow, ipcMain } = require('electron');
const eTwig = require('electron-twig');
const Twig = require('twig').twig;
const fs = require('fs');
const path = require('path');
const logr = require('debug')('app.main');
const srcPath = path.join(__dirname);

const config = require(path.join(srcPath, 'config.json'));
const API_HOST = config.HOST;
const API_PORT = config.PORT;
const DEBUG = (parseInt(config.DEBUG) === 1) ? true : false;
const pjson = require(path.join(srcPath, '..', 'package.json'));

process.env.SRC_PATH = srcPath;
process.env.PACKAGE_PATH = path.join(srcPath, '..');
process.env.RES_PATH = path.join(srcPath, 'resources');
process.env.VIEW_PATH = path.join(process.env.RES_PATH, 'views');
process.env.BULMA_PATH = path.join(process.env.PACKAGE_PATH, 'node_modules', 'bulma', 'css', 'bulma.css');
process.env.SCRIPTS_PATH = path.join(process.env.RES_PATH, 'assets', 'scripts');
process.env.UTILS_PATH = path.join(process.env.SCRIPTS_PATH, 'utils.js');
process.env.API_HOST = API_HOST;
process.env.DEBUG_MODE = DEBUG;
process.env.PACKAGE_VER = pjson.version;
process.env.USER_DATA_PATH = app.getPath('userData');

const socket = require('socket.io-client')(API_HOST + ':' + API_PORT);
const Tracker = require(path.join(srcPath, 'Tracker.js'));
//import Tracker from './Tracker'
const Timer = require(path.join(process.env.SCRIPTS_PATH, 'Timer.js'));

class VA {

    constructor() {
        logr('starting app');
        this.VALUES = [];
        this.mainWindow;
        this.taskWindow;
        this.socket = socket;
        this.app = app;
        this.setInitialGlobals();
        this.ipcEvents();
        this.socketEvents();
        this.appInit();
    }

    setInitialGlobals() {
        global.vaclient = {}; // to be refactored
        global.va = {
            timers: {}
        }
    }

    /**
     * Renders a view on a specified window.
     * 
     * @param {string} view 
     * @param {object} twigData 
     * @param {BrowserWindow} window 
     */
    renderView(view, twigData, window) {
        window = (typeof window === 'undefined') ? this.mainWindow : window;
        window.loadURL(view);
        eTwig.view = twigData;
    }

    /**
     * Create the main window.
     */
    createWindow() {
        let self = this;

        this.mainWindow = new BrowserWindow({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT, resizable: false, useContentSize: true, fullscreenable: false });
        this.mainWindow.setMenu(null);
        if (DEBUG) {
            this.mainWindow.webContents.openDevTools();
        }

        this.mainWindow.on('close', function(event) {
            if (self.VALUES['USERTASK_ID'] !== null && self.VALUES['USERTASK_ID'] > 0) {
                event.preventDefault();
                self.mainWindow.webContents.send('prevent-logout-task');
                return;
            }

            if (self.VALUES['ATTENDANCE_ID'] !== null && self.VALUES['ATTENDANCE_ID'] > 0) {
                event.preventDefault();
                self.mainWindow.webContents.send('prevent-logout');
                return;
            }

            self.VALUES['USERTASK_ID'] = null;
            self.VALUES['ATTENDANCE_ID'] = null;
        });

        this.mainWindow.on('closed', function() {
            self.mainWindow = null;

            if (typeof self.taskWindow !== 'undefined' && self.taskWindow !== null) {
                self.taskWindow.destroy();
            }
        });

        this.mainWindow.on('restore', function() {
            logr('restore event');
        });

        this.mainWindow.on('blur', function() {
            logr('blur event');
            if (!self.mainWindow.isFocused()) {
                logr('main window not focused');
                self.mainWindow.webContents.send('main-window-blur');
            }
        });

        this.mainWindow.on('focus', function() {
            logr('focus event');
            if (typeof self.taskWindow !== 'undefined' && self.taskWindow !== null) {
                self.taskWindow.destroy();
            }
            self.mainWindow.webContents.send('main-window-focus');
        });

        this.renderView(`file://${__dirname}/resources/views/auth/connect.html.twig`, { resPath: process.env.RES_PATH, appVer: process.env.PACKAGE_VER, recon: 0 });
    }

    /**
     * Listen to ipc events.
     */
    ipcEvents() {
        logr('binding ipc events');
        let self = this;

        this.specialEvents = {
            'break-start': () => {
                let data = { broadcastName: 'break-timer-tick' };
                if (typeof global.va.timers[data.broadcastName] !== 'undefined') {
                    global.va.timers[data.broadcastName].stop();
                    delete global.va.timers[data.broadcastName];
                }
                global.va.timers[data.broadcastName] = new Timer(data);
                global.va.timers[data.broadcastName].start();
            },
            'break-stop': () => {
                let data = { broadcastName: 'break-timer-tick' };
                if (typeof global.va.timers[data.broadcastName] !== 'undefined') {
                    global.va.timers[data.broadcastName].stop();
                    delete global.va.timers[data.broadcastName];
                }
            }
        };

        ipcMain.on('broadcast', function() {
            delete arguments[0];
            let args = [];
            Object.keys(arguments).forEach((v) => { args.push(arguments[v]); });
            if (typeof self.specialEvents[arguments[1]] === 'function') {
                self.specialEvents[arguments[1]].apply(null, args);
            }
            BrowserWindow.getAllWindows().forEach((win) => {
                win.webContents.send.apply(win.webContents, args);
            });
        });

        ipcMain.on('task-timer-start', function(event, data) {
            if (typeof global.va.timers[data.broadcastName] === 'undefined') {
                Object.keys(global.va.timers).forEach((timerKey) => {
                    global.va.timers[timerKey].stop();
                    delete global.va.timers[timerKey];
                });
                global.va.timers[data.broadcastName] = new Timer(data);
                global.va.timers[data.broadcastName].start();
            } else {
                console.log('use old timer');
            }
        });

        // ipcMain.on('task-timer-stop', function (event) {
        // 	BrowserWindow.getAllWindows().forEach((win) => {
        // 		win.webContents.send('task-timer-stop');
        // 	});
        // });

        ipcMain.on('open-task-window', function(event, data) {
            logr('ipc event open-task-window');
            const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
            let taskWidth = 400,
                taskHeight = 40,
                x = (width - taskWidth) / 2,
                y = (height - taskHeight);
            if (typeof self.taskWindow !== 'undefined' && self.taskWindow !== null) {
                self.taskWindow.destroy();
            }
            self.taskWindow = new BrowserWindow({ width: taskWidth, height: taskHeight, resizable: false, alwaysOnTop: true, closable: true, frame: false, x: x, y: y });
            self.taskWindow.setMenu(null);
            if (DEBUG) {
                // self.taskWindow.webContents.openDevTools();
            }
            self.taskWindow.on('closed', function() {
                self.taskWindow = null;
            });
            let startRenderTimestamp = Date.now();
            self.renderView(`file://${__dirname}/resources/views/pages/current-task.html.twig`, {
                resPath: process.env.RES_PATH,
                appVer: process.env.PACKAGE_VER,
                task: data.name,
                seconds: data.seconds,
                startRenderTimestamp: startRenderTimestamp,
                id: data.id
            }, self.taskWindow);
        });

        // setter of server values
        ipcMain.on('set-key', function(event, key, value) {
            logr('ipc event set-key');
            self.VALUES[key] = value;
            self.mainWindow.webContents.send('set-key-' + key);
            if (self.taskWindow) {
                self.taskWindow.webContents.send('set-key-' + key);
            }
        });
        // getter of server values
        ipcMain.on('get-key', function(event, key) {
            logr('ipc event get-key');

            let value = (typeof self.VALUES[key] === 'undefined') ? null : self.VALUES[key];
            // console.log('GET KEY', key, value);
            self.mainWindow.webContents.send('get-key-' + key, value);
            if (self.taskWindow) {
                self.taskWindow.webContents.send('get-key-' + key, value);
            }
        });

        ipcMain.on('compile-twig', function(event, uuid, view, data) {
            logr('ipc event compile-twig ' + view);
            let twigFile = path.join(process.env.VIEW_PATH, `${view}.html.twig`);
            fs.readFile(twigFile, function(err, content) {
                if (err) { logr(err); }
                let template = Twig({
                    data: content.toString()
                });
                self.mainWindow.webContents.send('render-' + uuid, template.render({ data: data }));
            });
        });

        ipcMain.on('render-view', function(event, view, twigData) {
            logr('ipc event render-view');
            self.renderView(view, twigData);
        });

        ipcMain.on('set-user-data', function(event, user, settings, remember, email, password) {
            logr('ipc event set-user-data');
            let userFilePath = path.join(process.env.USER_DATA_PATH, 'user.json');
            if (remember) {
                let userData = {
                    email: email,
                    password: password
                };
                fs.writeFileSync(userFilePath, JSON.stringify(userData), 'utf8');
            } else {
                if (fs.existsSync(userFilePath)) {
                    fs.unlinkSync(userFilePath);
                }
            }
            self.user = user;
            self.settings = settings;
            process.env.ACCESS_TOKEN = user.access_token;
            process.env.REQUEST_TIMEOUT = 300000;
            self.VALUES['ATTENDANCE_ID'] = user.attendance_id;
            self.socket.emit('user-connect', user.access_token);
        });

        ipcMain.on('start-tracker', function(event) {
            logr('ipc event start-tracker');
            self.tracker = new Tracker(self);
            self.tracker.startIdleTracking();
        });

        ipcMain.on('stop-tracker', function(event) {
            logr('ipc event stop-tracker');
            if (self.tracker) {
                self.tracker.stopIdleTracking();
            }
        });

        ipcMain.on('triggerEvent', function(event, eventName, data) {
            data = (typeof data === 'undefined') ? {} : data;
            self.mainWindow.webContents.send('eventInvoke:' + eventName, data);
        });
    }

    /**
     * Listen to socket events.
     */
    socketEvents() {
        // console.log('binding socket events');
        let self = this;

        // TODO: partially implemented for now
        this.socket.on('reconnect', (attemptNumber) => {
            logr('socket reconnect', attemptNumber);
        });

        this.socket.on('disconnect', (reason) => {
            self.renderView(`file://${__dirname}/resources/views/auth/connect.html.twig`, { resPath: process.env.RES_PATH, appVer: process.env.PACKAGE_VER, recon: 0 });
            global.va.timers.forEach((timer) => {
                timer.stop();
            });
        });

        this.socket.on('connect_error', (err) => {
            // console.log('err', err);
            // console.log('failed to connect to server');
        });
    }

    /**
     * Initialize electron app object.
     */
    appInit() {
        logr('app instance initialize');
        let self = this;

        this.app.on('ready', function() {
            logr('app instance ready');
            self.createWindow();
        });

        this.app.on('window-all-closed', function() {
            logr('app instance closed');
            if (process.platform !== 'darwin') {
                self.app.quit();
            }
        });

        this.app.on('activate', function() {
            logr('app instance activate');
            if (process.env.mainWindow === null) {
                self.createWindow();
            }
        });
    }

}

new VA();