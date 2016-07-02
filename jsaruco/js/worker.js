console.log('Web worker running worker');

// The aruco and cv scripts use the window object as a global object
let window = self;
importScripts('../lib/aruco.js', '../lib/cv.js');

let detector = new self.AR.Detector();

onmessage = function (e) {
    let markers = detector.detect(e.data);

    postMessage(markers);
}
