function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var debugQS = getParameterByName('debug');
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = '/_scripts/scripts.min.js?v=@datetime';

if (debugQS && debugQS.length > 0) {
    if (debugQS === 'true') {
        script.src = '/_scripts/scripts.js?v=@datetime';
    }
}

document.body.appendChild(script);