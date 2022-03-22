const fs = require('fs');
const path = require('path');
const pkgPath = path.join(process.cwd(), '../', '_app');

const exempt = ['.gitkeep'];

let itemPath = '';
let deleteFolderRecursive = (path) => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                console.log('delete', curPath);
                fs.unlinkSync(curPath);
            }
        });
        console.log('delete', path);
        fs.rmdirSync(path);
    }
};

// clean builds
fs.readdir(path.join(pkgPath, 'builds'), function (err, items) {
    items.forEach((item) => {
        if (exempt.indexOf(item) === -1) {
            itemPath = path.join(pkgPath, 'builds', item);
            if(fs.lstatSync(itemPath).isDirectory()) {
                deleteFolderRecursive(itemPath);
            } else {
                console.log('delete', itemPath);
                fs.unlinkSync(itemPath);
            }
        }
    });
});

// clean installers windows
fs.readdir(path.join(pkgPath, 'installers', 'win32', 'x64'), function (err, items) {
    items.forEach((item) => {
        if (exempt.indexOf(item) === -1) {
            itemPath = path.join(pkgPath, 'installers', 'win32', 'x64', item);
            if(fs.lstatSync(itemPath).isDirectory()) {
                deleteFolderRecursive(itemPath);
            } else {
                console.log('delete', itemPath);
                fs.unlinkSync(itemPath);
            }
        }
    });
});

fs.readdir(path.join(pkgPath, 'installers', 'win32', 'ia32'), function (err, items) {
    items.forEach((item) => {
        if (exempt.indexOf(item) === -1) {
            itemPath = path.join(pkgPath, 'installers', 'win32', 'ia32', item);
            if(fs.lstatSync(itemPath).isDirectory()) {
                deleteFolderRecursive(itemPath);
            } else {
                console.log('delete', itemPath);
                fs.unlinkSync(itemPath);
            }
        }
    });
});

// clean installers darwin
fs.readdir(path.join(pkgPath, 'installers', 'darwin'), function (err, items) {
    items.forEach((item) => {
        if (exempt.indexOf(item) === -1) {
            itemPath = path.join(pkgPath, 'installers', 'darwin', item);
            if(fs.lstatSync(itemPath).isDirectory()) {
                deleteFolderRecursive(itemPath);
            } else {
                console.log('delete', itemPath);
                fs.unlinkSync(itemPath);
            }
        }
    });
});