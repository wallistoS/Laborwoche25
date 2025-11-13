let video;
let sound;
let isStarted = false;

// Video/Visual params
let baseSpacing = 6;
let spacing = 8;
let minB = 20;
let maxB = 255;

// Audio analysis
let amplitude, isBeatDetected, ampAverage;
let low_fft, mid_fft, high_fft;
let band_cnt = 512;
let fftEnergy;

// Beat detection params
const levelMultiplicator = 1000;
let minClamp = 75;
let maxClamp = 100;
let thresholdKickFraction = 0.5;
let ampLevel, ampLevelClamp;
let ampVolhistory = [];
let ampEnergyArray = [];
let thresholdKick;
let kickDetected = false;
let maxAmpFreq = 0;

// FFT frequencies
let sub_freq = 0;
let low_freq = 0;
let mid_freq = 0;
let hi_freq = 0;
let treble_freq = 0;

// Effect modifiers
let distortionAmount = 0;
let sizeMod = 1;

// Gamma and Wave distortion effects
let gammaAmount = 0;
let waveDistortAmount = 0;

// RGB Flash effect on kick
let showColorOnKick = false;
let colorDecay = 1;

// Canvas offset for centering
let offsetX = 0;
let offsetY = 0;

console.log("sketch2 running");
function preload() {
  // put your video in the project's folder and update the filename
  video = createVideo("wald_reverse.mp4");
  sound = loadSound("test.mp3");
  console.log("video loaded");
}
function setup() {
  createCanvas(1920, 450);
  frameRate(30);
  
  // shrink video resolution so 1 pixel = 1 circle
  video.size(width / baseSpacing, height / baseSpacing);
  video.hide(); // don't show raw video element
  
  // Calculate offset to center the bitmap
  offsetX = (width - (video.width * baseSpacing)) / 2;
  offsetY = (height - (video.height * baseSpacing)) / 2;
  
  // Ensure muted before playback to allow autoplay in modern browsers
  video.volume(0); // keep volume at 0 as a fallback
  if (video && video.elt) {
    // mute underlying HTMLVideoElement
    video.elt.muted = true;
    // request autoplay and inline playback (helps on iOS/Safari)
    video.elt.autoplay = true;
    video.elt.playsInline = true;
    video.elt.setAttribute && video.elt.setAttribute('playsinline', '');
  }
  // p5 helper to set playsinline attribute as well
  if (video && video.attribute) {
    video.attribute('playsinline', '');
  }
  // start playback after muting/attributes
  video.loop(); // start playback
  
  // Audio setup
  amplitude = new p5.Amplitude();
  low_fft = new p5.FFT(0.9, band_cnt);
  mid_fft = new p5.FFT(0.75, band_cnt);
  high_fft = new p5.FFT(0.5, band_cnt);
  low_fft.setInput(sound);
  mid_fft.setInput(sound);
  high_fft.setInput(sound);
  
  noStroke();
}

function mousePressed() {
  if (!isStarted) {
    sound.play();
    isStarted = true;
  } else {
    sound.pause();
    isStarted = false;
  }
}

function draw() {
  background(255);
  
  // Audio analysis
  if (isStarted) {
    isBeatDetected = beatDetection();
    ampAverage = amplitude.getLevel();
    fftEnergy = getFFTEnergy();
    
    // Apply audio-reactive effects (subtler now)
    // Bass → Spacing modulation (reduced)
    spacing = baseSpacing + map(sub_freq + low_freq, 0, 400, 0, 2);
    
    // Kick → Distortion (reduced)
    if (isBeatDetected) {
      distortionAmount = 3;
      waveDistortAmount = 1.2; // Wave distortion on beat!
      // Show video colors on kick - FULL INTENSITY
      showColorOnKick = true;
      colorDecay = 1.5; // more color intensity (boosted)
    } else {
      distortionAmount *= 0.85; // smooth decay
      waveDistortAmount *= 0.88; // wave distortion fades out
      colorDecay *= 0.95; // slower fade = longer color visibility
      if (colorDecay < 0.1) {
        showColorOnKick = false;
        colorDecay = 0;
      }
    }
    
    // Mid → Size modulation (reduced)
    sizeMod = 1 + map(mid_freq, 0, 255, 0, 0.15);
    
    // Treble → Gamma effect (audio-reactive, reduziert)
    gammaAmount = map(treble_freq, 0, 255, 0, 0.5);
    
  } else {
    spacing = baseSpacing;
    distortionAmount = 0;
    sizeMod = 1;
    gammaAmount = 0;
    waveDistortAmount *= 0.88; // fade out even when music is paused
    colorDecay *= 0.95;
    if (colorDecay < 0.1) {
      showColorOnKick = false;
      colorDecay = 0;
    }
  }
  
  // Recalculate center offset based on current spacing
  offsetX = (width - (video.width * spacing)) / 2;
  offsetY = (height - (video.height * spacing)) / 2;
  
  // Apply wave distortion effect (like V key)
  if (waveDistortAmount > 0) {
    video.loadPixels();
    let wavinessX = waveDistortAmount * 8;
    let wavinessY = waveDistortAmount * 8;
    let periodX = 15;
    let periodY = 15;
    
    let w = video.width;
    let h = video.height;
    let tempPixels = new Uint8ClampedArray(video.pixels);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let tempX = constrain(floor(x + wavinessX * sin(x / periodX)), 0, w - 1);
        let tempY = constrain(floor(y + wavinessY * sin(y / periodY)), 0, h - 1);
        
        let srcIdx = (tempY * w + tempX) * 4;
        let dstIdx = (y * w + x) * 4;
        
        tempPixels[dstIdx] = video.pixels[srcIdx];
        tempPixels[dstIdx + 1] = video.pixels[srcIdx + 1];
        tempPixels[dstIdx + 2] = video.pixels[srcIdx + 2];
        tempPixels[dstIdx + 3] = video.pixels[srcIdx + 3];
      }
    }
    
    video.pixels.set(tempPixels);
    video.updatePixels();
  }
  
  // Apply gamma effect (like Spacebar)
  if (gammaAmount > 0) {
    video.loadPixels();
    let gamma = 1 - (gammaAmount * 0.4); // reduced from 0.5 to 0.4
    
    for (let i = 0; i < video.pixels.length; i += 4) {
      video.pixels[i] = pow(video.pixels[i] / 255, 1 / gamma) * 255;
      video.pixels[i + 1] = pow(video.pixels[i + 1] / 255, 1 / gamma) * 255;
      video.pixels[i + 2] = pow(video.pixels[i + 2] / 255, 1 / gamma) * 255;
    }
    video.updatePixels();
  }
  
  // Draw bitmap
  video.loadPixels();
  for (let y = 0; y < video.height; y++) {
    for (let x = 0; x < video.width; x++) {
      let i = (x + y * video.width) * 4;
      let r = video.pixels[i];
      let g = video.pixels[i + 1];
      let b = video.pixels[i + 2];
      let brightness = (r + g + b) / 3;
      
      let circleSize = map(brightness, minB, maxB, spacing, 2) * sizeMod;
      
      // Position with distortion effect + centering
      let xPos = offsetX + x * spacing;
      let yPos = offsetY + y * spacing;
      
      if (distortionAmount > 0.1) {
        let distortX = random(-distortionAmount, distortionAmount);
        let distortY = random(-distortionAmount, distortionAmount);
        xPos += distortX;
        yPos += distortY;
      }
      
      // Use video colors on kick, otherwise black
      if (showColorOnKick && colorDecay > 0) {
        // Lerp between video color and black based on decay
        // Clamp colorDecay to max 1.0 for lerp, but allow boosted intensity
        let intensity = constrain(colorDecay, 0, 1);
        let cr = lerp(0, r, intensity);
        let cg = lerp(0, g, intensity);
        let cb = lerp(0, b, intensity);
        
        // Boost saturation/brightness for more vibrant colors
        if (colorDecay > 1) {
          let boost = colorDecay;
          cr = constrain(cr * boost, 0, 255);
          cg = constrain(cg * boost, 0, 255);
          cb = constrain(cb * boost, 0, 255);
        }
        
        fill(cr, cg, cb);
      } else {
        fill(0);
      }
      
      ellipse(xPos, yPos, circleSize);
    }
  }
}

/*******************************/
/* Beat Detection Functions    */
/*******************************/
function beatDetection() {
  ampLevel = amplitude.getLevel() * levelMultiplicator;
  ampEnergyArray.push(ampLevel);
  if (ampEnergyArray.length > 180) {
    ampEnergyArray.shift();
  }
  let maxAmp = max(ampEnergyArray);

  let minLevel = map(minClamp, 0, 100, 0, maxAmp);
  let maxLevel = map(maxClamp, 0, 100, 0, maxAmp);

  ampLevelClamp = constrain(ampLevel, minLevel, maxLevel);
  ampLevelClamp = map(ampLevelClamp, minLevel, maxLevel, 0, 1);
  ampVolhistory.push(ampLevelClamp);

  if (ampLevelClamp >= 0)
    updateThresholdsKick();

  if (ampLevelClamp > thresholdKick && !kickDetected) {
    kickDetected = true;
    return true;
  } else if (ampLevelClamp < thresholdKick) {
    kickDetected = false;
    return false;
  } else {
    return false;
  }
}

function updateThresholdsKick() {
  maxAmpFreq = max(maxAmpFreq, ampLevelClamp);
  maxAmpFreq *= 0.99999;
  thresholdKick = maxAmpFreq * thresholdKickFraction;
}

/*******************************/
/* FFT Energy Functions        */
/*******************************/
function getFFTEnergy() {
  low_fft.analyze();
  mid_fft.analyze();
  high_fft.analyze();

  sub_freq = low_fft.getEnergy("bass");
  low_freq = low_fft.getEnergy("lowMid");
  mid_freq = mid_fft.getEnergy("mid");
  hi_freq = high_fft.getEnergy("highMid");
  treble_freq = high_fft.getEnergy("treble");

  return [sub_freq, low_freq, mid_freq, hi_freq, treble_freq];
}