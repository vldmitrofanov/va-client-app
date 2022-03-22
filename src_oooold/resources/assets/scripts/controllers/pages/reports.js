const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const ReportsComponent = require(path.join(process.env.SCRIPTS_PATH, 'components', 'reports.js'));

class Reports extends User {

    constructor() {
        super();
        new ReportsComponent();
    }

};

module.exports = Reports;