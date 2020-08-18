/**
 * APP / ELEMENTS
 */
var container = document.getElementById('app');
var video = document.getElementById('video');
var canvas = document.getElementById('canvas');

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
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', function () {
          video.play();

          start(
              container,
              markers['greenlight'],
              video,
              video.videoWidth,
              video.videoHeight,
              canvas,
              () => { },
              () => { },
              null
          );
      });
  });
}
