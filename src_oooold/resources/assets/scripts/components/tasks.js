const path = require('path');
const remote = require('electron').remote;

const Utils = require(process.env.UTILS_PATH);
const Notification = require(path.join(process.env.SCRIPTS_PATH, 'components', 'notification.js'));
const Timebar = require(path.join(process.env.SCRIPTS_PATH, 'components', 'timebar.js'));
const Timer = require(path.join(process.env.SCRIPTS_PATH, 'Timer.js'));

class Tasks {

    constructor(tb, populate) {
        populate = (typeof populate === 'undefined') ? true : populate;
        this.tb = tb;
        this.bind();
        this.listen();
        if (populate) {
            Tasks.populate();
        }
    }

    /**
     * Bind task selector.
     */
    bind() {
        this.timerInterval = false;
        this.tasks = document.querySelector('.js-tasks');
    }

    /**
     * Check for timebar status.
     */
    timebarChecker() {
        let self = this;
        return new Promise((resolve, reject) => {
            if (self.tb instanceof Timebar) {
                if (self.tb.onBreak) {
                    self.tb.doResume().then(resolve).catch(reject);
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        let self = this;
        Utils.ipcOn('render-TaskItem', function (event, html) {
            self.tasks.querySelector('.js-tasks-table tbody').innerHTML = html;

            document.querySelectorAll('.js-start-task').forEach(function (task) {
                task.addEventListener('click', function (e) {
                    e.preventDefault();

                    self.timebarChecker().then(() => {
                        task.classList.add('is-loading');

                        Utils.ajax({
                            'url': process.env.API_HOST + '/api/users/tasks',
                            'method': 'POST',
                            'data': {
                                'name': task.dataset.name,
                                'description': task.dataset.description,
                            }
                        }).then(function (response) {
                            response = JSON.parse(response);
                            if (response.status === 'success') {
                                Utils.set('USERTASK_ID', response.data.id).then(function () {
                                    task.classList.remove('is-loading');

                                    clearInterval(self.timerInterval);
                                    self.timerInterval = false;

                                    task.classList.add('hide');
                                    let taskStop = task.parentNode.querySelector('.js-stop-task');
                                    taskStop.classList.remove('hide');
                                    taskStop.dataset.id = response.data.id;
                                    let taskTimer = task.parentNode.querySelector('.js-task-timer');
                                    taskTimer.classList.remove('hide');
                                    taskTimer.dataset.seconds = response.data.seconds;
                                    Tasks.setTimer(taskTimer, response.data.seconds, response.data.id);

                                    document.querySelectorAll('.js-start-task').forEach(function (task) {
                                        task.classList.add('hide');
                                    });
                                });
                            }
                        }).catch(function (err) {
                            task.classList.remove('is-loading');
                            if (err.case === 'timeout') {
                                Notification.timeout();
                            } else {
                                Notification.error(err.case);
                            }
                        });
                    });
                });
            });

            document.querySelectorAll('.js-stop-task').forEach(function (task) {
                task.addEventListener('click', function (e) {
                    e.preventDefault();
                    let id = task.dataset.id;
                    task.classList.add('is-loading');

                    Utils.ajax({
                        'url': process.env.API_HOST + '/api/users/tasks/' + id,
                        'method': 'PUT'
                    }).then(function (response) {
                        response = JSON.parse(response);
                        if (response.status === 'success') {
                            Utils.set('USERTASK_ID', null).then(function () {
                                let el = task.parentNode.querySelector('.js-task-timer');
                                let elParent = el.parentNode,
                                    elClassList = el.classList,
                                    elDatasetSeconds = 0,
                                    newEl = document.createElement('span');
                                newEl.classList = elClassList;
                                newEl.dataset.id = id;
                                newEl.dataset.seconds = elDatasetSeconds;
                                newEl.dataset.startTimestamp = Date.now();
                                el.remove();
                                elParent.appendChild(newEl);

                                task.classList.remove('is-loading');
                                task.classList.add('hide');
                                let taskStart = task.parentNode.querySelector('.js-start-task');
                                taskStart.classList.remove('hide');
                                task.dataset.id = 0;
                                let taskTimer = task.parentNode.querySelector('.js-task-timer');
                                taskTimer.classList.add('hide');

                                document.querySelectorAll('.js-start-task').forEach(function (task) {
                                    task.classList.remove('hide');
                                });
                            });
                        }
                    }).catch(function (err) {
                        task.classList.remove('is-loading');
                        if (err.case === 'timeout') {
                            Notification.timeout();
                        } else {
                            Notification.error(err.case);
                        }
                    });
                });
            });

            document.querySelectorAll('.js-task-timer').forEach(function (timer) {
                if (timer.dataset.seconds > 0) {
                    Tasks.setTimer(timer, timer.dataset.seconds, timer.dataset.id, true);

                    document.querySelectorAll('.js-start-task').forEach(function (task) {
                        task.classList.add('hide');
                    });
                }
            });
        });
    }

    /**
     * Set task timer.
     * 
     * @param {Node} el 
     * @param {int} seconds 
     */
    static setTimer(el, seconds, taskId, newTimer) {
        newTimer = (typeof newTimer === 'undefined') ? true : newTimer;
        seconds = (typeof seconds === 'undefined') ? 0 : seconds;

        // recreate el to kill old timer
        let elParent = el.parentNode,
            elClassList = el.classList,
            elDatasetSeconds = el.dataset.seconds,
            elId = el.dataset.id,
            newEl = document.createElement('span');
        newEl.classList = elClassList;
        newEl.dataset.id = elId;
        newEl.dataset.seconds = elDatasetSeconds;
        newEl.dataset.startTimestamp = Date.now();
        el.remove();
        elParent.appendChild(newEl);
        el = newEl;

        let timerKey = 'task' + taskId;

        Utils.ipcSend('task-timer-start', {
            'offset': seconds,
            'broadcastName': 'task-timer-' + taskId
        });

        Tasks.listenToTaskTimer(taskId, function (ticks) {
            let secs = ticks,
                mins = 0,
                hours = 0;

            if (secs >= 60) {
                mins = Math.floor(secs / 60);
                secs = secs % 60;
            }
            if (mins >= 60) {
                hours = Math.floor(mins / 60);
                mins = mins % 60;
            }

            el.innerText = Utils.pad(hours, 2) + ':' + Utils.pad(mins, 2) + ':' + Utils.pad(secs, 2);
            el.dataset.seconds = ticks;
        });
    }

    static listenToTaskTimer(taskId, callback) {
        Utils.ipcOn('task-timer-' + taskId, function (event, ticks) {
            if (typeof callback === 'function') {
                callback(ticks);
            }
        }, true);
    }

    /**
     * Populate task component.
     */
    static populate() {
        document.querySelector('.js-tasks-table tbody').innerHTML = '<tr><td colspan="4" align="center"><i class="fas fa-sync fa-spin"></i> Fetching Data...</td></tr>';

        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/tasks',
            'method': 'GET',
        }).then(function (response) {
            response = JSON.parse(response);
            Utils.ipcSend('compile-twig', 'TaskItem', 'components/task-item', response.data);
        }).catch(function (err) {
            if (err.case === 'timeout') {
                Notification.timeout();
            } else {
                Notification.error(err.case);
            }
        });
    }

}

module.exports = Tasks;