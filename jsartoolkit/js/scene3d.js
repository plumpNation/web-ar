'use strict';

import THREE from 'three';

// import ColladaLoader from '../lib/ColladaLoader';

class Scene {

    constructor(settings) {
        this.init(settings);
    }

    init(settings) {
        let dirLight,

            renderOptions = {
                alpha: true
            };

        if (settings && settings.canvas) {
            renderOptions['canvas'] = settings.canvas;
        }

        this.scene    = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer(renderOptions);

        // Only near and far need to be set, the rest is controlled by AR
        this.camera   = new THREE.PerspectiveCamera(0, 0, 1, 100000);

        dirLight      = new THREE.DirectionalLight(0xffffff, 1);

        dirLight.color.setHSL(0.1, 1, 0.95);

        dirLight.position.set(1.5, -1, 3.8);
        dirLight.position.multiplyScalar(50);

        this.renderer.setClearColor(0xffffff, 0);
        this.renderer.setSize(settings.width, settings.height);

        this.scene.add(this.camera);
        this.scene.add(dirLight);

        this.model  = null;
        this.canvas = this.renderer.domElement;

        if (settings && settings.element) {
            settings.element.appendChild(this.canvas);
        }
    }

    /**
     * Render gets called as soon as AR has detected a movement of the marker.
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Do *not* change camera settings here: the camera is controlled by AR!
     */
    resize(width, height) {
        this.renderer.setSize(width, height);
        this.render();
    }

    addModel(model) {
        if (this.model !== null) {
            this.scene.remove(this.model);
        }

        this.model = model;

        this.scene.add(this.model);
    }

    loadModel(url, settings) {
        let loader = new THREE.ObjectLoader();

        loader.load(url, (model) => {
            let container = new THREE.Object3D();

            container.matrixAutoUpdate = false;

            if (settings) {
                if (settings.scale) {
                    var s = settings.scale;

                    model.scale.set(s, s, s);
                }

                if (settings.rotation) {
                    var r = settings.rotation;

                    model.rotation.set(
                        THREE.Math.degToRad(r.x),
                        THREE.Math.degToRad(r.y),
                        THREE.Math.degToRad(r.z)
                    );
                }
            }

            container.add(model);

            this.model = container;

            this.addModel(this.model);

            this.render();
        });
    }

    update(data) {
        if (this.model !== null) {
            this.model.matrix.setFromArray(data);

            this.model.matrixWorldNeedsUpdate = true;

            this.render();
        }
    }
}

export default Scene;
