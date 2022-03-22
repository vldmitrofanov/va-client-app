const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const Schedule = require(path.join(process.env.SCRIPTS_PATH, 'components', 'schedule.js'));
const Reports = require(path.join(process.env.SCRIPTS_PATH, 'components', 'reports.js'));
const Timesheet = require(path.join(process.env.SCRIPTS_PATH, 'components', 'timesheet.js'));

class Dashboard extends User {

    constructor() {
        super(true);
        new Schedule('today');
        new Reports();
        new Timesheet();
    }

};

module.exports = Dashboard;