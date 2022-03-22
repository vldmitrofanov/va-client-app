const path = require('path');

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));

class Timesheet {

    constructor() {
        this.listen();
        this.populate();
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        let self = this;

        Utils.ipcOn('render-TimesheetItem', function (event, html) {
            document.querySelector('.js-timesheet table tbody').innerHTML = html;
            self.bind();
        });
    }

    /**
     * Populate component view.
     */
    populate() {
        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/timesheets',
            'method': 'GET'
        }).then(function (response) {
            response = JSON.parse(response);
            Utils.ipcSend('compile-twig', 'TimesheetItem', 'components/timesheet-item', response.data);
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
        this.timesheet = document.querySelector('.js-timesheet');
        let self = this,
            modal = this.timesheet.querySelector('.modal');

        this.timesheet.querySelectorAll('.js-btn-confirm').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                btn.classList.add('is-loading');
                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/confirm-attendance',
                    'method': 'POST',
                    'data': {
                        'id': this.dataset.id
                    }
                }).then(function (response) {
                    btn.classList.remove('is-loading');
                    response = JSON.parse(response);
                    Utils.render('pages/timesheet');
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            });
        });

        this.timesheet.querySelectorAll('.js-btn-dispute').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();

                modal.querySelector('.js-dispute-submit').dataset.id = this.dataset.id;
                modal.classList.add('is-active');
            });
        });

        modal.querySelector('.js-dispute-submit').addEventListener('click', function (e) {
            e.preventDefault();
            let btn = this,
                description = modal.querySelector('.textarea').value;

            if (description !== "") {
                btn.classList.add('is-loading');
                modal.querySelector('.textarea').value = '';
                modal.classList.remove('is-active');

                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/dispute-attendance',
                    'method': 'POST',
                    'data': {
                        'id': this.dataset.id,
                        'description': description,
                    }
                }).then(function (response) {
                    btn.classList.remove('is-loading');
                    response = JSON.parse(response);
                    Utils.render('pages/timesheet');
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    if (err.case === 'timeout') {
                        Notification.timeout();
                    } else {
                        Notification.error(err.case);
                    }
                });
            } else {
                btn.classList.remove('is-loading');
                modal.querySelector('.error-notification').classList.remove('hide');
            }
        });

        modal.querySelector('.error-notification .delete').addEventListener('click', function (e) {
            e.preventDefault();
            modal.querySelector('.error-notification').classList.add('hide');
        });

        modal.querySelector('.modal-close').addEventListener('click', function (e) {
            e.preventDefault();
            modal.classList.remove('is-active');
        });
    }

}

module.exports = Timesheet;