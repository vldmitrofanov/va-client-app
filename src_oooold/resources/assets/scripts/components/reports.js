const path = require('path');

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));

class ReportsList {

    constructor() {
        this.bind();
        this.listen();
        ReportsList.populate();
    }

    /**
     * Bind component actions.
     */
    bind() {
        this.reports = document.querySelector('.js-reports');

        let self = this,
            modal = this.reports.querySelector('.modal'),
            form = this.reports.querySelector('.form');

        this.reports.querySelector('.js-new').addEventListener('click', function (e) {
            e.preventDefault();
            modal.classList.add('is-active');
        });

        form.querySelector('button.js-btn-send').addEventListener('click', function (e) {
            e.preventDefault();
            let btn = this;
            btn.classList.add('is-loading');

            let type = form.querySelector('select.js-form-type'),
                report = form.querySelector('textarea.js-form-report');

            if (report.value !== '') {
                Utils.ajax({
                    'url': `${process.env.API_HOST}/api/users/${type.value}`,
                    'method': 'POST',
                    'data': {
                        'report': report.value
                    }
                }).then(function (response) {
                    btn.classList.remove('is-loading');
                    modal.classList.remove('is-active');
                    ReportsList.populate();
                    Notification.remove('no-sod');
                    Notification.create("New report submitted!", "success");
                    type.selectedIndex = 0;
                    report.value = '';
                    if (typeof self.callback === 'function') {
                        self.callback();
                    }
                }).catch(function (err) {
                    btn.classList.remove('is-loading');
                    modal.classList.remove('is-active');
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
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        let self = this;
        Utils.ipcOn('render-ReportItem', function (event, html) {
            self.reports.querySelector('.js-filed-reports tbody').innerHTML = html;
        }, true);
    }

    /**
     * Populate reports view.
     */
    static populate() {
        document.querySelector('.js-filed-reports tbody').innerHTML = '<tr><td colspan="3" align="center"><div class="loading-data"><i class="fas fa-sync fa-spin"></i> Fetching Data...</div></td></tr>';

        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/reports',
            'method': 'POST'
        }).then(function (response) {
            response = JSON.parse(response);
            Utils.ipcSend('compile-twig', 'ReportItem', 'components/report-item', response.data);
        }).catch(function (err) {
            if (err.case === 'timeout') {
                Notification.timeout();
            } else {
                Notification.error(err.case);
            }
        });
    }

}

module.exports = ReportsList;