const { ipcRenderer,shell } = require('electron');
const path = require('path');
const { appSettings } = require('./env.js')
const axios = require('axios')

const remote_url = appSettings.remote_url
console.log(remote_url)

var user_id = '';
var access_token = localStorage.getItem("access_token");
//var timedin = '';
var onbreak = false;
var ontask = false;
var schedule_id = '';
var noConnection = false;
//var last_access_token = '';
var to_dashboard_box = '';
var user_eod = '';
var goOT = false;
//var change_ti = false;
//var nu_new_messages = 0;
//var todays_attendance = [];
//var curr_task_id = '';
//var btn_task_id = '';
//var num_message = 0;
var user_data = '';
var active_task_id = localStorage.getItem("userCurrentTaskId") || '';
var locked = false;
const MAX_PING_PONG_ERROR_COUNT = 5;

if(!access_token || access_token == ''){
    window.location.href = 'index.html';
}

setInterval(()=>{
    if(locked){
        $('.wait-loading').show();
    } else {
        $('.wait-loading').hide();
    }
},200)


checkPresence();

getUserSchedules().then(()=>{
    getUserSchedulesAll().then(()=>{
        getUserTimesheets();
    })
})

 $('#datepicker').datepicker();
 $('#datepicker2').datepicker();

 $(document).bind("contextmenu", function (e) {
   return true;
 });

 $('a[data-toggle="tab"]').on('show.bs.tab', function (e) {
   e.target; // newly activated tab
   e.relatedTarget; // previous active tab
   var currId = $(e.target).attr("id");
 });

 $('#clock-in').on('click', function () { });

 $('.close-banner-x').on('click', function () {
   $(this).parent('div').hide();
 });

 $('#send-new-report').on('click', function () {
   sendNewReport();
 });

 $('#clock-out').on('click', function () {
   clockOut(access_token);
 });

 $('#testupload').on('click', function () {
   var data = '100||100||' + access_token
   uploadScreenshot(data);
 });

 $('#modalIdelRemind').on('hide.bs.modal', function (e) {
   resumedIdle();
 });

 $("html").on("dragover", function (e) {
   e.preventDefault();
   e.stopPropagation();
   $("#upload_here").text("Drag here");
 });

 $("html").on("drop", function (e) {
   e.preventDefault();
   e.stopPropagation();
 });

 // Drag enter
 $('[class="upload-area"]').on('dragenter', function (e) {
   e.stopPropagation();
   e.preventDefault();
   $("#upload_here").text("Drop");
 });

 // Drag over
 $('[class="upload-area"]').on('dragover', function (e) {
   e.stopPropagation();
   e.preventDefault();
   $("upload_here").text("Drop");
 });

 // Drop
 $('.upload-area').on('drop', function (e) {
   e.stopPropagation();
   e.preventDefault();
   var dropzone = $(this);

   var de = $('#file');

   var file = e.originalEvent.dataTransfer.files;
   var fd = new FormData();

   var selectedFile = file[0];
   selectedFile.convertToBase64(function (base64) {
     dropzone.parent().find("#input-details").val(base64);
   })

   fd.append('file', file[0]);
   var filename = file[0].name;

   $("#upload_here").text('upload ' + filename);

 });

 $("#req-type").on('change', function () {
   if ($(this).val() == 'overtime') {
     $('#types-area').show();
   } else {
     $('#types-area').hide();
   }
 });

const version = document.getElementById('appVersion');
    
ipcRenderer.send('app_version');
ipcRenderer.on('app_version', (event, arg) => {
    ipcRenderer.removeAllListeners('app_version');
    version.innerText = 'v'+arg.version;
});

function checkPresence() {

    var timedlyuserdata = localStorage.getItem("userDataTimedlyNewton");
    var timedindata = localStorage.getItem("userDataTimedlyTimedin");
    //var onbreak = localStorage.getItem("onbreak");

    if (timedlyuserdata == null) {
        window.location.href = 'index.html';
    }

    if (timedindata == '1') {
        $('.timein-div').css('display', 'inline-block');
        $('.timeout-div').css('display', 'none');
        $('#tasks-div').show();
        $('#logged-status').text('On task');

        if (onbreak == '1') {
            $('#logged-status').text('On Break');
            $('.timein-div').hide();
            $('.break-div').show();
        } else {
            $('#logged-status').text('Logged in');
            $('.timein-div').show();
            $('.break-div').hide();
        }

    } else {
        $('.timein-div').css('display', 'none');
        $('.timeout-div').css('display', 'inline-block');
        $('#tasks-div').hide();
        $('#logged-status').text('Logged In');
    }

    user_data = JSON.parse(timedlyuserdata);
    $('#logged-user').text(user_data.user.first_name);
    $('#logged-user').attr('rel', user_data.user.id);
    $('#va-name').text(user_data.user.first_name + ' ' + user_data.user.last_name);

    userid = user_data.user.id;
    access_token = user_data.user.access_token;
    user_id = user_data.user.id;
    schedule_id = '';

    $('[id="universal_access_token"]').val(access_token);

}

if(parseInt(active_task_id) > 0){
    doStopTask()
}

//var lat = $('#universal_access_token').val();

async function getUserTasks() {
    /*
        url: remote_url + '/api/users/tasks',
        type: 'get',
        data: { 'access_token': access_token },
    */
   if(locked) return
   locked = true
    try{
        const response = await axios.get(`${remote_url}/api/users/tasks?access_token=${access_token}`)
        const data = response.data
        var html = 'No reports found';
        var play_break_btn = '';
        var priority_class = '';

        var vdTasks = ["Prospecting", "Marketing", "Coach", "Client Services", "Training", "Administrative", "Recruitment", "Dev"];
        var clientTasks = '';

        if (data.status == 'success') {

            var last_task_item = localStorage.getItem("last_task") === null ? '0' : localStorage.getItem("last_task").replace('#collapseTask', '');

            Object.entries(data).forEach(([key, val]) => {
                if (key == 'data') {
                    if (val.length > 0) {
                        let countr = 0;
                        Object.entries(val).forEach(([k, v]) => {
                            countr += 1;
                            var collapse_this = countr == last_task_item ? 'show' : '';
                            var expanded = countr == last_task_item ? 'true' : 'false';
                            if (v.priority == 'High') {
                                priority_class = 'priority-red';
                                pclass = 'badge badge-danger';
                            } else {
                                priority_class = 'priority-gray';
                                pclass = 'badge badge-secondary';
                            }
                            html += schedule_id + '<tr><td scope="row" class="task-first-col" id="name">' + v.name + '</td><td id="description">' + v.description + '</td><td><div class="' + priority_class + ' badge ' + pclass + ' float-left">' + v.priority + '</div></td><td><div id="' + k + '" class="timerbox">0:00:00</div></td></tr>';

                            if (!vdTasks.includes(v.name)) {
                                clientTasks += '<tr><td><span class="' + pclass + '">' + v.priority + '</span> ' + v.name + '</td></tr>'
                            }

                            play_break_btn += '<div rel="no-action" class="collapse-anchor" href="#collapseTask' + countr + '" aria-expanded="' + expanded + '" aria-controls="collapseTask' + countr + '"> <div class="task-title-box"> <div class="task-title float-left" rel="' + v.id + '">' + v.name + '</div><div class="float-right ml-2"><span class="' + pclass + '">' + v.priority + '</span></div></div><div class="collapse ' + collapse_this + '" id="collapseTask' + countr + '"> <div class="collapse-contents mt-1 animate__animated animate__fadeIn"> <div class="row"> <div class="col-sm-6 task-desc">' + v.description + '</div><div class="col-sm-6 text-right"> <button id="' + v.id + '" rel="play" class="btn btn-sm-play" title="Start task"> <span class="tm-ctr"></span> <span id="cur-icon" class="cur-icon-play"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-fill" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg></button> <button class="btn btn-sm-break" rel="busy" title="Break"><span id="break-timer"></span> <span class="curr-break-icon"><svg id="break-svg" width="1.4em" height="1.4em" viewBox="0 0 16 16" class="bi bi-cup-fill" fill="white" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" d="M1 2a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1h.5A1.5 1.5 0 0 1 16 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-.55a2.5 2.5 0 0 1-2.45 2h-8A2.5 2.5 0 0 1 1 12.5V2zm13 10h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H14v8z"/></svg></span></span></button> </div></div></div></div></div>';
                        });
                    }
                }
            });

        } else {
            play_break_btn = '<div class="text-secondary">No tasks set at this time</div>';
            clientTasks = '<tr><td class="text-secondary">No tasks set at this time</td></tr>';
        }

        $('.tab-pane').find('.list-task-box').html(play_break_btn);
        $('#db-tasks').html(clientTasks);

    } catch (e) {
        const errorMessage = e.message || 'Undefined error'
        $('.warning-div').find('span').text('Could not get tasks due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
    } finally {
        locked = false
    }
}

async function getUserSchedules() {
    //if(locked) return
    //locked = true
    var currentday_id = '';
    var sked_id = '';
    schedule_id = '';
    var safe_to_login = false;
    /*
        url: remote_url + '/api/users/schedules',
        type: 'get',
        data: { 'access_token': access_token, 'current': 'today' },
    */
    try {
        const response = await axios.get(`${remote_url}/api/users/schedules?access_token=${access_token}&current=today`)
        const data = response.data
        if (data.status == 'error') {
            localStorage.removeItem("userDataTimedlyNewton");
            localStorage.removeItem("userDataTimedlyTimedin");
            window.location.href = 'index.html';
        }

        var html = '<td colspan="5">No schedule found</td>';
        var option = '<option>No schdules for today</option>'
        var TodayDate = new Date();
        var d = TodayDate.getDay();

        var timenow = moment().format('hh:mm:ssA');
        var weekday = new Array(7);
        weekday[0] = "Sunday";
        weekday[1] = "Monday";
        weekday[2] = "Tuesday";
        weekday[3] = "Wednesday";
        weekday[4] = "Thursday";
        weekday[5] = "Friday";
        weekday[6] = "Saturday";
        html = '';

        var current_sched_options = '';

        if (data !== null) {

            var user_current_day = '';
            var client_current_day = '';

            Object.entries(data).forEach(([key, val]) => {

                if (val.length > 0) {

                    if (key == 'data') {
                        Object.entries(val).forEach(([k, v]) => {
                            var last_login = localStorage.getItem("last_login");
                            var selectedSched = '';

                            if (last_login == v.id) {

                                sked_id = v.id;
                                schedule_id = v.id;

                                if (v.current == true) {
                                    safe_to_login = true;
                                    selectedSched = 'selected';
                                }

                                to_dashboard_box = '<tr><td style="font-weight:bold; color: green;"><span class="badge badge-success"><svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg> current</span> ' + v.day + ' ' + v.start + '-' + v.end + '(' + v.shift + ')<br>' + v.name + '</td></tr>';
                                current_sched_options += '<option value="' + v.id + '" ' + selectedSched + '>' + v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm:ssA') + '-' + v.end + ' (' + v.shift + ') ' + v.name + '</option>';
                                $('#date-current-sched-top').html(v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm A') + ' - ' + moment(v.end, 'h:mm:ssA').format('h:mm A') + ' (' + v.shift + ') ' + v.name);

                            } else if (v.current == true) {
                                sked_id = v.id;
                                schedule_id = v.id;

                                to_dashboard_box = '<tr><td style="font-weight:bold; color: green;"><span class="badge badge-success"><svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg> current</span> ' + v.start + '-' + v.end + '(' + v.shift + ')<br>' + v.name + '</td></tr>';
                                current_sched_options += '<option value="' + v.id + '" selected>' + v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm:ssA') + '-' + v.end + ' (' + v.shift + ') ' + v.name + '</option>';

                                $('#date-current-sched-top').html(v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm A') + ' - ' + moment(v.end, 'h:mm:ssA').format('h:mm A') + ' (' + v.shift + ') ' + v.name);

                            } else {
                                //sked_id = v.id;
                                //schedule_id = v.id;

                                to_dashboard_box = '<tr><td style="font-weight:bold; color: green;"><span class="badge badge-success"><svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg> current</span> ' + v.start + '-' + v.end + '(' + v.shift + ')<br>' + v.name + '</td></tr>';
                                current_sched_options += '<option value="' + v.id + '">' + v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm:ssA') + '-' + v.end + ' (' + v.shift + ') ' + v.name + '</option>';

                                $('#date-current-sched-top').html(v.day + ' ' + moment(v.start, 'h:mm:ssA').format('h:mm A') + ' - ' + moment(v.end, 'h:mm:ssA').format('h:mm A') + ' (' + v.shift + ') ' + v.name);
                            }

                        });
                    }
                }
            });

            console.log('sked id ' + sked_id);

            if (sked_id != '') {
                $('#current-sched-options').html(current_sched_options);

                $('#logged-status').text('Not Timed In');

                $("#timeinModal").clone().appendTo($(".timeinclone"));

                if (safe_to_login === true) {
                    setAttendance(access_token, sked_id);
                } else {
                    $('#timeinModal').modal('show');
                }

            } else {
                $('#current-sched-options').html(current_sched_options);
                $('#timeinModal').modal('show');
                $("#timeinModal").clone().appendTo($(".timeinclone"));
                $('.tab-pane').find('.list-task-box').html('<div>No schedule set at this time. Please click the schedules tab for the list of schedules or relogin to previous set of schedules.</div>');
            }
        }
        return true
        //locked = false
    } catch(error){
        console.log('getUserSchedules', error)
        $('.warning-div').find('span').text('The server returned an error while trying to pull out schedules.');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        const message = error.message || `can't get schedules`
        ipcRenderer.send('app_log_error', 'getUserSchedules returned error: ' + message);
    }

}

function getUserAttendance() {
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/users/attendance',
        type: 'get',
        data: { 'current': true, 'access_token': access_token },
        success: function(data) {}
    });
}

async function getUserTimesheets() {
    const url = `${remote_url}/api/users/timesheets?access_token=${access_token}&current=true`
    /*
    type: 'get',
    data: { 'current': true, 'access_token': access_token },
    */
    try {
        const response = await axios.get(url)
        const data = response.data
        var html = 'No timesheets found';
        var dbTs = '';

        if (data.status == 'success') {
            Object.entries(data).forEach(([key, val]) => {
                if (key == 'data') {
                    if (val.length > 0) {
                        Object.entries(val).forEach(([k, v]) => {
                            html += '<tr><td scope="row">' + v.client + '</td><td>' + v.target_date + '</td><td>' + v.total_time + '</td><td>' + v.total_task_time + '</td><td>' + v.total_idletime + '</td><td>' + v.total_breaktime + '</td><td>' + v.billable_hours + '</td><td>' + v.status + '</td></tr>';

                            if (moment().subtract(1, "days").format('YYYY-MM-DD') == v.target_date || moment().format('YYYY-MM-DD') == v.target_date) {
                                dbTs += '<tr><td scope="row">' + v.client + '</td><td>' + v.target_date + '</td><td>' + v.total_time + '</td><td>' + v.billable_hours + '</td><td>' + v.status + '</td></tr>';
                            }

                        });
                    }
                }
            });
        }
        $('.tab-pane').find('#timesheet-table').html(html);
        $('#db-ts').html(dbTs);
    } catch(error){
        //locked = false
        const errorMessage = error.message || 'Undefined error'
        $('.warning-div').find('span').text('Could not get timesheets due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
    }
}

async function getUserReports() {
    //Reports
    /*
        url: remote_url + '/api/users/reports',
        type: 'post',
        data: { 'access_token': access_token },
    */
    try{
        const response = await axios.post( `${remote_url}'/api/users/reports`,
        { 'access_token': access_token }
        )
        const data = response.data
        var html = 'No reports found';
        var show_error = [];

        console.log(data);

        if (data.status == 'success') {
            Object.entries(data).forEach(([key, val]) => {
                if (key == 'data') {
                    if (val.length > 0) {
                        Object.entries(val).forEach(([k, v]) => {
                            if (v.today == true) {
                                show_error.push('1');
                            }

                            let date = moment(v.date, 'YYYY-MM-DD h:mm:ss A').format('MMMM DD, YYYY');
                            html += '<tr><td scope="row">' + v.type + '</td><td><span class="truncate-texts">' + v.report + '</span></td><td>' + date + '</td></tr>';
                        });
                    }
                }
            });
        }
        if (show_error.length == 0) {
            $('.error-div').css('display', 'inline-block');
        }
        $('#reports-table').html(html);
    } catch(error){
        //locked = false
        const errorMessage = e.message || 'Undefined error'
        $('.warning-div').find('span').text('Could not get reports due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
    }

}

async function clockOutUser() {
    /*
        url: remote_url + '/api/auth/logout',
        type: 'get',
        data: { 'access_token': access_token },
    */
   try{
   const response = await axios.get( `${remote_url}/api/auth/logout?access_token=${access_token}`)
   localStorage.removeItem("goOT");
   //window.webkit.messageHandlers.relayStatusHandler.postMessage("stoptimer");
    //window.webkit.messageHandlers.relayLogoutHandler.postMessage("logout");
    localStorage.removeItem("last_login");
    localStorage.removeItem("last_task");
    localStorage.removeItem("idletime");
    localStorage.removeItem("userDataTimedlyNewton");
    localStorage.removeItem("userDataTimedlyTimedin");
    localStorage.removeItem("access_token");
    window.location.href = 'index.html';
   } catch(e){
        console.log(e)
        locked = false
        const errorMessage = e.message || 'Undefined error'
        $('.warning-div').find('span').text('Could not log out due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
   }
}

async function logoutUserToFront(force=false) {  
    if(locked) return
    locked = true
    const url = `${remote_url}/api/auth/logout?access_token=${access_token}`
    try{
        const response = await axios.get(url)
        const data = response.data
        if (data.status == 'success' || force) {
            localStorage.removeItem("userDataTimedlyNewton");
            localStorage.removeItem("userDataTimedlyTimedin");
            localStorage.removeItem("goOT");
            localStorage.setItem("last_login", "");
            window.location.href = 'index.html';
        } else {
            $('.warning-div').find('span').text('A task is currently running. Please stop the task to proceed.');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
        }
    } catch(e){
        $('.warning-div').find('span').text('A task is currently running. Please stop the task to proceed.');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        console.log(e)
    } finally{
        locked = false
    }
}


async function getUserSchedulesAll() {
    //locked = true
    try{
        const response = await axios.get(`${remote_url}/api/users/schedules?access_token=${access_token}`)
        const data = response.data
        var html = '<td colspan="5">No schedule found</td>';
        var option = '<option>No schdules for today</option>'
        var TodayDate = new Date();
        var d = TodayDate.getDay();

        var weekday = new Array(7);
        weekday[0] = "Sunday";
        weekday[1] = "Monday";
        weekday[2] = "Tuesday";
        weekday[3] = "Wednesday";
        weekday[4] = "Thursday";
        weekday[5] = "Friday";
        weekday[6] = "Saturday";
        html = '';
        option = '';

        var user_current_day = '';
        var client_current_day = '';
        let local_id = 0;
        var newid = [];

        if (data !== null) {
            Object.entries(data).forEach(([key, val]) => {
                if (val.length > 0) {

                    if (key == 'data') {
                        Object.entries(val).forEach(([k, v]) => {

                            var start = moment().format('YYYY-MM-DD ');
                            var startAMPM = v.start.match(/AM|PM/g);
                            var schedStart = start + (v.start.split(startAMPM) + startAMPM).replace(',', ' ');

                            var end = moment().format('YYYY-MM-DD ');
                            var endAMPM = v.end.match(/AM|PM/g);
                            var schedEnd = end + (v.end.split(endAMPM) + endAMPM).replace(',', ' ');

                            let startsc = moment(schedStart, 'YYYY-MM-DD hh:mm:ss A').format('hh:mm A');
                            let endsc = moment(schedEnd, 'YYYY-MM-DD hh:mm:ss A').format('hh:mm A');

                            if (v.id == schedule_id) {
                                html += '<tr class="font-weight-bold"><th class="text-center"><img style="margin-top:7px;" width="20" src="./assets/images/bootstrap-icons/circle-fill-2.svg"></th><td scope="row">' + v.client_name + '</td><td>' + startsc + '</td><td>' + endsc + '</td><td>' + v.shift + '</td><td>' + v.day + '</td></tr>';
                            } else {
                                html += '<tr><th></th><td scope="row">' + v.client_name + '</td><td>' + startsc + '</td><td>' + endsc + '</td><td>' + v.shift + '</td><td>' + v.day + '</td></tr>';
                            }

                            if (v.id == schedule_id) {
                                local_id = k;
                                to_dashboard_box = '<tr><td style="font-weight:bold; color: green;"><span class="badge badge-success"><svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-check" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg> current</span> ' + startsc + '-' + endsc + '(' + v.shift + ')<br>' + v.name + '</td></tr>';
                            } else if (k >= local_id) {
                                newid[k] = '<tr><td class="text-secondary"><span class="badge badge-secondary">next</span> ' + startsc + '-' + endsc + '(' + v.shift + ')<br>' + v.name + '</td></tr>';
                            }

                        });
                    }
                }
            });

            let addid = +local_id + 1;

            //console.log(addid)
            to_dashboard_box += newid[addid];
        }

        if (schedule_id == '') {
            to_dashboard_box = '<tr><td class="text-secondary">Schedule not found</td></tr>';
        }

        $('#db-scheds').html(to_dashboard_box);
        $('.sched-pane').find('#schedules-table').html(html);
        return true
    } catch(e){
        console.log('getUserSchedulesAll', e)
        $('.warning-div').find('span').text('A connection error has occured while trying to pull out schedules');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        const errMessage = e.message || `can't get all schedules`
        ipcRenderer.send('app_log_error', 'getUserSchedulesAll returned error: ' + errMessage);
        //logoutUserToFront()
    } 
}

async function setAttendance(access_token, schedule_id) {

    schedule_id = schedule_id || $("#current-sched-options option:selected").val();
    const message = $('#message-text').val();
    const url = remote_url + '/api/users/attendance';

    try{
        const response = await axios.post(url, { 'schedule_id': schedule_id, 'late_reason': message, 'access_token': access_token })
    
        const data = response.data
        if (data.status == 'success') {
            $('.timein-div').css('display', 'inline-block');
            $('.timein-div').attr('rel', data.id);
            $('.timeout-div').css('display', 'none');
            $('#timeinModal').modal('hide');
            $('#logged-status').text('Timed In');
            localStorage.setItem("userDataTimedlyTimedin", "1");
            $('#tasks-div').show();
            //getTimedInUserData('no');
            getUserTasks();
            return true
        }
        throw 'setAttendance returned error'
    } catch (e) {
        console.log('setAttendance',e)
        $('.warning-div').find('span').text('A connection error has occured while trying to set attendance');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        const errMessage = e.message || `can't set attendance`
        ipcRenderer.send('app_log_error', errMessage);
    }
}

async function sendNewReport() {
    var type = $('#report-type').val();
    var report = $('#report-text').val();
    post_url = '';
    try{
        const response = await axios.post(remote_url + '/api/users/' + type, { 'access_token': access_token, 'type': type, 'report': report })
        const data = response.data
        if (data.status == 'success') {
            $('#reportModal').modal('hide');
            $('.error-div').hide();
            $('#report-text').val('');
            getUserReports();
        } else {
            $('#report-text').val('');
            $('#reportModal').modal('hide');
            $('.error-div-sod').show();
        }
        return true
    } catch(e){
        console.log('sendNewReport',e)
        $('.warning-div').find('span').text('A server error has occured while trying to send a report');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        const errMessage = e.message || `can't send a report`
        ipcRenderer.send('app_log_error', 'sendNewReport error: ' + errMessage);
    }
}

function loadTasks(access_token) {
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/users/tasks',
        type: 'post',
        data: { 'access_token': access_token, 'current': true },
        success: function(data) {}
    });
}

function clockOut(access_token) {

    if (ontask == true) {
        popupWarning();
    } else {
        localStorage.removeItem("userDataTimedlyTimedin");
        var attendance_id = $('.timein-div').attr('rel');
        $(this).removeClass('circle');

        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            url: remote_url + '/api/users/attendance/' + attendance_id,
            type: 'put',
            data: { 'access_token': access_token },
            success: function(data) {

                if (data.status == 'success') {
                    $('.timein-div').css('display', 'none');
                    $('.timeout-div').css('display', 'inline-block');
                    $('#tasks-div').hide();
                    $('#logged-status').text('Logged In');
                    reloginUser();

                }
            }
        });

    }
}

var pingPongErrorCount = 0;

async function doPingpong() {
    /*
        url: remote_url + '/api/users/ping-pong',
        type: 'post',
        data: { 'access_token': access_token, 'user_id': user_id },
    */
   const url = remote_url + '/api/users/ping-pong'
   try{
    const response = await axios.post(url,{ 
        'access_token': access_token, 'user_id': user_id 
    })
    const data = response.data
    if (data.status == 'error') {
        if (data.case == 'auth') {
            //localStorage.removeItem("userDataTimedlyNewton");
            //localStorage.removeItem("userDataTimedlyTimedin");
            //window.location.href = 'index.html';
            pingPongErrorCount = MAX_PING_PONG_ERROR_COUNT
        }
    }
   }  catch(error) {
        $('.warning-div').find('span').text('Could not connect to the main server! Please check your internet connection' );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
        pingPongErrorCount++
   } finally {
       if(pingPongErrorCount >= MAX_PING_PONG_ERROR_COUNT){
        logoutUserToFront(true)
        pingPongErrorCount = 0
       }
   }
}

async function doStartTask( name, description, button) {
    if(locked) return
    locked = true
    /*
        url: remote_url + '/api/users/tasks',
        type: 'post',
        data: { 'access_token': access_token, 'name': name, 'description': description },
    */
    const url = `${remote_url}/api/users/tasks`
    try{       
        const response = await axios.post(url, { 'access_token': access_token, 'name': name, 'description': description })
        const data = response.data
        locked = false
        console.log(data)
        let status
        if (data.status == 'success') {
            active_task_id = data.data.id;
            ipcRenderer.send("start-task", name);
            ipcRenderer.send("new-task-name", name);
            status = '1';
        } else {
            $('.warning-div').find('span').text('Could not start task. Please check your internet connection or try again later');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
            status = '0';
        }

        if (status == '1') {
            button.attr('rel', 'stop');
            button.attr('title', 'Stop task');
            button.parent().parent().parent().parent().parent().find('#cur-icon').find('svg').remove();
            button.parent().parent().parent().parent().parent().find('#cur-icon').html(stop_icon);

            button.parent().parent().parent().parent().parent().find('.tm-ctr').addClass('timer-ctr');
            button.parent().parent().parent().parent().parent().find('.tm-ctr').text('0:00:00');
            button.parent().parent().parent().parent().parent().find('.btn-sm-break').show();

            $('.collapse-anchor').attr('rel', 'task-action');

            button.parent().parent().parent().parent().parent().attr('rel', 'no-action');

            ontask = true;

            getTimedInUserData('yes');
            localStorage.setItem("userCurrentTaskId",active_task_id);
        } else {
            $('.warning-div').find('span').text('Server busy. Please try again.');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
        }
    } catch(error) {
        locked = false
        const errorMessage = error.message || 'Undefined error'
        $('.warning-div').find('span').text('Could not stop tasks due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
    }
}

async function doStopTask(button) {
    /*
        url: remote_url + '/api/users/tasks/' + ati,
        type: 'PUT',
        data: { 'access_token': lat },
    */
    if(locked) return
    locked = true

    const url = `${remote_url}/api/users/tasks/${active_task_id}?access_token=${access_token}`;
    try{
        const response = await axios.put(url);
        locked = false
        const data = response.data;
        let status
        if (data.status == 'success') {
            try {
                ipcRenderer.send("stop-task", active_task_id);
            } catch (err) {
                console.log('doStopTask', err)
            }
            status = '1';

        } else {
            $('.warning-div').find('span').text('Could not stop tasks. Please check your internet connection or try again later');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);

            status = '0';
        }

        if (status == '1') {
            if(button){
                button.attr('rel', 'play');
                button.attr('title', 'Start task');
                button.parent().parent().parent().parent().parent().find('#cur-icon').find('svg').remove();
                button.parent().parent().parent().parent().parent().find('#cur-icon').html(play_icon);
                button.parent().parent().parent().parent().parent().find('.tm-ctr').removeClass('timer-ctr');
                button.parent().parent().parent().parent().parent().find('.tm-ctr').text('');
                $('.tm-ctr').text('');
                $('.collapse-anchor').attr('rel', 'no-action');
                button.parent().parent().parent().parent().parent().attr('rel', 'no-action');
            }
            ontask = false;
            getTimedInUserData('no');
            localStorage.removeItem("userCurrentTaskId");
            return true
        } else {
            $('.warning-div').find('span').text(data + 'Server busy. Please try again.');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
            throw 'doStopTask failed'
        }
    } catch(error) {
        locked = false
        const errorMessage = error.message || 'Undefined error';
        $('.warning-div').find('span').text('Could not stop tasks due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(2000);
    }
}

//break start
async function startBreak(button) {
    /*
        url: remote_url + '/api/users/break-start',
        type: 'post',
        data: { 'access_token': access_token },
    */
    if(locked) return
    locked = true

    const url = `${remote_url}/api/users/break-start`;
    try{
        const response = await axios.post(url,{
            access_token: access_token
        });
        locked = false
        const data = response.data;

        if (data.status == 'success') {
            ipcRenderer.send("start-break", data);
            getTimedInUserData('no');
            if (ontask == true) {
                button.parent().parent().parent().parent().parent().find('.btn-sm-play').click();
            }

            button.parent().parent().parent().parent().parent().find('#break-timer').addClass('timer-br');
            button.parent().parent().parent().parent().parent().find('.timer-br').text('0:00:00');
            button.parent().parent().parent().parent().parent().find('.curr-break-icon').find('svg').remove();
            button.parent().parent().parent().parent().parent().find('.curr-break-icon').html(stop_icon_br);

            onbreak = true;
        } else {
            $('.warning-div').find('span').text('Could not start break. Please check your internet connection or try again later');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
        }


    } catch(error){
        locked = false
        const errorMessage = error.message || 'Undefined error';
        $('.warning-div').find('span').text('Could not start break due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
    }
}

//break stop
async function stopBreak(button) {
    /*
        url: remote_url + '/api/users/break-stop',
        type: 'post',
        data: { 'access_token': access_token },
    */
    if(locked) return
    locked = true

    const url = `${remote_url}/api/users/break-stop`;
    try{
        const response = await axios.post(url,{
            access_token: access_token
        });
        const data = response.data;

        console.log('stopBreak', data);
        if (data.status == 'success') {
            ipcRenderer.send("stop-break", '1');
            getTimedInUserData('no');
            button.parent().parent().parent().parent().parent().find('.curr-break-icon').find('svg').remove();
            button.parent().parent().parent().parent().parent().find('.curr-break-icon').html(break_icon);
            button.parent().parent().parent().parent().parent().find('#break-timer').removeClass('timer-br');
            button.parent().parent().parent().parent().parent().find('#break-timer').text('');
            $('.collapse-anchor').attr('rel', 'no-action');
            button.hide();
            onbreak = false;
        } else {
            $('.warning-div').find('span').text('Server busy. Please try again');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
        }
    } catch(error){
       
        const errorMessage = error.message || 'Undefined error';
        $('.warning-div').find('span').text('Could not start break due to an error: ' + errorMessage );
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
    } finally {
        locked = false
    }
}

function getTimedInUserData(resumed) {
    var userdata = JSON.parse(localStorage.getItem("userDataTimedlyNewton"));
    var idletime = localStorage.getItem("idletime") ? localStorage.getItem("idletime") : '0';
    //var settings_data = [];
    //$.each(userdata, function(key, value) {
    //    if (key == 'settings') {
            ////console.log(value);
    //        $.each(value, function(k, v) {
    //            settings_data.push(v);
                ////console.log(v);
    //        });
    //    }
    //});
    //idle-interval: 10 screenshot-interval: 2
    const idle_timer = userdata.settings['idle-interval']
    const sc_interval = userdata.settings['screenshot-interval']

    //var idle_timer = Math.floor(idletime / 60) * 60;
    //var sc_interval = Math.floor(settings_data[1] / 60) * 60;
    if(parseInt(idletime) <= 0){
        idletime = Math.floor(parseInt(idle_timer) / 60) * 60;
        if(idletime < 60) idle_timer = 600;
    }   
    $('#user_idle_sec').text(Math.floor(idletime / 60));

    try {
        ipcRenderer.send("logged-user", {idle_timer, sc_interval , user_id, access_token, remote_url, resumed});
        //ipcRenderer.send("logged-user", settings_data[0] + '|' + settings_data[1] + '|' + user_id + '|' + access_token + '|' + remote_url + '|' + resumed);
        //window.webkit.messageHandlers.scriptHandler.postMessage(idle_timer + '|' + sc_interval + '|' + user_id + '|' + access_token + '|' + remote_url + '|' + resumed);
        //idle_timer = null;
        //sc_interval = null;

    } catch (err) {
        //console.log('The native context does not exist yet');
    }
}

async function postIdle(idleType) {
    if(locked) return
    locked = true

    var idle_url = (idleType == 'start') ? '/api/users/idle-start' : '/api/users/idle-stop';
    $('#idleError').text('')

    /*
        url: remote_url + idle_url,
        type: 'post',
        data: { 'access_token': access_token },
    */
    const url = `${remote_url}${idle_url}`;
    try{
        const response = await axios.post(url,{access_token: access_token});
        locked = false
        const data = response.data;

        if (data.status == 'success') {
            if (idleType == 'stop') {
                ipcRenderer.send('idle-stop', '1');
            }
            return true
        } else {
            $('#idleError').text('Could not stop idle. Please check your internet connection or try again later.');
            throw 'Could not stop idle'
        }
    } catch(error){
        locked = false
        const errorMessage = error.message || 'Undefined error';
        $('#idleError').text('Could not stop idle due to error: "' + errorMessage +'". Please check your internet connection or try again later.');
    }
}

async function getRequestConcern() {
    const url = remote_url + '/api/users/requests-concerns'
    try {
        const response = await axios.post(url, { 'access_token': access_token })
        const data = response.data

        console.log(data);

        let html = '';
        var mtypes = [];
        mtypes['vacation_leave'] = 'Vacation Leave';
        mtypes['overtime'] = 'Overtime';
        mtypes['shift_change'] = 'Shift Change';
        mtypes['sick_leave'] = 'Sick Leave';
        mtypes['unpaid_leave'] = 'Unpaid Leave';
        mtypes['paid_leave'] = 'Paid Leave';

        var status = [];
        status['approved'] = '<span class="text-green">Approved</span>';
        status['pending'] = '<span class="text-warning">Pending</span>';
        status['rejected'] = '<span class="text-danger">Rejected</span>';

        var unread_req = 0;

        if (data != '')
            $.each(data, function(i, e) {
                //console.log(e.details);
                if (e.read_by_user == '0') {
                    html += '<tr id="td-req" rel="' + mtypes[e.type] + '|' + e.details + '|' + e.status + '|' + e.target_date + '|' + e.notes + '|' + e.overtime + '|' + e.id + '|' + e.read_by_user + '"><td><span class="truncate-texts font-weight-bold">' + e.details + '</span></td><td class="font-weight-bold">' + mtypes[e.type] + '</td><td class="font-weight-bold">' + status[e.status] + '</td></tr>';
                    unread_req += 1;
                } else {
                    html += '<tr id="td-req" rel="' + mtypes[e.type] + '|' + e.details + '|' + e.status + '|' + e.target_date + '|' + e.notes + '|' + e.overtime + e.id + '|' + e.read_by_user + '"><td><span class="truncate-texts">' + e.details + '</span></td><td>' + mtypes[e.type] + '</td><td>' + status[e.status] + '</td></tr>';
                }

            });

        if (unread_req >= 1) {
            $('#notif-toggle').show();
            $('#badge-new-req').show();
            $('#badge-new-req').text(unread_req);
            //$('#badge-new-req').show();
        } else {
            $('#notif-toggle').hide();
            $('#badge-new-req').hide();
        }

        $('#requests-concerns-table').html(html);
        return true
        
    } catch(e){
        console.log(e)
    }
}

$(document).on('click', '#notif-toggle', function(e){
    e.preventDefault();
    shell.openExternal(remote_url + '/dashboard/requests')
})

$(document).on('click', '#td-req', function() {
    var result = $(this).attr('rel').split('|');

    $('#pp-req-type').text(result[0]);
    $('#pp-req-details').text(result[1]);
    $('#pp-req-num').text(result[5]);
    $('#pp-req-date').text(result[3]);
    $('#pp-req-status').text(result[2]);
    $('#pp-req-note').text(result[4]);

    if (result[0] == 'Overtime') {
        $('.pp-req-num').show();
    } else {
        $('.pp-req-num').hide();
    }

    if (result[7] == '0') {
        $.ajax({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            url: remote_url + '/api/users/requests-read',
            type: 'post',
            data: { id: result[6], 'access_token': access_token },
            success: function(data) {
                console.log(data);
            }
        });
    }

    $('#req-modal-status').modal('show');
});

function reloginUser() {
    var loggeduser = localStorage.getItem("userLoggedUser");
    //console.log('userdata = ' + loggeduser);
    var userdt = loggeduser.split('//');
    //console.log(userdt[0]);

    localStorage.removeItem("userDataTimedlyNewton");
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/auth/login',
        type: 'post',
        data: { email: userdt[0], password: userdt[1] },
        success: function(data) {
            //console.log(data);
            $('#home-error').text(data.error_msg);

            if (data.status == 'success') {
                localStorage.setItem("userDataTimedlyNewton", JSON.stringify(data));
                location.reload();
            }
        }
    });
}

function remindUserIdle() {
    $('#modalIdelRemind').modal('show');
}

function resumedIdle() {
    postIdle("stop");
}

function popupWarning() {
    $('.warning-div').find('span').text('A task is currently running. Please stop the task to proceed.');
    $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(1000);
}

function noInternet() {
    noConnection = true;
    $('.warning-div').find('span').html('<span>You lost connetion. Please check your internet connection.</span>&nbsp;Waiting to reconnect.');
    $('.warning-div').css('display', 'inline-block');
    waitToReconnect();
}

$(document).on('click', '#breconnect', function() {
    if (navigator.onLine) {
        $('.warning-div').css('display', 'none');
        location.reload();
    }
});

$(document).on('click', '.collapse-anchor', function() {
    if ($(this).attr('rel') == 'no-action') {
        $('.collapse').removeClass('show');
        $('.collapse-anchor').attr('aria-expanded', false);
        $(this).attr('aria-expanded', true);
        $(this).find('.collapse').addClass('show');
        localStorage.setItem("last_task", $(this).attr('href'));
    }

});

$(document).on('click', '#logout', function() {
    if (ontask == true) {
        popupWarning();
    } else {
        try {
            window.webkit.messageHandlers.relayLogoutHandler.postMessage("logout");
            window.webkit.messageHandlers.relayStatusHandler.postMessage("stoptimer");
        } catch (err) {
            console.log('logout error ', err)
        }

        logoutUserToFront();
    }
});

var stop_icon_br = '<svg width="1.4em" height="1.4em" viewBox="0 0 16 16" class="bi bi-stop-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>';
var break_icon = '<svg id="break-svg" width="1.2em" height="1.2em" viewBox="0 0 16 16" class="bi bi-cup-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path fill-rule="evenodd" d="M1 2a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1h.5A1.5 1.5 0 0 1 16 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-.55a2.5 2.5 0 0 1-2.45 2h-8A2.5 2.5 0 0 1 1 12.5V2zm13 10h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H14v8z"/></svg>';

$(document).on('click', '.btn-sm-break', function(e) {
    if (ontask === true) {
        $('.warning-div').find('span').text('You are currently on a task. Please stop the task to continue.');
        $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
    } else {
        if ($(this).attr('rel') == 'busy') {         
            $(this).attr('rel', 'break');
            $(this).attr('title', 'Resume');
            $('#logged-status').text('Break');
            $('.collapse-anchor').attr('rel', 'break-action');
            $(this).parent().parent().parent().parent().parent().attr('rel', 'no-action');
            startBreak( $(this))
        } else {        
            $(this).attr('rel', 'busy');
            $(this).attr('title', 'Pause/break');
            $('#logged-status').text('Timed In');
            stopBreak($(this))

        }
    }
});

var stop_icon = '<svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>';
var play_icon = '<svg width="1.4em" height="1.4em" viewBox="0 0 16 16" class="bi bi-play-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/> </svg> </button>';

$(document).on('click', '.btn-sm-play', function(e) {

    if (noConnection == true) {
        noInternet();
    } else {
        var btn_attr = $(this).attr('rel');

        if (onbreak == true) {
            $('.warning-div').find('span').text('You cannot start a task while on break');
            $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
        } else {

            var name = $(this).parent().parent().parent().parent().parent().find('.task-title').text();
            var description = $(this).parent().parent().parent().parent().parent().find('.task-desc').text();
            var id = $(this).parent().parent().parent().parent().parent().find('.task-title').attr('rel');

            curr_task_id = id;

            if (btn_attr == 'play') {

                //const doStartTaskPromise = doStartTask(access_token, name.trim(), description.trim(), $(this))
                doStartTask(name.trim(), description.trim(), $(this))
                //doStartTaskPromise.then(data => {
                   
                //}).catch(error=>{
                //    const errorMessage = error.message || 'Undefined error'
                //    $('.warning-div').find('span').text('Could not stop tasks due to an error: ' + errorMessage );
                //    $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
                //});

            } else {
                //var lat = $('#universal_access_token').val();
                //var stoppingTaskPromise = doStopTask(lat, active_task_id);
                doStopTask( $(this))
                //stoppingTaskPromise.then(data => {
                   

                //}).catch(error=>{
                //    const errorMessage = error.message || 'Undefined error'
                //    $('.warning-div').find('span').text('Could not stop tasks due to an error: ' + errorMessage );
                //    $('.warning-div').css('display', 'inline-block').delay(5000).fadeOut(500);
                //})


            }
        }
    }

});

$(document).on('click', '#closeEODRemindContinue', function() {
    goOT = true;
    localStorage.setItem("goOT", "true");
});

function waitToReconnect() {
    var reconnect = setInterval(function() {
        var status = navigator.onLine;
        if (status) {
            noConnection = false;
            clearInterval(reconnect);
            $('.warning-div').find('span').html('');
            $('.warning-div').find('span').html('<span>Connection resumed.');
            $('.warning-div').css('display', 'none');

        } else {
            noConnection = true;
        }
    }, 5000);
}

$('#clickToReconnect').click(function() {
    location.reload();
});

$('#closeEODRemind').on('click', function() {
    {
        $('#modalEODRemind').modal('hide');
        window.webkit.messageHandlers.forceLogout.postMessage('0');
        logoutUserToFront();
    }
});

function refreshTimer(currentTimer, userTimeExpire, goot = goOT) {
    $('.timer-ctr').text(currentTimer);

    if (goOT == false) {
        if ((moment().toDate().valueOf() >= moment(userTimeExpire, 'YYYY-MM-DD h:mm:ss A').toDate().valueOf())) {
            window.webkit.messageHandlers.relayOvertimed.postMessage('0');
            goOT = true;
            remindEOD();
        }
    }

    //getMessages(access_token);
}

function refreshBreakTimer(currentTimer) {
    $('.timer-br').text(currentTimer);
}

function checkNet() {
    var status = navigator.onLine;
    if (status) {
        noConnection = false;
    } else {
        noConnection = true;
        noInternet();
    }
}

function remindEOD() {
    $('#modalEODRemind').modal('show');
    //window.webkit.messageHandlers.relayOvertime.postMessage('0');
}

$('#file-leave').click(function() {
    $('.custom-modal').show()
        .css({ 'opacity': 0, 'bottom': '-800px' })
        .animate({ 'opacity': '1', 'top': '44px' }, 600);
});
$('#close-custom-popover').click(function() {
    $('.custom-modal')
        .animate({ 'opacity': '1', 'top': '900px' }, 600);
});
$('#req-ot').click(function() {
    $('#modalReqOvertime').modal('show');
});

$('#req-shift').click(function() {
    $('#modalChangeShift').modal('show');
});

$('#req-sick').click(function() {
    $('#modalSickLeave').modal('show');
});

$('#req-vacation').click(function() {
    $('#modalVacationLeave').modal('show');
});

checkNet();
//remindEOD();
$('[data-toggle="datepicker"]').datepicker({
    format: 'yyyy-mm-dd',
});


$(document).on('submit', '#reqcon-form', function(e) {
    e.preventDefault();

    if ($(this).find('textarea').val() == '') {
        $(this).find('#err-handler').text('Details are required and cannot be empty');
    } else {
        $(this).find('#err-handler').text('');
        var form = $(this);

        var actionurl = remote_url + '/api/users/requests-save';
        $.ajax({
            url: actionurl,
            type: 'post',
            dataType: 'application/json',
            data: form.serialize(),
            success: function(data) {
                //console.log(data);
            }
        });

        $('.box-info input').val('');
        $('#err-handler').text('');
        $('.box-info textarea').val('');
        $('#modalReqOvertime').modal('hide');
        $('#modalChangeShift').modal('hide');
        $('#modalSickLeave').modal('hide');
        $('#modalVacationLeave').modal('hide');

        setTimeout(function() {
            getRequestConcern(access_token);
        }, 3000);

    }
});

$('[id="reqcon-form-file"]').submit(function(e) {

    e.preventDefault();

    if ($('#file-details').val() == '') {
        $('#err-handler').text('Details are required and cannot be empty');
    } else {
        var actionurl = remote_url + '/api/users/requests-save';

        //var data = new FormData();
        var data = new FormData($(this)[0]);
        $(this).find('#err-handler').text('');

        $.ajax({
            url: actionurl,
            method: "POST",
            processData: false,
            contentType: false,
            data: data,
            success: function(data) {
                console.log(data);
            },
            error: function(e) {
                console.log(e);
            }
        });

        $('textarea').val('');
        $('.upload-area h1').text('drag and drop file here');
        $('#input-details').val('');
        $('#modalReqOvertime').modal('hide');
        $('#modalChangeShift').modal('hide');
        $('#modalSickLeave').modal('hide');
    }
});

setTimeout(function() {
    getRequestConcern(access_token);
}, 3000);

setInterval(function() {
    getRequestConcern(access_token);
}, 300000);

$(document).on('change', '#file', function() {
    $('#dfile-name').text($('#file').val().replace(/.*(\/|\\)/, ''));
});

$('#early-timein').click(function() {
    $('#timeinModal').modal('show');
});

$('#send-time-in').click(function(e) {
    var attendance_id = $("#current-sched-options option:selected").val();

    localStorage.setItem("last_login", attendance_id);

    setAttendance(access_token, attendance_id).then(() => {
         $('#date-current-sched-top').text($("#current-sched-options option:selected").text().replace(':00AM', ' AM').replace(':00PM', ' PM').replace('-', ' - '));
    })

   
});

function postTimeout(access_token, uid, id) {
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/users/time-out',
        type: 'post',
        data: { 'access_token': access_token, 'user_id': uid, 'id': schedule_id },
        success: function(data) {
            //console.log('set attendance here rrr');
            console.log(data);
            //(access_token, user_id, id);
            //reloginUser();
            //setAttendance(access_token, uid, id);
        }
    });
}

function changeTi() {
    var loggeduser = localStorage.getItem("userLoggedUser");
    //console.log('userdata = ' + loggeduser);
    var userdt = loggeduser.split('//');
    //console.log(userdt[0]);

    localStorage.removeItem("userDataTimedlyNewton");
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/auth/login',
        type: 'post',
        data: { email: userdt[0], password: userdt[1] },
        success: function(data) {
            console.log(data);
            $('#home-error').text(data.error_msg);

            if (data.status == 'success') {
                localStorage.setItem("userDataTimedlyNewton", JSON.stringify(data));
                //location.reload();
            }
        }
    });
}

// is this in use???
/*
function postRequests(access_token) {
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/users/requests-save',
        type: 'post',
        async: true,
        data: { 'access_token': access_token },
        success: function(data) {
            console.log(data);
            //return data;
        }
    });
}
*/

// is this in use???
/*
function getMessages(access_token) {
    //var num_messages = 0;
    var message_td = '';
    var active_ids = [];
    var nu_new_messages = [];
    var parent_active = [];

    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        url: remote_url + '/api/users/messages',
        type: 'post',
        async: false,
        data: { 'access_token': access_token },
        success: function(data) {
            //console.log(data);

            $.each(JSON.parse(data), function(i, va) {
                console.log(va)
                $.each(va.replies, function(r, rep) {
                    if (rep.status == 'sent') {
                        nu_new_messages.push('1');
                        active_ids.push(rep.id);
                        parent_active.push(rep.reply_to);
                    }
                });

                if (va.reply_to == null) {
                    //console.log(va);
                    let date = moment(va.updated_at, 'YYYY-MM-DD h:mm:ss A').format('MMM DD, YYYY');
                    if (va.status == 'sent') {
                        nu_new_messages += 1;
                        message_td += '<tr class="font-weight-bold" id="user-message-main" rel="' + va.id + '"><td>' + va.sender.first_name + ' ' + va.sender.last_name + '</td><td><span class="truncate-texts">' + va.message + '<span><br><small class="text-secondary">' + date + '</small></td></tr>';
                        //play new message sound

                    } else {
                        message_td += '<tr id="user-message-main" rel="' + va.id + '"><td>' + va.sender.first_name + ' ' + va.sender.last_name + '</td><td><span class="truncate-texts">' + va.message + '<span><br><small class="text-secondary">' + date + '</small></td></tr>';
                    }

                }


            });

            //gawin lahat dito

            //console.log('active id is ' + active_ids)

            $('#db-messaging').html(message_td);
            if (nu_new_messages.length >= 1) {
                $('#notif-toggle').append('<span class="badge badge-danger badge-pill num-notif">' + nu_new_messages.length + '</span>');
                $('#num-messages-li').text(nu_new_messages.length);

                if (nu_new_messages.length > num_message) {
                    window.webkit.messageHandlers.playNewMessage.postMessage('0');
                    num_message = nu_new_messages.length;
                }

                $.each(parent_active, function(index, value) {
                    $('[rel="' + value + '"]').addClass('font-weight-bold');
                });
            } else {
                $('.num-notif').hide();
            }
            //console.log(nu_new_messages);
        }
    });
}
*/

$('#user-messages').click(function() {
    $('#dashboard-tab').click();
    $('.custom-body-box ul li').find('#home-tab').click();
});

$(document).on('click', '#user-message-main', async function() {
    console.log('read message here' + $(this).attr('rel'));
    var convo_thread = '';
    var read_msg = [];

    let url = remote_url + '/api/users/message';
    const message_id =  $(this).attr('rel')
    try{
        let response = await axios.post(url, { 'access_token': access_token, 'message_id': message_id })
        let data = response.data

        var from_usr = '';
        var replyto = '';

        var entry = JSON.parse(data);

        convo_thread += '<div class="convo-solo" style="text-align: left !important;"><span class="font-weight-bold text-primary">' + entry.sender.first_name + ' ' + entry.sender.last_name + '</span>&nbsp;<span class="text-secondary">' + entry.created_at + '<span><div class="text-dark message-body-txt">' + entry.message + '</div><div><input type="hidden" name="sender" id="reply-sender" value="' + entry.to_id + '"> <input id="reply-receiver" type="hidden" value="' + entry.from_id + '"><input name="reply_to" type="hidden" id="reply-to" value="' + entry.reply_to + '">';

        $('#reply-reply_to').val(entry.reply_to);
        replyto = entry.reply_to;
        console.log(entry.status)
        if (entry.status == 'sent') {
            read_msg.push(entry.id);
        }

        //console.log(entry.replies);

        if (entry.replies.length >= 1) {
            $.each(entry.replies, function(i, v) {

                convo_thread += '<div class="convo-solo" style="text-align: left !important;"><span class="font-weight-bold text-primary">' + v.first_name + ' ' + v.last_name + '</span>&nbsp;<span class="text-secondary">' + v.created_at + '<span><div class="text-dark message-body-txt">' + v.message + '</div><div><input type="hidden" name="sender" id="reply-sender" value="' + v.to_id + '"> <input id="reply-receiver" type="hidden" value="' + v.from_id + '"><input name="reply_to" type="hidden" id="reply-to" value="' + v.reply_to + '">';

                $('#reply-reply_to').val(v.reply_to);
                replyto = v.reply_to;

                if (v.status == 'sent') {
                    read_msg.push(v.id);
                }

            });
        }

        if (replyto == null) {
            $('#reply-reply_to').val(entry.id);
        }
    } catch(e){
        console.log(e)
    }

    //console.log('read msgs' + read_msg);
    if (read_msg.length >= 1) {
        url = remote_url + '/api/users/message-read'
        try{
            response = await axios.post(url, { 'access_token': access_token, 'ids': read_msg })
            data = response.data
            console.log(data);
        } catch(e){
            console.log(e)
        }
    }

    $('.user-msg-thread').html(convo_thread);
    $('#modalMessageCenter').modal('show');
});

$(document).on('click', '#open-message', function() {
    var convo_thread = '<input type="hidden" name="sender" id="reply-sender" value="' + user_id + '"> <input id="reply-receiver" type="hidden" value="1"><input type="hidden" id="reply-to" value="">';

    $('.user-msg-thread').html(convo_thread);

    $('#modalMessageCenter').modal('show');
});

$('#modalMessageCenter').on('hide.bs.modal', function(e) {
    $('#success-handler-msg').text('');
    $('#err-handler-msg').text('');
});

$('#modalVacationLeave').on('hide.bs.modal', function(e) {
    $('#modalVacationLeave').find('#err-handler').text('');
});

$('#modalSickLeave').on('hide.bs.modal', function(e) {
    $('#modalSickLeave').find('#err-handler').text('');
    $('#modalSickLeave input').val('');
    $('#modalSickLeave textarea').val('');
});

$('#modalChangeShift').on('hide.bs.modal', function(e) {
    $('#modalChangeShift').find('#err-handler').text('');
    $('#modalChangeShift textarea').val('');
});

$('#modalReqOvertime').on('hide.bs.modal', function(e) {
    $('#modalReqOvertime').find('#err-handler').text('');
    $('#modalReqOvertime textarea').val('');
});

$('#pp-send-message').on('click', async function(e) {
    e.preventDefault();

    if ($('#msg-reply').val() == '') {
        $('#err-handler-msg').text('Message cannot be empty');
    } else {
        var message = $('#msg-reply').val();
        var to = $('#reply-receiver').val();
        var from = $('#reply-sender').val();
        var reply_to = $('#reply-to').val();
        /*
            url: remote_url + '/api/users/message-save',
            type: 'post',
            data: { 'access_token': access_token, 'message': message, 'to': to, 'from': from, 'reply_to': reply_to },
        */
       try{
           const response = await axios.post(remote_url + '/api/users/message-save', {
            'access_token': access_token, 'message': message, 'to': to, 'from': from, 'reply_to': reply_to
           })
           const data = response.data
                //console.log(data);
            if (data == '1') {
                //$('#modalMessageCenter').modal('hide');
                $('#msg-reply').val('');
                $('#err-handler-msg').text('');
                $('#success-handler-msg').text('message sent');
            }
        }catch(error){
            console.log(error)
        }        
    }
});

$('#reqcon-form-msg').submit(function(e) {

    e.preventDefault();

    if ($('#msg-reply').val() == '') {
        $('#err-handler-msg').text('Details are required and cannot be empty');
    } else {
        var actionurl = remote_url + '/api/users/message-save';

        //var data = new FormData();
        var data = new FormData($(this)[0]);
        $(this).find('#err-handler').text('');

        $.ajax({
            url: actionurl,
            method: "POST",
            processData: false,
            contentType: false,
            data: data,
            success: function(data) {
                //console.log(data);
                $('#modalMessageCenter').modal('show');
            },
            error: function(e) {
                console.log(e);
            }
        });

        $('textarea').val('');
    }
});

$('#logged-user-re').click(function() {
    $('.timeinclone').find('#timeinModal').modal('show');
});

File.prototype.convertToBase64 = function(callback) {
    var reader = new FileReader();
    reader.onloadend = function(e) {
        callback(e.target.result, e.target.error);
    };
    reader.readAsDataURL(this);
};

const updateNotification = document.getElementById('updateNotification');
const updateMessage = document.getElementById('updateMessage');
const restartButton = document.getElementById('restart-app-button');

function closeNotification() {
    updateNotification.classList.add('hidden');
}

function restartApp() {
    ipcRenderer.send('restart_app');
}

ipcRenderer.on('update_available', () => {
  ipcRenderer.removeAllListeners('update_available');
  updateMessage.innerText = 'A new update is available. Downloading now...';
  updateNotification.classList.remove('hidden');
});

ipcRenderer.on('update_downloaded', () => {
  ipcRenderer.removeAllListeners('update_downloaded');
  updateMessage.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
  restartButton.classList.remove('hidden');
  updateNotification.classList.remove('hidden');
});


ipcRenderer.on("ping-pong", function(event, data) {
    doPingpong();
});

ipcRenderer.on("message-from-worker", function(event, arg) {
    let payload = arg.payload;
    //console.log("yes");
    popupWarning();

});

ipcRenderer.on("timer-start", function(event, t) {
    if (t !== null) {
        //$('.timer-ctr').text(t);
        refreshTimer(t, user_eod, goOT);
    } else {
        $('.timer-ctr').text('');
    }
});

ipcRenderer.on("br-timer-start", function(event, t) {
    if (t !== null) {
        $('.timer-br').text(t);
    } else {
        $('.timer-br').text('');
    }
});

ipcRenderer.on("clock-out", function(event, t) {
    clockOutUser(access_token);
});

ipcRenderer.on("idle-report", async function(event, t) {
    await postIdle('start');
    remindUserIdle();
    let sound = new Audio(path.join(__dirname, '/assets/audio/message.mp3'));
    sound.play();
});

ipcRenderer.on("no-connection", function(event, t) {
    noInternet();
});