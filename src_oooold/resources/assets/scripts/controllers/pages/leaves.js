const path = require('path');

const User = require(path.join(process.env.SCRIPTS_PATH, 'user.js'));
const Utils = require(process.env.UTILS_PATH);

class Leaves extends User {

    constructor() {
        super();
        // TODO
    }
};

module.exports = Leaves;