const shell = require('electron').shell;

class Update {

    constructor() {
        
        document.querySelector('.page-update .download-link').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                shell.openExternal(this.href);
            });
        });

    }

};

module.exports = Update;