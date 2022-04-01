## Current dev software versions:
```
npm -v
7.16.0

node -v
v14.17.0
```

#### Setup
1. Install [NodeJS](https://nodejs.org/en/)
2. Install [NVM](https://github.com/creationix/nvm)
3. (Optional if not installed) `nvm install 8.9.4`
4. Run `nvm use 8.9.4` or `nvm use`
5. Run `npm install`
6. Make sure `electron-packager` is globally installed. `npm install electron-packager -g`
7. Make sure `electron-installer-dmg` is globally installed. `npm install electron-installer-dmg -g`
8. To build, run `npm run build`
9. To build app for OSX, run `npm run darwin` (for OSX)
10. To build app for Windows, run `npm run win32` (for Windows)

for dev run `npm run dev`

to add github token in windows
[Environment]::SetEnvironmentVariable("GH_TOKEN","<TOKEN>") 
