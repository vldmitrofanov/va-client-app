const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const TasksComponent = require(path.join(process.env.SCRIPTS_PATH, 'components', 'tasks.js'));

class Tasks extends User {

    constructor() {
        super(true);
        new TasksComponent();
    }
};

module.exports = Tasks;