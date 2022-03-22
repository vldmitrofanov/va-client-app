const path = require('path');

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));

class Sidebar {

    constructor() {
        this.sidebar = document.querySelector('.js-sidebar');
        if (this.sidebar) {
            this.modal = this.sidebar.querySelector('.modal.modal-logout');
            this.modalTask = this.sidebar.querySelector('.modal.modal-logout-task');
        }

        this.listen();
        this.bind();
        this.checkSelectedMenu();
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        let self = this;
        Utils.ipcOn('prevent-logout', function (event) {
            if(self.modal) {
                self.modal.classList.add('is-active');
            }
        });

        Utils.ipcOn('prevent-logout-task', function (event) {
            self.modalTask.classList.add('is-active');
        });
    }

    /**
     * Bind component actions.
     */
    bind() {
        let self = this;
        if (this.sidebar !== null) {
            this.sidebar.querySelector('#js-logout').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');

                Utils.get('USERTASK_ID').then(function (taskValue) {
                    if (taskValue !== null) {
                        if (parseInt(taskValue) !== 0) {
                            self.modalTask.classList.add('is-active');
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
                                    self.modal.classList.add('is-active');
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

            }, false);

            this.sidebar.querySelectorAll('.js-menu li a').forEach(function (menu) {
                menu.addEventListener('click', function (e) {
                    e.preventDefault();
                    Utils.render(`pages/${this.dataset.page}`);
                });
            });

            this.modal.querySelector('.modal-close').addEventListener('click', function (e) {
                e.preventDefault();
                self.modal.classList.remove('is-active');
            });

            // in modal buttons

            this.modal.querySelector('.js-logout-cancel').addEventListener('click', function (e) {
                e.preventDefault();
                self.modal.classList.remove('is-active');
            });

            this.modal.querySelector('.js-real-logout').addEventListener('click', function (e) {
                e.preventDefault();
                self.modal.classList.remove('is-active');
                self.doLogout().then(function () {
                    self.sidebar.querySelector('#js-logout').remove('is-loading');
                }).catch(function (err) {
                    self.sidebar.querySelector('#js-logout').remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });

            this.modalTask.querySelector('.js-logout-task-cancel').addEventListener('click', function (e) {
                e.preventDefault();
                self.modalTask.classList.remove('is-active');
            });

            this.modalTask.querySelector('.js-logout-task-out').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');
                self.doLogout().then(function () {
                    btn.classList.remove('is-loading');
                    self.modalTask.classList.remove('is-active');
                    self.sidebar.querySelector('#js-logout').remove('is-loading');
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
     * Set active the selected menu.
     */
    checkSelectedMenu() {
        if (this.sidebar !== null) {
            let menu = window.location.href.split("/").pop().split(".").reverse().pop();
            this.sidebar.querySelector(`.js-menu li a[data-page="${menu}"]`).classList.add('is-active');
        }
    }

};

module.exports = Sidebar;