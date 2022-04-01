const { app, BrowserWindow, ipcMain, net, dialog, autoUpdater } = require('electron')

const url = require('url');
const path = require('path');
const screenshot = require('screenshot-desktop');
const Positioner = require('electron-positioner');
const ioHook = require('iohook');
const fs = require('fs');
const { appSettings } = require('./src/env.js')
var current_os = process.platform;

process.env.NODE_ENV = appSettings.env
    const updateServer = appSettings.software_update_url
    
    const updateUrl = `${updateServer}/update/${process.platform}/${app.getVersion()}`
    console.log('update url: ', updateUrl )

    if (process.env.NODE_ENV != 'development') {
        autoUpdater.setFeedURL({ url: updateUrl })
        setInterval(() => {
            console.log('update Url ' + updateUrl)
            console.log(process.env.NODE_ENV)
            autoUpdater.checkForUpdates()
        }, 6000)
    }
    


let win, workerWindow, user_interval, is_task_started, userid, idle_timer, sc_interval, access_token, kb_count, mouse_count, sc_interval_count, timedly_url, idle_interval_count, idle_count, is_app_exit, site_url, break_timer, user_data, connection_check, user_is_cloked_in

function createWindow() {
    is_task_started = false;
    is_app_exit = false;
    user_eod = '';


    win = new BrowserWindow({
        width: 650,
        height: 610,
        scrollBounce: true,
        resizable: true,
        fullscreen: false,
        movable: true,
        minimizable: true,
        maximizable: false,
        darkTheme: true,
        icon: path.join(__dirname, 'src/icon.icns'),
        webPreferences: { nodeIntegration: true, backgroundThrottling: false }
    });

    if (process.env.NODE_ENV == 'development') {
        win.webContents.openDevTools()
    }

    win.setMenuBarVisibility(false);
    win.setVisibleOnAllWorkspaces(true);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file:',
        slashes: true
    }));

    //worker
    workerWindow = new BrowserWindow({
        width: 200,
        height: 50,
        //frame: false,
        resizable: false,
        fullscreen: false,
        movable: true,
        minimizable: false,
        maximizable: false,
        closable: true,
        darkTheme: true,
        show: false,
        skipTaskbar: true,
        frame: false,
        icon: path.join(__dirname, 'src/icon.icns'),
        webPreferences: { nodeIntegration: true }
    });
    workerWindow.setVisibleOnAllWorkspaces(true);

    workerWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'src/worker.html'),
        protocol: 'file:',
        slashes: true,
    }));

    //win.webContents.openDevTools();

    var positioner = new Positioner(workerWindow);
    positioner.move('bottomCenter');

    win.on('minimize', (e) => {
        console.log('electron mini');
        if (is_task_started == true) {
            win.setAlwaysOnTop(false);
            workerWindow.show();
            workerWindow.setAlwaysOnTop(true);
        }
    });

    win.on('restore', (e) => {
        console.log('electron restore');
        win.setAlwaysOnTop(true);
        workerWindow.hide();
        win.setAlwaysOnTop(false);
    });

    if (current_os == 'darwin') {
        win.on('blur', (e) => {
            if (is_task_started == true) {
                win.setAlwaysOnTop(false);
                win.minimize();
            }
        });
    }

    win.on("close", (e) => {
        console.log('quitting');
        if (user_is_cloked_in == false) {
            is_app_exit = true;
            app.quit();
        }

        if (is_app_exit == false) {
            e.preventDefault();
            confirmAndQuit(e);
        }
    });

    win.on("closed", (e) => {
        win = null;
    });

    workerWindow.on("closed", (e) => {
        workerWindow = null;
    });
}

//template only
function startTimer(name) {
    var user_interval = setInterval(function(name) {
        console.log("Hello " + name);
    }, 5000);
}

ipcMain.on("logged-in", (e, t) => {
    console.log("loggedin", t)
})

ipcMain.on("confirm-logout", (e, t) => {

    console.log('logout user now here');

    is_app_exit = true;
    if (ioHook != null) {
        ioHook.unload();
    }
    win.close();
    workerWindow.close();
});

ipcMain.on("logged-user", (e, t) => {

    //var user_pref = t.split("|");
    // {idle_timer, sc_interval , user_id, access_token, remote_url, resumed}
    //console.log(t)
    userid = t.user_id; // user_pref[2];
    //idle_timer = Math.floor(user_pref[0] / 60) * 60;
    idle_timer = Math.floor(parseInt(t.idle_timer) / 60) * 60;
    if(idle_timer < 60) idle_timer = 600;
    //sc_interval = 20; //for testing
    //sc_interval = Math.floor(user_pref[1] / 60) * 60;
    sc_interval = Math.floor(parseInt(t.sc_interval) / 60) * 60;
    if(sc_interval < 60) sc_interval = 120;
    access_token = t.access_token; //user_pref[3];
    timedly_url = t.remote_url; //user_pref[4];
    site_url = timedly_url.split("//");
    user_is_cloked_in = true;

    console.log("sc interval is", sc_interval);
    console.log("idle timer", idle_timer);

    pingpong_interval = setInterval(function() {
        win.webContents.send('ping-pong', 'ping');
        //console.log('ping this')
    }, 180000);

});

ipcMain.on("ping-error", (event, arg) => {
    has_noconnection = true;
    win.restore();
    win.webContents.send('no-connection', '1');
});

ipcMain.on("message-from-worker", (event, arg) => {
    sendWindowMessage(win, "message-from-worker", arg);
});

ipcMain.on("max-window", (event, arg) => {
    workerWindow.hide();
    win.restore();
});

ipcMain.on("new-task-name", (event, t) => {
    workerWindow.webContents.send("new-task-name", t);
    //console.log("new task " + t);
});

ipcMain.on("start-task", (e, t) => {

    //console.log('sstart tasssk');
    clearTimeout(user_interval);
    win.webContents.send('timer-stop', timer_text);
    clearTimeout(break_timer);
    win.webContents.send('br-timer-stop', timer_text);

    is_task_started = true;
    mouse_count = 0;
    kb_count = 0;
    sc_interval_count = 0;
    idle_interval_count = 0;
    idle_count = 0;

    startActivityTracker();

    let sec = 0;
    let min = 0;
    let hr = 0;

    let sec_display = '';
    let min_display = '';
    let hr_display = '';

    var timer_text = '';

    user_interval = setInterval(function() {
        sc_interval_count += 1;
        idle_interval_count += 1;
        sec += 1;

        if (sec < 10) {
            sec_display = '0' + sec;
        } else {
            sec_display = sec;
        }

        if (sec == 60) {
            sec = 0;
            min += 1;
            sec_display = '0' + sec;
        }

        if (min < 10) {
            min_display = '0' + min;
        } else {
            min_display = min;
        }

        if (min == 60) {
            min = 0;
            hr += 1;
            min_display = '0' + sec;
        }

        if (hr == 24) {
            hr = 0;
        }

        hr_display = hr;

        timer_text = hr_display + ':' + min_display + ':' + sec_display;
        win.webContents.send('timer-start', timer_text);
        workerWindow.webContents.send('timer-start', timer_text);

        console.log(idle_count);

        if (sc_interval_count == sc_interval) {
            sc_interval_count = 0;
            performDesktopCapture();
        }

        if (idle_interval_count == idle_timer) {
            if (idle_count <= 10) {
                performIdleCapture();
            }
        }

        if (idle_interval_count == idle_timer) {
            idle_interval_count = 0;
            idle_count = 0;
        }

    }, 1000);
});

ipcMain.on("stop-task", (e, t) => {
    clearTimeout(user_interval);
    is_task_started = false;
    //console.log("Stop timer object " + t);
    ioHook.stop();
});


ipcMain.on("start-break", (e, t) => {
    clearTimeout(user_interval);
    win.webContents.send('timer-stop', timer_text);
    clearTimeout(break_timer);
    win.webContents.send('br-timer-stop', timer_text);

    is_task_started = true;
    let sec = 0;
    let min = 0;
    let hr = 0;

    let sec_display = '';
    let min_display = '';
    let hr_display = '';

    var timer_text = '';

    break_timer = setInterval(function() {

        sec += 1;

        if (sec < 10) {
            sec_display = '0' + sec;
        } else {
            sec_display = sec;
        }

        if (sec == 60) {
            sec = 0;
            min += 1;
            sec_display = '0' + sec;
        }

        if (min < 10) {
            min_display = '0' + min;
        } else {
            min_display = min;
        }

        if (min == 60) {
            min = 0;
            hr += 1;
            min_display = '0' + sec;
        }

        if (hr == 24) {
            hr = 0;
        }

        hr_display = hr;

        timer_text = hr_display + ':' + min_display + ':' + sec_display;
        win.webContents.send('br-timer-start', timer_text);
        workerWindow.webContents.send('br-timer-start', timer_text);

    }, 1000);
});

ipcMain.on("stop-break", (e, t) => {
    is_task_started = false;
    clearTimeout(break_timer);
    win.webContents.send('br-timer-stop', '0');
    workerWindow.webContents.send('br-timer-stop', '0');
});

ipcMain.on("user-eod", (e, t) => {
    user_od = t;
});

ipcMain.on("app-exit", (e, t) => {
    //if(t == '1'){
    user_is_cloked_in = false;
    //}
    console.log(user_is_cloked_in);
});

function sendWindowMessage(targetWindow, message, payload) {
    if (typeof targetWindow === 'undefined') {
        console.log('Target window does not exist');
        return;
    }
    console.log('called');
    targetWindow.webContents.send(message, payload);
}

function startActivityTracker() {

    //ioHook = require('iohook');

    ioHook.on('mousemove', event => {
        mouse_count += 1;
        idle_count += 1;
        //console.log(mouse_count); // { type: 'mousemove', x: 700, y: 400 }
    });

    ioHook.on('keydown', event => {
        kb_count += 1;
        idle_count += 1;
        //console.log(kb_count); // { type: 'mousemove', x: 700, y: 400 }
    });

    // Register and start hook
    ioHook.start();
}

function performDesktopCapture() {

    user_data = app.getPath('userData');

    let timestamp = +new Date();
    let base64image = '';
    let img_filename = user_data + '/' + userid + '-' + timestamp + '.jpg';

    screenshot({ format: 'jpg', filename: img_filename }).then((img) => {
        var bitmap = fs.readFileSync(img);
        base64image = Buffer.from(bitmap).toString('base64');
        //console.log(base64image);
        //send user activities to server
        performHttp(base64image);
        console.log(img_filename);
        if (fs.existsSync(img_filename)) {
            fs.unlink(img_filename, (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log("File succesfully deleted");
            });
        }
    }).catch((err) => {
        console.log(err)
    })
}

function performIdleCapture() {
    win.restore();
    win.focus();
    win.webContents.send("idle-report", "1");
}

function performHttp(img) {
    var url = timedly_url + '/api/users/screenshot';

    var body = JSON.stringify({
        'access_token': access_token,
        'keyboard_activity': kb_count,
        'mouse_activity': mouse_count,
        'img': img
    });
    const request = net.request({
        method: 'POST',
        protocol: site_url[0],
        hostname: site_url[1],
        path: '/api/users/screenshot',
        redirect: 'follow'
    });

    request.on('response', (response) => {
        const statusCode = parseInt(response.statusCode)
        console.log(`STATUS: ${statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(response.headers)}`);

        response.on('data', (chunk) => {
            //console.log(`BODY: ${chunk}`)
            if (chunk.includes('Client error') || chunk.includes('Server error') || statusCode >=400) {
                let info = ''
                if(statusCode >= 400){
                    info = 'Server returned error: ' + statusCode
                }
                dialog.showErrorBox('Error while uploading screenshot! ' + info, '')
            }
        });
    });
    request.on('finish', () => {
        console.log('Request is Finished')
    });
    request.on('abort', () => {
        console.log('Request is Aborted')
    });
    request.on('error', (error) => {
        console.log(`ERROR: ${JSON.stringify(error)}`)
        dialog.showErrorBox('Error while uploading screenshot', JSON.stringify(error))
    });
    request.on('close', (error) => {
        console.log('Last Transaction has occured')
    });
    request.setHeader('Content-Type', 'application/json');
    request.write(body, 'utf-8');
    request.end();

    kb_count = 0;
    mouse_count = 0;

    //console.log('performed http request');
}

function confirmAndQuit(e) {

    const messageBoxOptions = {
        type: 'question',
        buttons: ['Cancel', 'Quit'],
        title: 'Quit Timedly',
        message: 'Please log out to exit.',
    };

    dialog.showMessageBox(null, messageBoxOptions, response => {
        if (response == 0) {
            e.preventDefault();
        } else {
            if (user_is_cloked_in == true) {
                console.log('exit cloked out');
                user_is_cloked_in = false;
                win.webContents.send('clock-out', '1');
            } else {
                is_app_exit = true;
                if (ioHook != null) {
                    ioHook.unload();
                }
                console.log('yup exit na talaga');
                win.close();
                workerWindow.close();
            }

        }
    });
}

app.on('window-all-closed', function(e) {
    app.quit();
})

app.commandLine.appendSwitch('-autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.allowRendererProcessReuse = false;

app.on('ready', function() {
    createWindow();
});

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall()
    })
})

autoUpdater.on('error', message => {
    console.error('There was a problem updating the application')
    console.error(message)
})