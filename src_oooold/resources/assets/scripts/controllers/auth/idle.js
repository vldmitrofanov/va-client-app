const path = require('path');

const Utils = require(process.env.UTILS_PATH);

class Idle {

    constructor() {
        this.playSound();
        this.bind();
    }

    /**
     * Play idle sound.
     */
    playSound() {
        let mp3 = path.join(process.env.SRC_PATH, 'message.mp3'),
            audio = new Audio(mp3);
        audio.currentTime = 0;
        audio.play();
    }

    /**
     * Bind actions.
     */
    bind() {
        let self = this;
        this.wrapper = document.querySelector('.js-idle');

        Utils.ajax({
            'url': process.env.API_HOST + '/api/users/idle-start',
            'method': 'POST'
        }).then(function (response) {
            self.wrapper.querySelector('#resume').addEventListener('click', function (e) {
                e.preventDefault();
                let btn = this;
                btn.classList.add('is-loading');

                Utils.ajax({
                    'url': process.env.API_HOST + '/api/users/idle-stop',
                    'method': 'POST'
                }).then(function (resp) {
                    btn.classList.remove('is-loading');

                    Utils.ipcSend('user-active');
                    Utils.render('pages/dashboard');
                }).catch(function (err) {
                    console.log(err);
                });
            });
        }).catch(function (err) {
            console.log(err);
        });
    }
};

module.exports = Idle;