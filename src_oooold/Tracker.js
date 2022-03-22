const path = require('path');
const ss = require('screenshot-desktop');
const psList = require('ps-list');
//import psList from 'ps-list';
// const BrowserHistory = require('node-browser-history'); // DO NOT REMOVE
const { ipcMain } = require('electron');
const logr = require('debug')('app.tracker');

const IdleTracker = require(path.join(process.env.SRC_PATH, 'IdleTracker.js'));
const config = require(path.join(process.env.SRC_PATH, 'config.json'));
const Utils = require(process.env.UTILS_PATH);

class Tracker {

    constructor(options) {
        logr('tracker initialize');
        this.options = options;
        global.vaclient.tracker = (typeof global.vaclient.tracker === 'undefined') ? {} : global.vaclient.tracker;
        this.idle_timeout = (typeof this.options.settings['idle-interval'] !== 'undefined') ? this.options.settings['idle-interval'] : config.IDLE_TIMEOUT_SECONDS;
        this.clearTrackerTimers();
        this.idleHook = new IdleTracker(this.idle_timeout);
        this.listen();
        this.interval();
        this.mouseActivity = 0;
        this.keyboardActivity = 0;
    }

    /**
     * Stop and remove tracker timers.
     */
    clearTrackerTimers() {
        if (global.vaclient.tracker.screenshot) {
            global.vaclient.tracker.screenshot.stop();
            global.vaclient.tracker.screenshot = null;
        }

        if (global.vaclient.tracker.idle) {
            global.vaclient.tracker.idle.stop();
            global.vaclient.tracker.idle = null;
        }
    }

    /**
     * Set the tracker timer.
     */
    interval() {
        let self = this;
        if (typeof this.options.settings['screenshot-interval'] !== 'undefined') {
            logr('screenshot-interval = ' + this.options.settings['screenshot-interval']);
            this.idleHook.onMouseActivity(function() {
                self.mouseActivity++;
            });
            this.idleHook.onKeyboardActivity(function() {
                self.keyboardActivity++;
            });
            let screenshotInterval = parseInt(this.options.settings['screenshot-interval']);

            if (global.vaclient.tracker.screenshot) {
                logr('using old screenshot timer');
                this.intval = global.vaclient.tracker.screenshot;
            } else {
                logr('using new screenshot timer');
                this.intval = Utils.childTimer({
                    interval: 1000
                }, function(ticks) {
                    logr('screenshot ticks', ticks, '>=', screenshotInterval);
                    if (ticks >= screenshotInterval) {
                        logr('trigger screenshot');
                        self.screenshot();
                        self.intval.reset();
                    }
                });
                this.intval.start();
                global.vaclient.tracker.screenshot = this.intval;
            }
        }
    }

    /**
     * Listen to events.
     */
    listen() {
        let self = this;

        this.options.socket.on('user-screenshot-' + this.options.user.id, function(data) {
            logr('user-screenshot-' + self.options.user.id);
            self.screenshot();
        });

        this.options.socket.on('user-process-list-' + this.options.user.id, function(data) {
            logr('user-process-list-' + self.options.user.id);
            self.processList(data);
        });

        this.options.socket.on('user-browser-history-' + this.options.user.id, function(data) {
            logr('user-browser-history-' + self.options.user.id);
            self.browserHistory(data);
        });

        ipcMain.on('start-idle-tracking', function(event) {
            logr('start-idle-tracking');
            self.startIdleTracking();
        });

        ipcMain.on('stop-idle-tracking', function(event) {
            logr('stop-idle-tracking');
            self.idleHook.pause();
        });
    }

    /**
     * Do screenshot action.
     */
    screenshot() {
        let self = this;
        ss().then(function(imgBuffer) {
            self.options.mainWindow.webContents.send('upload-screenshot', imgBuffer, self.mouseActivity, self.keyboardActivity);
            self.mouseActivity = 0;
            self.keyboardActivity = 0;
        });
    }

    /**
     * Do process list action.
     * 
     * @param {object} data 
     */
    processList(data) {
        let screenshotId = (typeof data.screenshot_id === 'undefined') ? 0 : data.screenshot_id,
            self = this;

        psList().then(function(data) {
            let pList = [];
            for (let i in data) {
                if (pList.indexOf(data[i].name) < 0) {
                    pList.push(data[i].name);
                }
            }
            self.options.mainWindow.webContents.send('upload-process-list', pList, screenshotId);
        });
    }

    /**
     * Do browser history action.
     * 
     * @param {object} data 
     */
    browserHistory(data) {
        let minutes = (typeof data.minutes === 'undefined') ? 60 : data.minutes,
            screenshotId = (typeof data.screenshot_id === 'undefined') ? 0 : data.screenshot_id,
            self = this;

        // temporary
        let history = [];
        self.options.mainWindow.webContents.send('upload-browser-history', history, minutes, screenshotId);

        // DO NOT REMOVE
        // BrowserHistory.getAllHistory(minutes).then(function (history) {
        //     // history = [{title, utc_time, url, browser}]
        //     history = JSON.stringify(history);
        //     self.options.mainWindow.webContents.send('upload-browser-history', history, minutes, screenshotId);
        // });
    }

    /**
     * Start idle tracking.
     */
    startIdleTracking() {
        let self = this;

        this.idleHook.onIdle(function() {
            self.options.renderView(`file://${__dirname}/resources/views/auth/idle.html.twig`, { resPath: process.env.RES_PATH, appVer: process.env.PACKAGE_VER, idleTimeoutSeconds: self.idle_timeout, accessToken: process.env.ACCESS_TOKEN });
            self.options.mainWindow.focus();

            ipcMain.on('user-active', function(event) {
                self.idleHook.reset();
                self.interval();
            });

            ipcMain.on('pause-idle-tracking', function(event) {
                self.stopIdleTracking();
            });
        });
    }

    /**
     * Stop idle tracking.
     */
    stopIdleTracking() {
        this.idleHook.stop();
        this.intval.stop();
        this.mouseActivity = 0;
        this.keyboardActivity = 0;
    }

};

module.exports = Tracker;