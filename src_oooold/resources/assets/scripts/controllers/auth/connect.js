const path = require('path');
const cmp = require('semver-compare');

const Utils = require(process.env.UTILS_PATH);
const pkg = require(path.join(process.env.PACKAGE_PATH, 'package.json'));

class Connect {

    constructor() {
        let recon = document.querySelector('.page.page-connect').dataset.recon,
            internet = document.querySelector('.page.page-connect').dataset.internet;

        setTimeout(() => {
            this.doConnect(recon, internet);
        }, recon * 5000);
    }

    doConnect(recon, internet) {
        if (parseInt(internet) === 1) {
            Utils.ajax({
                'url': process.env.API_HOST + '/api/version',
                'method': 'GET'
            }).then(function (response) {
                response = JSON.parse(response);
                if (cmp(response.data.version, pkg.version) === 1) {
                    Utils.render('auth/update', response.data);
                } else {
                    Utils.render('auth/login');
                }
            }).catch(function (err) {
                recon++;
                if (err.case === 0) {
                    Utils.render('auth/connect', { recon: recon, noInternet: true });
                } else {
                    Utils.render('auth/connect', { recon: recon });
                }
            });
        }
    }

};

module.exports = Connect;