const fs = require('fs');
const path = require('path');
const Utils = require(process.env.UTILS_PATH);

class Login {

    constructor() {
        this.bind();
        this.loadUserData();
    }

    /**
     * Prepare bindings.
     */
    bind() {
        let self = this;

        document.querySelector('.page-login .notification .delete').addEventListener('click', function (e) {
            e.preventDefault();
            this.parentNode.classList.add('hide');
        });

        document.querySelector('.js-login-form #email').addEventListener('keyup', function (e) {
            e.preventDefault();
            if (e.keyCode === 13) {
                self.doLogin();
            }
        });

        document.querySelector('.js-login-form #password').addEventListener('keyup', function (e) {
            e.preventDefault();
            if (e.keyCode === 13) {
                self.doLogin();
            }
        });

        document.querySelector('.js-login-form #submit').addEventListener('click', function (e) {
            e.preventDefault();
            self.doLogin();
        }, false);
    }

    /**
     * Load stored user data.
     */
    loadUserData() {
        let userFilePath = path.join(process.env.USER_DATA_PATH, 'user.json');
        if (fs.existsSync(userFilePath)) {
            let userData = require(userFilePath);
            document.querySelector('.js-login-form #email').value = userData.email;
            document.querySelector('.js-login-form #password').value = userData.password;
            document.querySelector('.js-login-form #remember-me').checked = true;
        }
    }

    /**
     * Do login action.
     */
    doLogin() {
        let btn = document.querySelector('.js-login-form #submit');
        btn.classList.add('is-loading');

        document.querySelector('.page-login .error-notification').classList.add('hide');

        let email = document.querySelector('.js-login-form #email').value,
            password = document.querySelector('.js-login-form #password').value,
            remember = document.querySelector('.js-login-form #remember-me').checked;

        if (process.env.DEBUG_MODE === 'true' && email === '' && password === '') {
            email = "vatest1@virtudesk.com";
            password = "password";
        }

        Utils.ajax({
            'url': process.env.API_HOST + '/api/auth/login',
            'method': 'POST',
            'data': {
                'email': email,
                'password': password,
                'app_ver': process.env.PACKAGE_VER
            }
        }).then(function (response) {
            btn.classList.remove('is-loading');
            response = JSON.parse(response);
            if (response.status === 'success') {
                Utils.ipcSend('set-user-data', response.user, response.settings, remember, email, password);
                Utils.render('pages/dashboard');
            } else {
                document.querySelector('.js-login-form #email').value = '';
                document.querySelector('.js-login-form #password').value = '';
                document.querySelector('.page-login .error-notification #error-msg').innerHTML = response.error_msg;
                document.querySelector('.page-login .error-notification').classList.remove('hide');
            }
        }).catch(function (err) {
            console.log(err);
        });
    }

};

module.exports = Login;