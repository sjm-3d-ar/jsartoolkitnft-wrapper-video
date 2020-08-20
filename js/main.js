/**
 * APP / ELEMENTS
 */
var cameraVideo = document.getElementById('cameraVideo');
var cameraCanvas = document.getElementById('cameraCanvas');

/**
 * APP / VIDEO STREAM
 */

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  var hint = {
      audio: false,
      video: true
  };

  if (window.innerWidth < 800) {
      var width = (window.innerWidth < window.innerHeight) ? 240 : 360;
      var height = (window.innerWidth < window.innerHeight) ? 360 : 240;

      var aspectRatio = window.innerWidth / window.innerHeight;

      console.log("window WxH:", width, height);

      hint = {
          audio: false,
          video: {
              facingMode: 'environment',
              width: { min: width, max: width }
          },
      };

      console.log(hint);
  }

  navigator.mediaDevices.getUserMedia(hint).then(function (stream) {
    cameraVideo.srcObject = stream;
    cameraVideo.addEventListener('loadedmetadata', function () {
        cameraVideo.play();

        const marker = {
            // width: 1000,
            // height: 607,
            // dpi: 300,
            // scale: 20,
            // url: "https://avo-content-dev.s3.amazonaws.com/campaign-manager/markers/greenlight/greenlight",
            width: 927,
            height: 486,
            dpi: 72,
            scale: 75,
            url: "https://avo-content-dev.s3.amazonaws.com/campaign-manager/markers/abc_dental/abc_dental",
        };

        start(
            marker,
            cameraVideo,
            cameraVideo.videoWidth,
            cameraVideo.videoHeight,
            cameraCanvas,
        );
    });
  });
}
