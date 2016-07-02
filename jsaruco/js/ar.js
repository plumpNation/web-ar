import aruco from '../lib/aruco';  // adds global variable AR to window
import svd from '../lib/svd';      // adds global variable SVD to window
import cv from '../lib/cv';        // adds global variable CV to window
//import pos from '../lib/posit1'; // adds global variable POS to window
import pos from '../lib/posit2';   // adds global variable POS to window
import THREE from 'three';

const VIDEO_WIDTH = 480;           // video feed doesn't have to match the size of the scene
const AR_EVENT = {
    'UPDATED': 'arEventUpdated'
};

class AR {
    constructor(settings) {
        this._markerSize = settings.modelSize || 39; // size of the markers in real life in mm
        this._debug      = settings.debug;
        this._video      = settings.video;
        this._display    = settings.display || {};

        if (!settings.canvas) {
            this._canvas = document.createElement('canvas');

            if (this._debug) {
                document.body.appendChild(this._canvas);
            }

        } else {
            this._canvas = settings.canvas;
        }

        this._context = this._canvas.getContext('2d');
    }

    setCameraFeed() {
        return new Promise((resolve, reject) => {
            navigator.getUserMedia =
                navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia;

            if (!navigator.getUserMedia) {
                reject('no support for getUserMedia, use a video feed');
                return;
            }

            navigator.getUserMedia({video: true},
                // success
                (stream) => {
                    this._video.addEventListener('loadedmetadata', (e) => {
                        this._setup(e);

                        resolve();
                    });

                    if (window.URL) {
                        this._video.src = window.URL.createObjectURL(stream);

                    } else {
                        this._video.src = stream;
                    }
                },

                // error
                (msg) => {
                    reject('access to webcam not granted', msg);
                }
            );
        });
    }

    setVideoFeed(url) {
        return new Promise((resolve, reject) => {
            this._video.addEventListener('loadedmetadata', (event) => {
                this._setup(event);

                resolve();
            });

            this._video.src = url;
        });
    }

    resize(width/*, height*/) {
        // @TODO: add support for portrait
        this.width          = width;
        this.height         = (1 / this.ratio) * this.width;
        this._canvas.width  = this.width;
        this._canvas.height = this.height;
        this._posit         = new window.POS.Posit(this._markerSize, this.width);
    }

    _outlineMarker(corners, color = 'red') {
        this._context.strokeStyle = color;
        this._context.beginPath();

        for (let j = 0; j < corners.length; ++j) {
            let corner = corners[j];

            this._context.moveTo(corner.x, corner.y);

            corner = corners[(j + 1) % corners.length];

            this._context.lineTo(corner.x, corner.y);
        }

        this._context.stroke();
        this._context.closePath();
    }

    _markCorner(corner, color = 'green') {
        this._context.strokeStyle = color;
        this._context.strokeRect(corner.x - 8, corner.y - 8, 16, 16);
    }

    _pose3dObject(object3d, pose) {
        let position = pose.bestTranslation,
            rotation = pose.bestRotation;

        object3d.position.set(position[0], position[1], -position[2]);

        object3d.rotation.x = -Math.asin(-rotation[1][2]);
        object3d.rotation.y = -Math.atan2(rotation[0][2], rotation[2][2]);
        object3d.rotation.z =  Math.atan2(rotation[1][0], rotation[1][1]);

        // object3d.updateMatrix();

        return object3d;
    }

    _calculatePose(corners) {
        // Now the corner information needs to be converted to place the 3d model correctly.
        for (let n = 0; n < corners.length; n += 1) {
            let corner = corners[n];

            corner.x = corner.x - (this.width / 2);
            corner.y = (this.height / 2) - corner.y;
        }

        return this._posit.pose(corners);
    }

    _create3dModelForAR(corners) {
        let pose          = this._calculatePose(corners),
            posed3dObject = this._pose3dObject(new THREE.Object3D(), pose),
            eventData     = {'object3d': posed3dObject};

        document.dispatchEvent(new CustomEvent(AR_EVENT.UPDATED, {'detail': eventData}));
    }

    _createWorker() {
        let worker = new Worker('js/worker.js');

        worker.onerror = function (error, s) {
            console.error(error);
        };

        worker.onmessage = (e) => {
            let corners,
                markers = e.data;

            if (!markers.length) {
                return;
            }

            // // markers.forEach((marker) => {
            // //     let corners = marker.corners;

            corners = markers[0].corners;

            if (this._debug) {
                this._outlineMarker(corners);
                this._markCorner(corners[0]);
            }

            this._create3dModelForAR(corners);
        }

        return worker;
    }

    _setup(event) {
        this.width         = this._display.width || window.innerWidth;
        this.ratio         = event.target.clientWidth / event.target.clientHeight;
        this.height        = (1 / this.ratio) * this.width;
        this._video.width  = VIDEO_WIDTH;
        this._video.height = (1 / this.ratio) * VIDEO_WIDTH;

        this.resize(this.width, this.height);

        // NOTE The worker must be called from the base.
        this._worker = this._createWorker();

        this._tick();
    }

    _tick() {
        // Send the video feed as an input and draw the snapshot on the canvas feed display.
        this._context.drawImage(this._video, 0, 0, this.width, this.height);

        // Now we have the snapshot, we need to scrap it from the canvas and send it to be
        // processed in the web worker...
        this._worker.postMessage(this._context.getImageData(0, 0, this.width, this.height));

        // ...and keep the render loop running.
        requestAnimationFrame(() => this._tick());
    }
}

export {AR, AR_EVENT};
