const { MSICreator } = require('electron-wix-msi');

// _app/builds/VAclient-win32-x64
// _app/builds/VAclient-win32-ia32

const msiCreator_x64 = new MSICreator({
	appDirectory: process.cwd() + '/../_app/builds/VAclient-win32-x64',
	description: 'VirtuDesk App ' + process.env.npm_package_version,
	exe: 'vaclient',
	name: 'VA Client',
	manufacturer: 'VirtuDesk',
	version: process.env.npm_package_version,
	outputDirectory: process.cwd() + '/../_app/installers/win32/x64',
	ui: {
		enabled: true,
		chooseDirectory: true
	}
});

const msiCreator_ia32 = new MSICreator({
	appDirectory: process.cwd() + '/../_app/builds/VAclient-win32-ia32',
	description: 'VirtuDesk App ' + process.env.npm_package_version,
	exe: 'vaclient',
	name: 'VA Client',
	manufacturer: 'VirtuDesk',
	version: process.env.npm_package_version,
	outputDirectory: process.cwd() + '/../_app/installers/win32/ia32',
	ui: {
		enabled: true,
		chooseDirectory: true
	}
});

msiCreator_x64.create().then(() => {
	console.log('x64 installer template created');
	msiCreator_x64.compile().then(() => {
		console.log('x64 installer compiled');
		msiCreator_ia32.create().then(() => {
			console.log('ia32 installer template created');
			msiCreator_ia32.compile().then(() => {
				console.log('ia32 installer compiled');
			});
		});
	});
});