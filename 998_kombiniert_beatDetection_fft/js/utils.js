/*******************************/
/* Code für die Kick Detection */
/*******************************/
let ampLevel, ampLevelClamp;

let ampVolhistory = [];
let ampEnergyArray = [];
let thresholdKick;
let kickDetected = false;
let maxAmpFreq = 0;

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

  if (debugKick == true) debuggerKick();

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

function getAmplitudeAverage() {

}

// Update thresholds dynamically
function updateThresholdsKick() {
  maxAmpFreq = max(maxAmpFreq, ampLevelClamp);
  maxAmpFreq *= 0.99999;
  thresholdKick = maxAmpFreq * thresholdKickFraction;
}

function debuggerKick() {
  stroke(0);
  strokeWeight(1);
  noFill();
  push();
  let currentY = map(ampLevelClamp, 0, 1, height);
  translate(0, height / 2 - currentY);
  beginShape();
  for (let i = 0; i < ampVolhistory.length; i++) {
    let y = map(ampVolhistory[i], 0, 1, 100, 0);
    vertex(i, y);
  }
  endShape();
  pop();

  if (ampVolhistory.length > 90) {
    ampVolhistory.splice(0, 1);
  }

  if (kickDetected) {
    strokeWeight(10);
    fill(0, 255, 100);
    ellipse(width / 2, height / 2, 200, 200); // Bildschirm kurz rot anzeigen bei Kick
  }
}

/**********************************/
/* Code für FFT, Spectrum, Energy */
/**********************************/
let sub_freq = 0;
let low_freq = 0;
let mid_freq = 0;
let hi_freq = 0;
let treble_freq = 0;

function getFFTEnergy() {
  low_fft.analyze();
  mid_fft.analyze();
  high_fft.analyze();

  sub_freq = low_fft.getEnergy("bass");
  low_freq = low_fft.getEnergy("lowMid");
  mid_freq = mid_fft.getEnergy("mid");
  hi_freq = high_fft.getEnergy("highMid");
  treble_freq = high_fft.getEnergy("treble");

  if (debugFFT == true) debuggerFFT();

  return [sub_freq, low_freq, mid_freq, hi_freq, treble_freq];
}


function debuggerFFT() {
  push();
  noFill();
  strokeWeight(1);
  translate(width - 250, 100);
  ellipse(0, 0, sub_freq);
  ellipse(50, 0, low_freq);
  ellipse(100, 0, mid_freq);
  ellipse(150, 0, hi_freq);
  ellipse(200, 0, treble_freq);
  pop();
}