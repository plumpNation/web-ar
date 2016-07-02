require('babel-polyfill');

import Scene from './scene3d';
import JsAruco from './ar';
import {ajax} from './util';

window.onload = function () {
    let url = window.location.hash.substring(1);

    ajax({'url': url, 'responseType': 'json'})
        .then(onConfigLoad, onError);
};

function onConfigLoad(config) {
    let arOptions = {
            video    : document.getElementById('feed'),
            canvas   : document.getElementById('ar'),
            debug    : config.debug,
            modelSize: config.markerSize || 39
        },

        ar = new JsAruco(arOptions),

        scene = new Scene({
            element: document.getElementById('threejs')
        }),

        feed = (config.feed === 'camera') ?
            ar.setCameraFeed() :
            ar.setVideoFeed(config.feed);

        onFeedEstablished = function () {
            scene.resize(ar.width, ar.height);
            scene.loadModel(config.model, config.settings);
        };

    feed.then(onFeedEstablished, function (e) {
        console.error(e);
    });

    document.addEventListener('ar', () => scene.update(ar.getData()));

    window.addEventListener('resize', () => {
        ar.resize(window.innerWidth, window.innerHeight);
        scene.resize(ar.width, ar.height);
    });
}

function onError(e){
    console.error('error', e);

    document.getElementById('container').innerText = e;
}
