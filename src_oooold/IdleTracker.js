const logr = require('debug')('app.idle');
const path = require('path');

const Timer = require(path.join(process.env.SCRIPTS_PATH, 'Timer.js'));
const Utils = require(process.env.UTILS_PATH);

class IdleTracker {

    constructor(seconds) {
        const ioHook = require('iohook');
        this.secondsIdle = seconds;
        logr('secondsIdle = ', this.secondsIdle);
        this.isIdle = false;
        this.timeout = false;
        this.pauseTracking = false;

        let self = this;

        let keyboardEvents = ['keydown', 'keyup'],
            mouseEvents = ['mouseclick', 'mousedown', 'mouseup', 'mousemove', 'mousedrag', 'mousewheel'];

        keyboardEvents.forEach(function (eventName) {
            ioHook.on(eventName, event => {
                if (typeof self.keyboardActivityCallback === 'function') { self.keyboardActivityCallback(); }
                self.timer.reset();
            });
        });

        mouseEvents.forEach(function (eventName) {
            ioHook.on(eventName, event => {
                if (typeof self.mouseActivityCallback === 'function') { self.mouseActivityCallback(); }
                self.timer.reset();
            });
        });

        //Register and start hook
        ioHook.start();

        // idle timer
        if (global.vaclient.tracker.idle) {
            logr('using old idle timer');
            this.timer = global.vaclient.tracker.idle;
        } else {
            logr('using new idle timer');
            this.timer = Utils.childTimer({
                interval: 1000,
            }, function (ticks) {
                logr('idle ticks = ', ticks, '>=', self.secondsIdle);
                if (self.secondsIdle <= ticks) {
                    logr('trigger idle');
                    self.isIdle = true;
                    self.idleCallback();
                    self.timer.pause();
                }
            });
            global.vaclient.tracker.idle = this.timer;
        }
        this.timer.start();

        process.on('exit', () => {
            ioHook.unload();
        });
    }

    /**
     * Reset the lapsed time.
     */
    reset() {
        this.timer.reset();
    }

    /**
     * Stop the timer.
     */
    stop() {
        this.timer.stop();
    }

    /**
     * Sets a callback when idle state has been reached.
     * 
     * @param {Function} callback 
     */
    onIdle(callback) {
        this.idleCallback = callback;
        this.timer.reset();
    }

    /**
     * Set mouse activity callback.
     * 
     * @param {function} callback 
     */
    onMouseActivity(callback) {
        this.mouseActivityCallback = callback;
    }

    /**
     * Set keyboard activity callback.
     * 
     * @param {function} callback 
     */
    onKeyboardActivity(callback) {
        this.keyboardActivityCallback = callback;
    }

}

module.exports = IdleTracker;