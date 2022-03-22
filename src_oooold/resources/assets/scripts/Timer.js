const { ipcMain, BrowserWindow } = require('electron');

class Timer {

    constructor(options) {
        this.interval = 1000;
        this.offset = 0;
        this.broadcastName = '';

        let props = ['interval', 'offset', 'callback', 'broadcastName'],
            self = this;
        props.forEach(function (prop) {
            if (typeof options[prop] !== 'undefined') {
                self[prop] = options[prop];
            }
        });

        this._intervalId = 0;
        this._ticks = 0 + this.offset;
    }

    start() {
        let self = this;
        clearInterval(this._intervalId);
        this._intervalId = setInterval(function () {
            if (self.broadcastName !== '') {
                BrowserWindow.getAllWindows().forEach((window) => {
                    window.webContents.send(self.broadcastName, self._ticks);
                });
            }
            self._ticks++;
        }, this.interval);
    }

    reset() {
        this._ticks = 0;
    }

    stop() {
        clearInterval(this._intervalId);
        this._ticks = 0;
    }
};

module.exports = Timer;