function isMobile () {
    return /Android|mobile|iPad|iPhone/i.test(navigator.userAgent);
}

// NOTE: the original value of this was 24, which was very smooth, but slower to track
var interpolationFactor = 4;

var trackedMatrix = {
  // for interpolation
  delta: [
      0,0,0,0,
      0,0,0,0,
      0,0,0,0,
      0,0,0,0
  ],
  interpolated: [
      0,0,0,0,
      0,0,0,0,
      0,0,0,0,
      0,0,0,0
  ]
}

var setMatrix = function (matrix, value) {
    var array = [];
    for (var key in value) {
        array[key] = value[key];
    }
    if (typeof matrix.elements.set === "function") {
        matrix.elements.set(array);
    } else {
        matrix.elements = [].slice.call(array);
    }
};

const setupScene = (renderer, scene, camera, root, marker) => {
    renderer.setPixelRatio(window.devicePixelRatio);
    
    camera.matrixAutoUpdate = false;
    scene.add(camera);

    const light = new THREE.AmbientLight(0xffffff);
    scene.add(light);

    scene.add(root);
    root.matrixAutoUpdate = false;

    const ARVideo = document.getElementById('campaignVideo');
    const texture = new THREE.VideoTexture(ARVideo);
    const mat = new THREE.MeshLambertMaterial({ color: 0xbbbbff, map: texture });
    const planeGeom = new THREE.PlaneGeometry(4, 3, 1, 1);
    const videoPlane = new THREE.Mesh(planeGeom, mat);

    // TODO: Note, the objects positioning over the tracked object gets set
    // TODO: in ARnft.js add() method
    // TODO: pixel to meter conversion?  "(msg.height / msg.dpi * 2.54 * 10) / 2.0"
    // TODO: NOTE, it seems the msg height, dpi values are retrieved from then marker descriptor files (not the)
    // TODO: which is probably why this is set using 'getNFTData' event (likely triggered once desc files are loaded)

    videoPlane.position.y = (marker.height / marker.dpi * 2.54 * 10) / 2.0
    videoPlane.position.x = (marker.width / marker.dpi * 2.54 * 10) / 2.0
    
    videoPlane.scale.set(marker.scale, marker.scale, marker.scale);
    videoPlane.visible = true;

    // const axesHelper = new THREE.AxesHelper(50);
    // root.add(axesHelper);

    root.add(videoPlane);
};

function start(marker, cameraVideo, cameraVideoW, cameraVideoH, cameraCanvas) {
    var vw, vh;
    var sw, sh;
    var pScale, sScale;
    var w, h;
    var pw, ph;
    var ox, oy;
    var world;
    var worker;

    var canvas_process = document.createElement('canvas');
    var context_process = canvas_process.getContext('2d');

    var renderer = new THREE.WebGLRenderer({
        canvas: cameraCanvas, 
        alpha: true, 
        antialias: true, 
        precision: "mediump",
    });
    var scene = new THREE.Scene();    
    var camera = new THREE.Camera();
    var root = new THREE.Object3D();

    setupScene(renderer, scene, camera, root, marker);

    function load() {
        vw = cameraVideoW;
        vh = cameraVideoH;

        pScale = 320 / Math.max(vw, vh / 3 * 4);
        sScale = isMobile() ? window.outerWidth / cameraVideoW : 1;

        sw = vw * sScale;
        sh = vh * sScale;

        w = vw * pScale;
        h = vh * pScale;
        pw = Math.max(w, h / 3 * 4);
        ph = Math.max(h, w / 4 * 3);
        ox = (pw - w) / 2;
        oy = (ph - h) / 2;
        canvas_process.style.clientWidth = pw + "px";
        canvas_process.style.clientHeight = ph + "px";
        canvas_process.width = pw;
        canvas_process.height = ph;

        renderer.setSize(sw, sh);

        worker = new Worker('libs/artoolkitNFT.worker.js');

        worker.postMessage({
            type: "load", 
            pw: pw, 
            ph: ph, 
            camera_para: 'Data/camera_para.dat', 
            marker: marker.url 
        });

        worker.onmessage = function (ev) {
            var msg = ev.data;
            switch (msg.type) {
                case "loaded": {
                    var proj = JSON.parse(msg.proj);
                    var ratioW = pw / w;
                    var ratioH = ph / h;
                    proj[0] *= ratioW;
                    proj[4] *= ratioW;
                    proj[8] *= ratioW;
                    proj[12] *= ratioW;
                    proj[1] *= ratioH;
                    proj[5] *= ratioH;
                    proj[9] *= ratioH;
                    proj[13] *= ratioH;
                    setMatrix(camera.projectionMatrix, proj);
                    break;
                }

                case "endLoading": {
                    if (msg.end == true) {
                        // removing loader page if present
                        var loader = document.getElementById('loading');
                        if (loader) {
                            loader.querySelector('.loading-text').innerText = 'Start tracking!';
                            setTimeout(function(){
                                loader.parentElement.removeChild(loader);
                            }, 1000);
                        }
                    }
                    break;
                }
                
                case 'found': {
                    found(msg);
                    break;
                }
                
                case 'not found': {
                    found(null);
                    break;
                }
            }
            
            process();
        };
    };

    function found(msg) {
      if (!msg) {
        world = null;
      } else {
        world = JSON.parse(msg.matrixGL_RH);
      }
    };

    function draw() {
        if (!world) {
            root.visible = false;
        } else {
            root.visible = true;

            // interpolate matrix
            for (var i = 0; i < 16; i++) {
                trackedMatrix.delta[i] = world[i] - trackedMatrix.interpolated[i];
                trackedMatrix.interpolated[i] =
                trackedMatrix.interpolated[i] +
                trackedMatrix.delta[i] / interpolationFactor;
            }

            // set matrix of 'root' by detected 'world' matrix
            setMatrix(root.matrix, trackedMatrix.interpolated);
        }
        renderer.render(scene, camera);
    };

    function process() {
        context_process.fillStyle = 'black';
        context_process.fillRect(0, 0, pw, ph);
        context_process.drawImage(cameraVideo, 0, 0, vw, vh, ox, oy, w, h);

        var imageData = context_process.getImageData(0, 0, pw, ph);
        worker.postMessage({ type: 'process', imagedata: imageData }, [imageData.data.buffer]);
    }

    function tick() {
        draw();
        requestAnimationFrame(tick);
    };

    load();
    tick();
    process();
}
