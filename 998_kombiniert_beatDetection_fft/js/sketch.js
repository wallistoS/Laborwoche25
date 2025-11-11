let isStarted = false;
let sound;

/***************************************/
/* Variablen für FFT, Spectrum, Energy */
/***************************************/
let spectrum;
let fftEnergy;

/************************************/
/* Variablen für die Kick Detection */
/************************************/
let amplitude, isBeatDetected, ampAverage;
let low_fft, mid_fft, high_fft;
let band_cnt = 512;

const levelMultiplicator = 1000;
let minClamp = 75;
let maxClamp = 100;
let thresholdKickFraction = 0.5;

const debugFFT = true;
const debugKick = true;

function preload() {
  sound = loadSound("./assets/audio/test.mp3");
}

function setup() {
  createCanvas(1920, 1080);
  frameRate(30);

  amplitude = new p5.Amplitude();

  low_fft = new p5.FFT(0.9, band_cnt);
  mid_fft = new p5.FFT(0.75, band_cnt);
  high_fft = new p5.FFT(0.5, band_cnt);
  low_fft.setInput(sound);
  mid_fft.setInput(sound);
  high_fft.setInput(sound);
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
  background(200);

  isBeatDetected = beatDetection();
  ampAverage = amplitude.getLevel();
  fftEnergy = getFFTEnergy();

  console.log(fftEnergy, ampAverage, isBeatDetected);
}

