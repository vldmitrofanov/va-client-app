const Utils = require(process.env.UTILS_PATH);

class Notification {

    constructor() {
        this.observe();
        this.listen();
    }

    /**
     * Observe changes on handle.
     */
    observe() {
        let notification = document.querySelector('.js-notification');
        Utils.makeObserver('notification', notification, {
            childList: true,
        }, function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function (node) {
                        let btn = node.querySelector('button.delete');
                        if (btn) {
                            btn.addEventListener('click', function (e) {
                                e.preventDefault();
                                node.classList.add('hide');
                            });
                        }
                    });
                }
            });
        });
    }

    /**
     * Listen to ipc events.
     */
    listen() {
        Utils.ipcOn('render-Notification', function (event, html) {
            let temp = document.createElement('div');
            temp.innerHTML = html;
            document.querySelector('.notifications').appendChild(temp.firstChild);
        }, true);
    }

    /**
     * Creates a notification.
     * 
     * @param {string} msg Message to display
     * @param {string} level can be primary, link, info, success, warning, danger
     * @param {boolean} close true, false
     * @param {int} timeout seconds before this close automatically (TODO)
     * @param {string} slug unique slug for the timeout, to avoid duplicates
     */
    static create(msg, level, close, timeout, slug) {
        let levels = ['primary', 'link', 'info', 'success', 'warning', 'danger'];
        level = (typeof level === 'undefined' || levels.indexOf(level) < 0) ? 'info' : level;
        close = (typeof close === 'undefined') ? true : close;
        timeout = (typeof timeout === 'undefined') ? 0 : timeout;
        slug = (typeof slug === 'undefined') ? Utils.uuidv4() : slug;

        Notification.remove(slug);

        Utils.ipcSend('compile-twig', 'Notification', 'components/notification', {
            "msg": msg,
            "level": level,
            "close": close,
            "timeout": timeout,
            "slug": slug
        });
    }

    /**
     * Removes a specific notification.
     * 
     * @param {string} slug 
     */
    static remove(slug) {
        if (document.querySelector('.notifications')) {
            let notif = document.querySelector('.notifications').querySelector('.notification-' + slug);
            if (notif) {
                notif.remove();
            }
        }
    }

    /**
     * Shorthand for timeout notifications.
     */
    static timeout() {
        Notification.create('Connection Timeout! Please check your connection and try again.', 'danger', true, 0, 'connection-timeout');
    }

    /**
     * Shorthand for error notification.
     * 
     * @param {string} msg 
     */
    static error(msg) {
        Notification.create(`Error ${msg}`, "danger", true, 0, `request-error-${msg}`);
    }

};

module.exports = Notification;