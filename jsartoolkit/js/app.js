require('babel-polyfill');

import Scene from './scene3d';
import getARInstance from './ar';
import {ajax} from './util';

function onSettingsLoaded(config) {
    let debug = config.debug,

        thresholdSlider = document.getElementById('threshold'),

        scene = new Scene({
            element: document.getElementById('threejs')
        }),

        ar = getARInstance({
            video : document.getElementById('feed'),
            camera: scene.camera,
            debug : debug
        });

    document.addEventListener('ar', function () {
        scene.update(ar.getData());
    });

    thresholdSlider.style.display = debug ? 'inline' : 'none';

    if (debug) {
        thresholdSlider.addEventListener('change', (e) => {
            ar.setThreshold(e.target.valueAsNumber);
        });
    }

    window.addEventListener('resize', function () {
        ar.resize(window.innerWidth, window.innerHeight);
        scene.resize(ar.width, ar.height);
    });

    if (config.feed === 'camera') {
        ar.setCameraFeed()
            .then(() => {
                scene.resize(ar.width, ar.height);
                scene.loadModel(config.model, config.settings);
            }, (e) => {
                console.error(e);
            });

    } else {
        ar.setVideoFeed(config.feed)
            .then(() => {
                scene.resize(ar.width, ar.height);
                scene.loadModel(config.model, config.settings);
            }, (e) => {
                console.error(e);
            });
    }
}

function onSettingsFail(e) {
    console.error('error', e);
    document.getElementById('container').innerText = e;
}

window.onload = function () {
    let url = window.location.hash.substring(1);

    ajax({'url': url, 'responseType': 'json'})
        .then(onSettingsLoaded, onSettingsFail);
};
