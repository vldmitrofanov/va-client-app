const Utils = require(process.env.UTILS_PATH);

class VA {
    constructor() {
        Utils.router(window.location.href);
        this.bind();
    }

    bind() {
        document.querySelectorAll('.modal .modal-close').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                this.parentNode.classList.remove('is-active');
            });
        });
    }
}

new VA();