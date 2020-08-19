# jsartoolkitnft-wrapper-video

A prototype to test placing a video over a tracked image using jsartoolkitNFT, with some setup code in a wrapper.

The setup code is taken from ARnft.


## artoolkitNFT, Three.js settings / config

Consider adjusting these settings to tune performance

#### Three.js
* WebGLRenderer
  * precision: mediump, highp
  * was originally not set, defaulting to highp; I set it to mediump, hoping for a performance improvement, didn't seem to make a difference
