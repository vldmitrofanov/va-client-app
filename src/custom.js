const { ipcRenderer } = require('electron');
const $ = require('jquery');
const { appSettings } = require('./env.js')
const axios = require('axios')

localStorage.removeItem("userDataTimedlyTimedin");
var timedlyuserdata = localStorage.getItem("userDataTimedlyNewton");

ipcRenderer.send('app-exit', '1');

if (localStorage.getItem("userLoggedUser") != null) {
    var userdata = localStorage.getItem("userLoggedUser").split('//');
    console.log(userdata);
    $('#email').val(userdata[0]);
    $('#password').val(userdata[1]);
}

const remote_url = appSettings.remote_url;

if (timedlyuserdata != null) {
    window.location.href = 'main.html';
}

$('#btn-login').on('click', async function(e) {
    e.preventDefault();
    var $this = $(this);

    $('#home-error').text('');
    $this.text('Submitting... please wait...');
    var email = $('#email').val();
    var password = $('#password').val();
    localStorage.setItem("userLoggedUser", email + '//' + password);
    /*
    $.ajax({
        url: remote_url + '/api/auth/login',
        type: 'post',
        data: { email: email, password: password },
        dataType: "json",
        success: function(data) {
            //console.log(data.settings['idle-interval']);
            $('#home-error').text(data.error_msg);

            if (data.status == 'success') {
                localStorage.setItem("userDataTimedlyNewton", JSON.stringify(data));
                localStorage.setItem("idletime", data.settings['idle-interval']);
                //console.log(data);
                window.location.href = 'main.html';
            } else {
                $this.text('Login');
            }
        }
    });
    */
    const url = remote_url + '/api/auth/login'
    try{
        const response = await axios.post(url, {
            email: email, password: password
        })
        const data = response.data
        $('#home-error').text(data.error_msg);
        if (data.status == 'success') {
            localStorage.setItem("userDataTimedlyNewton", JSON.stringify(data));
            localStorage.setItem("idletime", data.settings['idle-interval']);
            //console.log(data);
            localStorage.setItem("access_token", data.user.access_token);
            window.location.href = 'main.html';
        } else {
            $this.text('Login');
        }
    } catch(e){
        console.log(e)
        $('#home-error').text('Connection error');
    }
});