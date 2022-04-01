const { MSICreator } = require('electron-wix-msi');
var fs = require('fs');

// _app/builds/VAclient-win32-x64
// _app/builds/VAclient-win32-ia32
// -stable-x64-${version}
// -stable-ia32-${version}
var version = process.env.npm_package_version

const msiCreator_x64 = new MSICreator({
    appDirectory: process.cwd() + '/../_app/builds/VaClientApp-win32-x64',
    description: 'Virtudesk VaClient ' + version,
    exe: `VaClientApp`,
    name: 'Virtudesk VaClient',
    manufacturer: 'Virtudesk',
    version: version,
    appIconPath: process.cwd() + '/src/icon.ico',
    outputDirectory: process.cwd() + '/../_app/installers/win32/x64',
    ui: {
        enabled: true,
        chooseDirectory: true
    }
});
//C:\Users\User\Desktop\timedly\_app
const msiCreator_ia32 = new MSICreator({
    appDirectory: process.cwd() + '/../_app/builds/VaClientApp-win32-ia32',
    description: 'Timedly VaClient ' + version,
    exe: `VaClientApp`,
    name: 'Timedly VaClient',
    manufacturer: 'Virtudesk',
    version: version,
    appIconPath: process.cwd() + '/src/icon.ico',
    outputDirectory: process.cwd() + '/../_app/installers/win32/ia32',
    ui: {
        enabled: true,
        chooseDirectory: true
    }
});

msiCreator_x64.create().then(() => {
    console.log('x64 installer template created');
    msiCreator_x64.compile().then(() => {
        const path = process.cwd() + '/../_app/installers/win32/x64'
        fs.rename(`${path}/VaClientApp.msi`, `${path}/VaClientApp-stable-x64-${version}.msi`, function(err) {
            if ( err ) console.log('ERROR: ' + err);
        });
        console.log('x64 installer compiled');
        msiCreator_ia32.create().then(() => {
            console.log('ia32 installer template created');
            msiCreator_ia32.compile().then(() => {
                const path = process.cwd() + '/../_app/installers/win32/ia32'
                fs.rename(`${path}/VaClientApp.msi`, `${path}/VaClientApp-stable-ia32-${version}.msi`, function(err) {
                    if ( err ) console.log('ERROR: ' + err);
                });
                console.log('ia32 installer compiled');
            });
        });
    });
});