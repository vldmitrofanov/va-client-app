const path = require('path');
const logr = require('debug')('app.timebar');

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));

class Timebar {

    constructor(options) {
        this.timeInCallback = function () { };
        this.timeOutCallback = function () { };
        this.breakCallback = function () { }
        this.resumeCallback = function () { };
        this.onBreak = false;

        let self = this;

        let publicProperties = ['timeInCallback', 'timeOutCallback', 'breakCallback', 'resumeCallback'];
        publicProperties.forEach(function (prop) {
            if (typeof options[prop] !== 'undefined') {
                self[prop] = options[prop];
            }
        });

        this.listen();
        this.schedules();
        this.bind();
        this.checkSelectedMenu();
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        this.timebar = document.querySelector('.js-timebar');
        let self = this;

        Utils.ipcOn('render-TimebarScheduleItem', function (event, html) {
            self.timebar.querySelector('.js-form-schedule').innerHTML = html;
            self.checkAttendance();

            self.timebar.querySelector('.js-btn-timein').addEventListener('click', function (e) {
                e.preventDefault();
                let timeinbutton = this;
                timeinbutton.classList.add('is-loading');

                let id = self.timebar.querySelector('.js-form-schedule').value,
                    reason = self.timebar.querySelector('.js-form-late').value;

                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/attendance',
                    'method': 'POST',
                    'data': {
                        'schedule_id': id,
                        'late_reason': reason
                    }
                }).then(function (response) {
                    response = JSON.parse(response);
                    if (response.status === 'success') {
                        self.timebar.querySelector('#js-time-in').classList.remove('is-loading');
                        self.timebar.querySelector('.js-btn-timein').classList.remove('is-loading');

                        self.timebar.querySelector('#js-time-in').parentNode.classList.add('hide');
                        self.timebar.querySelector('#js-time-out').parentNode.classList.remove('hide');
                        self.timebar.querySelector('#js-break').parentNode.classList.remove('hide');
                        self.timebar.querySelector('#js-resume').parentNode.classList.add('hide');
                        self.timebar.querySelector('#js-time-out').dataset.id = response.id;
                        Utils.set('ATTENDANCE_ID', response.id).then(function () {
                            Utils.ipcSend('start-tracker');
                            self.timebar.querySelector('.modal').classList.remove('is-active');
                            if (typeof self.timeInCallback === 'function') {
                                self.timeInCallback();
                            }
                        });
                    }
                }).catch(function (err) {
                    timeinbutton.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });
        });

        Utils.ipcOn('break-start', function (event) {
            self.timebar.querySelector('.break-timer').innerText = '00:00:00';
            self.timebar.querySelector('.break-timer').parentNode.parentNode.classList.remove('hide');
            Utils.set('USERTASK_ID', null).then(() => {
                self.onBreak = true;
                self.timebar.querySelector('#js-time-in').parentNode.classList.add('hide');
                self.timebar.querySelector('#js-time-out').parentNode.classList.add('hide');
                self.timebar.querySelector('#js-break').parentNode.classList.add('hide');
                self.timebar.querySelector('#js-resume').parentNode.classList.remove('hide');
                Utils.ipcSend('stop-tracker');
                if (typeof self.breakCallback === 'function') {
                    self.breakCallback();
                }
            });
        }, true);

        Utils.ipcOn('break-stop', function (event) {
            self.timebar.querySelector('#js-resume').classList.remove('is-loading');
            self.timebar.querySelector('.break-timer').parentNode.parentNode.classList.add('hide');
            self.doResume().catch(function (err) {
                if (err.case === 'timeout') {
                    Notification.timeout();
                } else {
                    Notification.error(err.case);
                }
            });
        }, true);

        Utils.ipcOn('break-timer-tick', function (e, ticks) {
            let secs = ticks,
                mins = 0,
                hours = 0;

            if (secs >= 60) {
                mins = Math.floor(secs / 60);
                secs = secs % 60;
            }
            if (mins >= 60) {
                hours = Math.floor(mins / 60);
                mins = mins % 60;
            }

            let el = self.timebar.querySelector('.break-timer');
            el.innerText = Utils.pad(hours, 2) + ':' + Utils.pad(mins, 2) + ':' + Utils.pad(secs, 2);
        }, true);


        Utils.ipcOn('prevent-logout', function (event) {
            self.modalLogout.classList.add('is-active');
        });

        Utils.ipcOn('prevent-logout-task', function (event) {
            self.modalLogoutTask.classList.add('is-active');
        });
    }

    /**
     * Fetch schedules list.
     */
    schedules() {
        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/schedules',
            'method': 'GET',
            'data': {
                'current': 'today'
            }
        }).then(function (response) {
            response = JSON.parse(response);
            Utils.ipcSend('compile-twig', 'TimebarScheduleItem', 'components/timebar-schedule-item', response.data);
        }).catch(function (err) {
            if (err.case === 'timeout') {
                Notification.timeout();
            } else {
                Notification.error(err.case);
            }
        });
    }

    /**
     * Bind component actions.
     */
    bind() {
        if (this.timebar !== null) {
            let self = this,
                modal = this.timebar.querySelector('.modal.modal-timebar-late'),
                modalTask = this.timebar.querySelector('.modal.modal-timebar-task');

            self.modalLogout = this.timebar.querySelector('.modal.modal-logout');
            self.modalLogoutTask = this.timebar.querySelector('.modal.modal-logout-task');

            this.timebar.querySelector('#js-break').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');

                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/break-start',
                    'method': 'POST'
                }).then(function (response) {
                    btn.classList.remove('is-loading');
                    Utils.ipcSend('broadcast', 'break-start');
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });

            this.timebar.querySelector('#js-resume').addEventListener('click', function (e) {
                e.preventDefault();
                this.classList.add('is-loading');
                Utils.ipcSend('broadcast', 'break-stop');
            });

            this.timebar.querySelector('#js-time-in').addEventListener('click', function (e) {
                e.preventDefault();
                modal.classList.add('is-active');
            });

            this.timebar.querySelector('#js-time-out').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;

                Utils.get('USERTASK_ID').then(function (value) {
                    if (value !== null && value > 0) {
                        modalTask.classList.add('is-active');
                    } else {
                        btn.classList.add('is-loading');
                        self.doTimeout().then(function () {
                            btn.classList.remove('is-loading');
                        }).catch(function (err) {
                            btn.classList.remove('is-loading');
                            if (err.case === 'timeout') {
                                Notification.timeout();
                            } else {
                                Notification.error(err.case);
                            }
                        });
                    }
                });
            });

            modalTask.querySelector('.js-timebar-task-out').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');

                self.doTimeout().then(function () {
                    btn.classList.remove('is-loading');
                    modalTask.classList.remove('is-active');
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });

            modalTask.querySelector('.js-timebar-task-cancel').addEventListener('click', function (e) {
                e.preventDefault();
                modalTask.classList.remove('is-active');
            });

            // nav menu

            this.timebar.querySelectorAll('.js-menu a').forEach(function (menu) {
                menu.addEventListener('click', function (e) {
                    e.preventDefault();
                    Utils.render(`pages/${this.dataset.page}`);
                });
            });

            this.timebar.querySelector('.js-logout').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = self.timebar.querySelector('.js-logout');
                btn.classList.add('is-loading');

                Utils.get('USERTASK_ID').then(function (taskValue) {
                    if (taskValue !== null) {
                        if (parseInt(taskValue) !== 0) {
                            self.modalLogoutTask.classList.add('is-active');
                            return;
                        } else {
                            self.doLogout().then(function () {
                                btn.classList.remove('is-loading');
                            }).catch(function (err) {
                                btn.classList.remove('is-loading');
                                if (err.case === 'timeout') {
                                    Notification.timeout();
                                } else {
                                    Notification.error(err.case);
                                }
                            });
                            return;
                        }
                    } else {
                        Utils.get('ATTENDANCE_ID').then(function (value) {
                            if (value !== null) {
                                if (parseInt(value) !== 0) {
                                    self.modalLogout.classList.add('is-active');
                                    return;
                                }
                            }

                            self.doLogout().then(function () {
                                btn.classList.remove('is-loading');
                            }).catch(function (err) {
                                btn.classList.remove('is-loading');
                                if (err.case === 'timeout') {
                                    Notification.timeout();
                                } else {
                                    Notification.error(err.case);
                                }
                            });
                            return;
                        });
                    }
                });
            });

            this.modalLogout.querySelector('.js-logout-cancel').addEventListener('click', function (e) {
                e.preventDefault();
                self.modalLogout.classList.remove('is-active');
                self.timebar.querySelector('.js-logout').classList.remove('is-loading');
            });

            this.modalLogout.querySelector('.js-real-logout').addEventListener('click', function (e) {
                e.preventDefault();
                self.modalLogout.classList.remove('is-active');
                self.doLogout().then(function () {
                    self.timebar.querySelector('.js-logout').remove('is-loading');
                }).catch(function (err) {
                    self.timebar.querySelector('.js-logout').remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });

            this.modalLogoutTask.querySelector('.js-logout-task-cancel').addEventListener('click', function (e) {
                e.preventDefault();
                self.modalLogoutTask.classList.remove('is-active');
                self.timebar.querySelector('.js-logout').classList.remove('is-loading');
            });

            this.modalLogoutTask.querySelector('.js-logout-task-out').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');
                self.doLogout().then(function () {
                    btn.classList.remove('is-loading');
                    self.modalLogoutTask.classList.remove('is-active');
                    self.timebar.querySelector('.js-logout').remove('is-loading');
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });
        }
    }

    /**
     * Do logout action.
     */
    doLogout() {
        return new Promise(function (resolve, reject) {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/auth/logout',
                'method': 'GET'
            }).then(function (response) {
                Utils.set('ATTENDANCE_ID', null).then(function () {
                    Utils.set('USERTASK_ID', null).then(function () {
                        Utils.render('auth/login');
                        resolve();
                    });
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    /**
     * Do resume action.
     */
    doResume() {
        let self = this,
            btn = self.timebar.querySelector('#js-resume');
        btn.classList.add('is-loading');
        self.onBreak = false;

        return new Promise((resolve, reject) => {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/users/break-stop',
                'method': 'POST'
            }).then(function (response) {
                btn.classList.remove('is-loading');
                response = JSON.parse(response);
                self.timebar.querySelector('#js-time-in').parentNode.classList.add('hide');
                self.timebar.querySelector('#js-time-out').parentNode.classList.remove('hide');
                self.timebar.querySelector('#js-break').parentNode.classList.remove('hide');
                self.timebar.querySelector('#js-resume').parentNode.classList.add('hide');
                Utils.ipcSend('start-tracker');
                if (typeof self.resumeCallback === 'function') {
                    self.resumeCallback();
                }
                resolve();
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    /**
     * Do timeout action.
     */
    doTimeout() {
        let self = this;
        return new Promise(function (resolve, reject) {
            Utils.get('ATTENDANCE_ID').then(function (attendanceId) {
                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/attendance/' + attendanceId,
                    'method': 'PUT',
                }).then(function (response) {
                    response = JSON.parse(response);
                    if (response.status === 'success') {
                        Utils.set('ATTENDANCE_ID', null).then(function () {
                            Utils.set('USERTASK_ID', null).then(function () {
                                self.timebar.querySelector('#js-time-in').parentNode.classList.remove('hide');
                                self.timebar.querySelector('#js-time-out').parentNode.classList.add('hide');
                                self.timebar.querySelector('#js-break').parentNode.classList.add('hide');
                                self.timebar.querySelector('#js-resume').parentNode.classList.add('hide');

                                Utils.ipcSend('stop-tracker');

                                if (typeof self.timeOutCallback === 'function') {
                                    self.timeOutCallback();
                                }

                                resolve();
                            });
                        });
                    } else {
                        reject({ status: "error", case: response.msg });
                    }
                }).catch(function (err) {
                    reject(err);
                });
            }).catch(function (err) {
                reject(err);
            });
        });
    }

    /**
     * Check if there is an attendance.
     */
    checkAttendance() {
        let self = this;
        Utils.get('ATTENDANCE_ID').then(function (value) {
            if (value !== null) {
                if (parseInt(value) !== 0) {
                    Utils.ipcSend('start-tracker');
                    self.timebar.querySelector('#js-time-in').parentNode.classList.add('hide');
                    self.timebar.querySelector('#js-time-out').parentNode.classList.remove('hide');
                    self.timebar.querySelector('#js-break').parentNode.classList.remove('hide');
                    self.timebar.querySelector('#js-resume').parentNode.classList.add('hide');

                    self.timebar.querySelector('#js-time-out').dataset.id = value;

                    if (typeof self.timeInCallback === 'function') {
                        self.timeInCallback();
                    }
                    return;
                }
            }
            Utils.ipcSend('stop-tracker');
            self.timebar.querySelector('#js-time-in').parentNode.classList.remove('hide');
            self.timebar.querySelector('#js-time-out').parentNode.classList.add('hide');
            self.timebar.querySelector('#js-break').parentNode.classList.add('hide');
            self.timebar.querySelector('#js-resume').parentNode.classList.add('hide');
        });
    }

    /**
     * Set active the selected menu.
     */
    checkSelectedMenu() {
        if (this.timebar !== null) {
            let menu = window.location.href.split("/").pop().split(".").reverse().pop();
            this.timebar.querySelector(`.js-menu a[data-page="${menu}"]`).classList.add('is-active');
        }
    }

};

module.exports = Timebar;