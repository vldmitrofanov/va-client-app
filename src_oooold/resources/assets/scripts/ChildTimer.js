let _options = {
    interval: 1000,
    offset: 0,
    preventExit: false
},
    props = ['interval', 'offset'],
    _intervalId = false,
    _ticks = 0,
    start = function () {
        _ticks = _options.offset;
        _intervalId = setInterval(function () {
            process.send({ ticks: _ticks++ });
        }, _options.interval);
    },
    pause = function() {
        _ticks = 0;
        _options.offset = 0;
        clearInterval(_intervalId);
    },
    reset = function () {
        _ticks = 0;
    },
    stop = function () {
        clearInterval(_intervalId);
        _ticks = 0;
        if (_options.preventExit === false) {
            process.exit();
        }
    };

process.on('message', (msg) => {
    if (msg.type === 'start') {
        props.forEach(function (prop) {
            if (typeof msg.options[prop] !== 'undefined') {
                _options[prop] = msg.options[prop];
            }
        });

        start();
    } else if (msg.type === 'pause') {
        pause();
    } else if (msg.type === 'reset') {
        reset();
    } else if (msg.type === 'stop') {
        stop();
    }
});