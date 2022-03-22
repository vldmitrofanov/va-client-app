const path = require('path');

const Utils = require(process.env.UTILS_PATH);
const Sidebar = require(path.join(process.env.SCRIPTS_PATH, 'components', 'sidebar.js'));
const Timebar = require(path.join(process.env.SCRIPTS_PATH, 'components', 'timebar.js'));
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));
const Tasks = require(path.join(process.env.SCRIPTS_PATH, 'components', 'tasks.js'));
const Timesheet = require(path.join(process.env.SCRIPTS_PATH, 'components', 'timesheet.js'));

class User {

    constructor(parent) {
        parent = (typeof parent === 'undefined') ? true : parent;

        this.sb = new Sidebar();
        this.tb = new Timebar({
            'timeInCallback': this.timeInCallback,
            'timeOutCallback': this.timeOutCallback,
            'breakCallback': this.breakCallback,
            'resumeCallback': this.resumeCallback,
        });
        this.listen();
        new Notification();
        if (parent) {
            this.checkSOD();
        }
        Utils.ipcSend('start-idle-tracking');
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        let self = this;

        Utils.ipcOn('upload-screenshot', function (event, imgBuffer, mouseActivity, keyboardActivity) {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/users/screenshot',
                'method': 'POST',
                'data': {
                    'img': imgBuffer.toString('base64'),
                    'mouse_activity': mouseActivity,
                    'keyboard_activity': keyboardActivity,
                }
            }).then(function (response) {
                // Upload success.
            }).catch(function (err) {
                if (err.case === 'timeout') {
                    Notification.timeout();
                } else {
                    Notification.error(err.case);
                }
            });
        }, true);

        Utils.ipcOn('upload-process-list', function (event, pList, screenshotId) {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/users/process-list',
                'method': 'POST',
                'data': {
                    'list': pList,
                    'screenshot_id': screenshotId
                }
            }).then(function (response) {
                // Upload success.
            }).catch(function (err) {
                if (err.case === 'timeout') {
                    Notification.timeout();
                } else {
                    Notification.error(err.case);
                }
            });
        }, true);

        Utils.ipcOn('upload-browser-history', function (event, history, minutes, screenshotId) {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/users/browser-history',
                'method': 'POST',
                'data': {
                    'history': history,
                    'minutes': minutes,
                    'screenshot_id': screenshotId
                }
            }).then(function (response) {
                // Upload success.
            }).catch(function (err) {
                if (err.case === 'timeout') {
                    Notification.timeout();
                } else {
                    Notification.error(err.case);
                }
            });
        }, true);

        Utils.ipcOn('main-window-blur', function (event) {
            let runningSeconds = 0;
            document.querySelectorAll('.js-task-timer').forEach((timer) => {
                if (timer.dataset.seconds > 0 && runningSeconds === 0) {
                    runningSeconds = parseInt(timer.dataset.seconds);
                }
            });

            let requestTimeStart = parseInt(Date.now());
            Utils.ajax({
                'url': process.env.API_HOST + '/api/users/tasks',
                'method': 'GET',
                'data': {
                    'current': true
                }
            }).then(function (response) {
                response = JSON.parse(response);
                if (response.status === 'success') {
                    if (response.data.length > 0) {
                        Utils.ipcSend('open-task-window', response.data[0]);
                    }
                }
            }).catch(function (err) {
                if (err.case === 'timeout') {
                    Notification.timeout();
                } else {
                    Notification.error(err.case);
                }
            });
        }, true);
    }

    /**
     * Check for start of day report.
     */
    checkSOD() {
        Utils.ajax({
            'url': process.env.API_HOST + `/api/users/has-sod`,
            'method': 'POST'
        }).then(function (response) {
            response = JSON.parse(response);
            if (!response.today) {
                if (document.querySelectorAll('.notification-no-sod').length === 0) {
                    Notification.create("No SOD has been filed yet. Go to <b>Reports</b> and file the report within the first 15 minutes.", "warning", false, 0, "no-sod");
                }
            }
        }).catch(function (err) {
            if (err.case === 'timeout') {
                Notification.timeout();
            } else {
                Notification.error(err.case);
            }
        });
    }

    /**
     * Time-in callback.
     */
    timeInCallback() {
        let taskBox = document.querySelector('.js-tasks');
        if (taskBox) {
            taskBox.classList.remove('hide');
            new Tasks(this);
        }
    }

    /**
     * Time-out callback.
     */
    timeOutCallback() {
        // task update
        let taskBox = document.querySelector('.js-tasks');
        if (taskBox) {
            taskBox.classList.add('hide');
        }

        // timesheet update
        let timesheet = document.querySelector('.js-timesheet');
        if (timesheet) {
            new Timesheet();
        }
    }

    /**
     * Break callback.
     */
    breakCallback() {
        let taskBox = document.querySelector('.js-tasks');
        if (taskBox) {
            new Tasks(this);
        }
    }

    /**
     * Resume callback.
     */
    resumeCallback() {
        let taskBox = document.querySelector('.js-tasks');
        if (taskBox) {
            new Tasks(this, false);
        }
    }
};

module.exports = User;