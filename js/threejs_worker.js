const VIDEO_WIDTH_16 = 16;
const VIDEO_HEIGHT_9 = 9;

function isMobile () {
    return /Android|mobile|iPad|iPhone/i.test(navigator.userAgent);
}

// NOTE: the original value of this was 24, which was very smooth, but slower to track
var interpolationFactor = 5;

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

const setupScene = (renderer, scene, camera, root, marker, campaignVideoEl) => {
    renderer.setPixelRatio(window.devicePixelRatio);
    
    camera.matrixAutoUpdate = false;
    scene.add(camera);

    scene.add(root);
    root.matrixAutoUpdate = false;

    const texture = new THREE.VideoTexture(campaignVideoEl);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    // note, using a MeshBasicMaterial does not require a light
	const mat = new THREE.MeshBasicMaterial( { map: texture } );

    const planeGeom = new THREE.PlaneBufferGeometry(VIDEO_WIDTH_16, VIDEO_HEIGHT_9, 1, 1);
    const videoPlane = new THREE.Mesh(planeGeom, mat);
    videoPlane.name = "videoPlane";

    // const axesHelper = new THREE.AxesHelper(50);
    // root.add(axesHelper);

    root.add(videoPlane);
};

function setObjectPositionAndScale(scene, imageData) {

    const videoPlane = scene.getObjectByName("videoPlane");

    const imageHeightMM = imageData.height / imageData.dpi * 2.54 * 10;
    const imageWidthMM = imageData.width / imageData.dpi * 2.54 * 10;

    const videoScale = Math.floor(imageWidthMM / videoPlane.geometry.parameters.width);

    videoPlane.position.y =  imageHeightMM / 2.0;
    videoPlane.position.x =  imageWidthMM / 2.0;
    
    videoPlane.scale.set(videoScale, videoScale, 1);
    videoPlane.visible = true;
}

logSync = (...args) => {
  try {
    args = args.map((arg) => JSON.parse(JSON.stringify(arg)));
    console.log(...args);
  } catch (error) {
    console.log('Error trying to console.logSync()', ...args);
  }
};

let isFound = false;

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

    const campaignVideoEl = document.getElementById('campaignVideo');

    setupScene(renderer, scene, camera, root, marker, campaignVideoEl);

    function found(msg) {
        world = msg ? JSON.parse(msg.matrixGL_RH) : null;
    };

    const playVideo = () => {
        campaignVideoEl.play();
    }

    const pauseVideo = () => {
        campaignVideoEl.pause();
    }

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

                case "nftData": {
                    const nft = JSON.parse(msg.nft);
                    const imageData = {
                        dpi: nft.dpi,
                        width: nft.width,
                        height: nft.height,
                    };
                    setObjectPositionAndScale(scene, imageData);
                    break;
                }
                
                case 'found': {
                    if (!isFound) {
                        playVideo();
                        isFound = true;
                    }

                    found(msg);
                    break;
                }
                
                case 'not found': {
                    if (isFound) {
                        pauseVideo();
                        isFound = false;
                    }
                    
                    found(null);
                    break;
                }
            }
            
            process();
        };
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
