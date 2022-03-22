const path = require('path');

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));

class Schedule {

    constructor(current) {
        this.listen();
        this.populate(current);
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        Utils.ipcOn('render-ScheduleItem', function (event, html) {
            document.querySelector('.js-schedules table tbody').innerHTML = html;
        });
    }

    /**
     * Populate the schedule view.
     * 
     * @param {string} current 
     */
    populate(current) {
        current = (typeof current !== 'undefined') ? current : false;
        let itemTemplate = (current) ? 'components/schedule-today-item' : 'components/schedule-item';
        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/schedules',
            'method': 'GET',
            'data': {
                'current': current
            }
        }).then(function (response) {
            response = JSON.parse(response);
            Utils.ipcSend('compile-twig', 'ScheduleItem', itemTemplate, response.data);
        }).catch(function (err) {
            if(err.case === 'timeout') {
                Notification.timeout();
            } else {
                Notification.error(err.case);
            }
        });
    }

};

module.exports = Schedule;