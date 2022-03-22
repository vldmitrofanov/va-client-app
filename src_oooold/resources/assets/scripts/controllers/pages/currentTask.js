const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const Tasks = require(path.join(process.env.SCRIPTS_PATH, 'components', 'tasks.js'));

class currentTask extends User {

    constructor() {
        super(false);
        let el = document.querySelector('.current-task .js-task-timer');
        if (el !== null) {
            let offsetSec = Math.floor((parseInt(Date.now()) - parseInt(el.dataset.startrender)) / 1000),
                timerSec = parseInt(el.dataset.seconds) + offsetSec;
            Tasks.setTimer(el, el.dataset.seconds, el.dataset.id, false);
        }
    }
};

module.exports = currentTask;