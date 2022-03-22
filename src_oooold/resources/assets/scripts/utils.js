const path = require('path');

class Utils {

    /**
     * Async Request.
     * @param {object} params
     * {url, method, data}
     * 
     * @return {Promise}
     */
    static ajax(params, timeout) {
        return new Promise(function (resolve, reject) {
            process.env.REQUEST_TIMEOUT = (typeof process.env.REQUEST_TIMEOUT === 'undefined') ? 300000 : process.env.REQUEST_TIMEOUT;
            process.env.REQUEST_TIMEOUT = (typeof timeout !== 'undefined') ? timeout : process.env.REQUEST_TIMEOUT;
            let xhr = new XMLHttpRequest();
            if (params.method === 'GET') {
                let getParams = [];
                getParams.push('access_token=' + process.env.ACCESS_TOKEN);
                for (let i in params.data) {
                    getParams.push(i + '=' + params.data[i]);
                }
                params.url = params.url + '?' + getParams.join('&');
            }
            // PHP have some security restrictions against PUT.
            // This is how laravel handles it.
            if (params.method === 'PUT') {
                if (typeof params.data === 'undefined') {
                    params.data = { '_method': 'PUT' };
                } else {
                    params.data['_method'] = 'PUT';
                }
                params.method = 'POST';
            }
            xhr.open(params.method, params.url, true);
            xhr.timeout = process.env.REQUEST_TIMEOUT;
            if (!(params.data instanceof FormData) && params.method !== 'GET') {
                let formData = new FormData();
                for (let i in params.data) {
                    formData.append(i, params.data[i]);
                }
                formData.append('access_token', process.env.ACCESS_TOKEN);
                params.data = formData;
            }
            xhr.ontimeout = function (e) {
                reject({
                    status: "error",
                    case: "timeout"
                });
            };
            xhr.send(params.data);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let response = JSON.parse(xhr.responseText);
                        if (response.status === 'error' && typeof response.case === 'undefined' && response.case === 'auth') {
                            Utils.render('auth/login', { err: "You have been logged out." });
                        } else {
                            resolve(xhr.responseText);
                        }
                    } else {
                        reject({
                            status: "error",
                            case: xhr.status
                        });
                    }
                }
            }
        });
    };

    /**
     * Render the twig template with data.
     * @param {string} view 
     * @param {object} twigData 
     */
    static render(view, twigData) {
        const routes = require(process.env.RES_PATH + '/assets/routes.json');
        if (typeof routes[view] !== 'undefined') {
            view = 'file://' + process.env.RES_PATH + '/views/' + view + '.html.twig';
            twigData = (typeof twigData === 'undefined') ? {} : twigData;
            twigData = Utils.extend(twigData, { resPath: process.env.RES_PATH, appVer: process.env.PACKAGE_VER, ver: process.env.PACKAGE_VER });
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('render-view', view, twigData);
        }
    };

    /**
     * Extend an objects.
     * @param {object} a 
     * @param {object} b 
     * 
     * @return {object}
     */
    static extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }
        return a;
    }

    /**
     * Routes the paths to their controller js.
     * @param {string} path 
     */
    static router(path) {
        const routes = require(process.env.RES_PATH + '/assets/routes.json');
        const regex = /(.*)src\/resources\/views\/(.*).html.twig/g;
        let match = regex.exec(path);
        if (match === null) {
            console.log('path', path);
        }
        if (match !== null && match.length === 3 && typeof routes[match[2]] !== 'undefined') {
            let cls = require(process.env.RES_PATH + '/assets/scripts/controllers/' + routes[match[2]].controller + ".js");
            new cls();
        }
    }

    /**
     * Trigger an ipc event.
     */
    static ipcSend() {
        const { ipcRenderer } = require('electron');
        ipcRenderer.send.apply(null, arguments);
    }

    /**
     * Bind an ipc event.
     * @param {string} event 
     * @param {function} callback 
     * @param {boolean} multi 
     */
    static ipcOn(event, callback, multi) {
        const { ipcRenderer } = require('electron');
        multi = (typeof multi === 'undefined') ? false : multi;
        if (multi) {
            ipcRenderer.on(event, callback);
        } else {
            ipcRenderer.once(event, callback);
        }
    }

    static ipcEvent(eventName, callback) {
        Utils.ipcOn(`eventInvoke:${eventName}`, callback, true);
    }

    /**
     * Generate UUID
     */
    static uuidv4() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        )
    }

    /**
     * Creates a mutation observer.
     * 
     * @param {string} indexName 
     * @param {HTMLElement} element 
     * @param {object} mutationOptions 
     * @param {function} callback 
     */
    static makeObserver(indexName, element, mutationOptions, callback) {
        if (typeof window.observerList === 'undefined') { window['observerList'] = []; }
        if (typeof window.observerList[indexName] === 'undefined') {
            if (typeof callback === 'function') {
                window.observerList[indexName] = new MutationObserver(function (mutations) {
                    if (typeof callback === 'function') {
                        callback(mutations);
                    }
                });
                if (window.observerList[indexName] instanceof MutationObserver && element instanceof Node) {
                    window.observerList[indexName].observe(element, mutationOptions);
                }
            }
        }
    };

    static set(key, val) {
        return new Promise(function (resolve, reject) {
            Utils.ipcOn('set-key-' + key, function (event) {
                resolve();
            });
            Utils.ipcSend('set-key', key, val);
        });
    }

    static get(key) {
        return new Promise(function (resolve, reject) {
            Utils.ipcOn('get-key-' + key, function (event, value) {
                resolve(value);
            });
            Utils.ipcSend('get-key', key);
        });
    }

    static childTimer(options, callback) {
        const { fork } = require('child_process');
        let forkedChild = fork(path.join(process.env.RES_PATH, 'assets', 'scripts', 'ChildTimer.js'));

        forkedChild.on('close', function () {
            forkedChild = false;
        });

        forkedChild.on('disconnect', function () {
            forkedChild = false;
        });

        forkedChild.on('exit', function () {
            forkedChild = false;
        });

        forkedChild.on('error', function () {
            forkedChild.kill();
            forkedChild = false;
        });

        forkedChild.on('message', function (msg) {
            if (typeof callback === 'function') {
                callback(msg.ticks);
            }
        });

        return {
            start: function () {
                if (forkedChild) {
                    forkedChild.send({
                        type: 'start',
                        options: options
                    });
                }
            },
            pause: function () {
                if (forkedChild) {
                    forkedChild.send({ type: 'pause' });
                }
            },
            reset: function () {
                if (forkedChild) {
                    forkedChild.send({ type: 'reset' });
                }
            },
            stop: function () {
                if (forkedChild) {
                    forkedChild.send({ type: 'stop' });
                }
            }
        };
    }

    static getGlobal(namespace) {
        let parts = namespace.split('.'),
            handle = global;
        parts.every(function (part) {
            if (typeof handle[part] !== 'undefined') {
                handle = handle[part];
            } else {
                handle = false;
                return false;
            }
        });
        return handle;
    }

    /**
     * Prefix leading zeroes.
     * 
     * @param {int} num 
     * @param {int} size 
     */
    static pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }
}

module.exports = Utils;