const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const TimeSheetComponent = require(path.join(process.env.SCRIPTS_PATH, 'components', 'timesheet.js'));

class Timesheet extends User {

    constructor() {
        super();
        new TimeSheetComponent();
    }

};

module.exports = Timesheet;