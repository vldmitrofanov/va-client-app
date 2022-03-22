const {ipcRenderer} = require('electron');

ipcRenderer.on("timer-start", function(event, t) {
  $('#gotimer').css('color', 'orange').text(t);
  $('#status-icon').html('<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-stopwatch-fill" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6.5 0a.5.5 0 0 0 0 1H7v1.07A7.001 7.001 0 0 0 8 16 7 7 0 0 0 9 2.07V1h.5a.5.5 0 0 0 0-1h-3zm2 5.6a.5.5 0 1 0-1 0v2.9h-3a.5.5 0 0 0 0 1H8a.5.5 0 0 0 .5-.5V5.6z"/></svg>');
});

ipcRenderer.on("new-task-name", function(event, t) {
  $('#task-name').html(t);
  console.log('got task ' + t);
});

$('#max-window').click(function(){
  ipcRenderer.send('max-window', 'max-window');
});

ipcRenderer.on("br-timer-start", function(event, t) {
  $('#task-name').html('On Break');
  $('#gotimer').css('color', '#fafafa').text(t);
  $('#status-icon').html('<svg width="0.8em" height="0.8em" viewBox="0 0 16 16" class="bi bi-cup-fill" fill="gray" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M1 2a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1h.5A1.5 1.5 0 0 1 16 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-.55a2.5 2.5 0 0 1-2.45 2h-8A2.5 2.5 0 0 1 1 12.5V2zm13 10h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H14v8z"/></svg>');
});

var windowTopBar = document.createElement('div');
windowTopBar.style.width = "100%";
windowTopBar.style.height = "100%";
windowTopBar.style.backgroundColor = "none";
windowTopBar.style.position = "absolute";
windowTopBar.style.top = windowTopBar.style.left = 0;
windowTopBar.style.webkitAppRegion = "drag";
document.body.appendChild(windowTopBar);
