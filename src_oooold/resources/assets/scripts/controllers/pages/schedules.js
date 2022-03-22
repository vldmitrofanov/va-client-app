const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const Schedule = require(path.join(process.env.SCRIPTS_PATH, 'components', 'schedule.js'));

class Schedules extends User {

    constructor() {
        super();
        new Schedule();
    }

};

module.exports = Schedules;