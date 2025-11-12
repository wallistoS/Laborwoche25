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

const debugFFT = false;
const debugKick = false;

// Beat Detection Variablen
let beatHoldFrames = 5;
let beatThreshold = 0.05;
let beatCutoff = 0;
let beatDecayRate = 0.90;
let framesSinceLastBeat = 0;

/************************************/
/* Windows 7 Desktop Variablen      */
/************************************/
let errorWindows = []; // Array für alle Fehlermeldungen
let kickCounter = 0;
let lastKickCounted = false;

// Desktop Icons
let desktopIcons = [];

// Taskbar Icons
let taskbarIcons = [];

// Glitch-Effekte
let isGlitching = false;
let glitchDuration = 0;
let glitchOffsetX = 0;
let glitchOffsetY = 0;

// FFT Visualisierung
let sub_freq = 0;
let low_freq = 0;
let mid_freq = 0;
let hi_freq = 0;
let treble_freq = 0;

// Spektrum-Historie für Visualisierung
let spectrumHistory = [];

// Crash-Screen Variablen
let crashScheduled = false;
let nextCrashTime = 0;
let crashIntervalMs = 6600; // 6.6 Sekunden
let isCrashing = false;
let crashEndTime = 0;

// Rapid-beat / Binary Matrix variables
let beatTimestamps = [];
let rapidBeatWindowMs = 1000; // Zeitraum in ms um schnelle Beats zu zählen
let rapidBeatThreshold = 4; // Anzahl Beats innerhalb des Fensters um Matrix zu triggern (lowered for visibility)
let binaryActive = false;
let binaryEndTime = 0;
let binaryDurationMs = 2000; // wie lange Matrix sichtbar bleibt nach Trigger
let binaryColumns = []; // speichert y-positions und speed pro Spalte
let binaryOpacity = 0.0;

// Cursor (auto-clicker) Variablen
let cursorX = 0;
let cursorY = 0;
let cursorSpeed = 40.0; // pixels per frame (approx) - increased for faster animation
let cursorTarget = null; // {x, y}
let lastClickTime = 0;
let clickCooldownMs = 1200;
let clickAttemptTimer = 0; // frames for glitch animation on click
let clickAttemptDuration = 0; // stores initial duration for progress calculations
let showCrossTimer = 0; // frames to show crossed-out symbol
let clickBurstRemaining = 0; // how many clicks left in current burst
let clickBurstIntervalMs = 120; // interval between clicks in burst
let nextBurstClickTime = 0;

// Clippy Variablen
let clippySvg;
let showClippy = false;
let clippyAlpha = 0; // Transparenz für Fade-In/Out
let clippySlideX = 0; // Slide-In Offset
let clippyAppearTime = 0; // Zeitpunkt des Erscheinens
let clippyDuration = 8000; // Wie lange Clippy sichtbar bleibt (8 Sekunden)
let clippyBounce = 0; // Beat-Animation Bounce
let clippyRotation = 0; // Beat-Animation Rotation
let clippyMessageIndex = 0; // Welche Sprechblase angezeigt wird (0 = erste, 1 = zweite)

function preload() {
  sound = loadSound("./assets/99luftballons.mp3");
  clippySvg = loadImage("./assets/microsoft-clippy.svg");
}

function setup() {
  createCanvas(1920, 450);
  frameRate(30);

  amplitude = new p5.Amplitude();
  amplitude.smooth(0.9);

  low_fft = new p5.FFT(0.9, band_cnt);
  mid_fft = new p5.FFT(0.75, band_cnt);
  high_fft = new p5.FFT(0.5, band_cnt);
  low_fft.setInput(sound);
  mid_fft.setInput(sound);
  high_fft.setInput(sound);

  // Desktop Icons erstellen (3 Stück) - größer
  desktopIcons = [
    { x: 30, y: 30, label: "My Computer", icon: "💻", size: 60 },
    { x: 30, y: 150, label: "Recycle Bin", icon: "🗑️", size: 60 },
    { x: 30, y: 270, label: "Documents", icon: "📁", size: 60 }
  ];

  // Taskbar Icons (8 Programme) - größere Taskbar
  let taskbarIconLabels = ["🪟", "🌐", "📧", "📁", "🎵", "🎮", "⚙️", "💬"];
  for (let i = 0; i < 8; i++) {
    taskbarIcons.push({
      x: 15 + i * 70,
      y: height - 50,
      icon: taskbarIconLabels[i]
    });
  }
}

function mousePressed() {
  if (!isStarted) {
    sound.loop();
    isStarted = true;
    // Clippy erscheinen lassen
    showClippy = true;
    clippyAppearTime = millis();
    clippyAlpha = 0;
    clippySlideX = 300; // Startet außerhalb des Bildschirms
    // Schedule recurring crash screens every crashIntervalMs
    crashScheduled = true;
    nextCrashTime = millis() + crashIntervalMs;
  } else {
    sound.pause();
    isStarted = false;
    // Cancel scheduled crash when paused
    crashScheduled = false;
  }
}

function draw() {
  // Desktop Hintergrund (Dunkel)
  drawDesktop();

  // Beat Detection
  isBeatDetected = beatDetection();
  ampAverage = amplitude.getLevel();
  fftEnergy = getFFTEnergy();

  // Update beat timestamps for rapid-beat detection (binary matrix)
  updateBeatTimestamps();

  // Wenn viele Beats kürzlich: aktiviere Binary Matrix
  if (!binaryActive && beatTimestamps.length >= rapidBeatThreshold) {
    binaryActive = true;
    binaryEndTime = millis() + binaryDurationMs;
    initBinaryColumns();
  }

  // Zeichne Binary Matrix VOR anderen Elementen damit sie im Hintergrund liegt
  if (binaryActive) {
    drawBinaryMatrix();
    if (millis() >= binaryEndTime) {
      binaryActive = false;
    }
  }

  // Spektrum-Visualisierung im Hintergrund
  drawSpectrumVisualization();

  // Desktop Icons zeichnen
  drawDesktopIcons();

  // Taskbar zeichnen
  drawTaskbar();

  // Error Windows verwalten und zeichnen
  updateErrorWindows();
  drawErrorWindows();

  // Glitch-Effekt
  updateGlitch();

  // Bei Beat: neue Fehlermeldung hinzufügen
  if (isBeatDetected) {
    if (!lastKickCounted) {
      kickCounter++;
      lastKickCounted = true;

      // Jeder Beat erzeugt genau 1 neue Fehlermeldung
      addErrorWindow();

      // Alle 5 Kicks: vorderste Fehlermeldung entfernen (erste im Array)
      if (kickCounter % 5 === 0) {
        if (errorWindows.length > 0) {
          errorWindows.shift(); // Entferne die hinterste (erstes Element)
        }
      }

      // Glitch-Effekt auslösen
      triggerGlitch();
    }
  } else {
    lastKickCounted = false;
  }

  // Glitch-Overlay (wenn aktiv)
  if (isGlitching) {
    drawGlitchOverlay();
  }


  // Crash scheduling: wiederkehrend alle crashIntervalMs
  if (isStarted && crashScheduled && millis() >= nextCrashTime) {
    isCrashing = true;
    // Crashdauer: 1 Sekunde
    let durMs = 500;
    crashEndTime = millis() + durMs;
    // plane nächsten Crash
    nextCrashTime = millis() + crashIntervalMs;
    // Stärker glitchen während Crash
    isGlitching = true;
    glitchDuration = int(durMs / (1000 / 30)); // in Frames (~30fps)
    glitchOffsetX = random(-30, 30);
    glitchOffsetY = random(-20, 20);
  }

  // Falls wir im Crash sind, zeichne Crash-Screen und skippe weiteren Desktop-Zeichnungen
  if (isCrashing) {
    drawCrashScreen();
    // beende Crash wenn Zeit abgelaufen
    if (millis() >= crashEndTime) {
      isCrashing = false;
      isGlitching = false;
      glitchOffsetX = 0;
      glitchOffsetY = 0;
      // Nach Crash: alle Fehlermeldungen entfernen und von vorne starten
      errorWindows = [];
      kickCounter = 0;
      lastKickCounted = false;
      // Reset Beat timestamps
      beatTimestamps = [];
      // Clippy nach jedem Crash neu erscheinen lassen
      showClippy = true;
      clippyAppearTime = millis();
      clippyAlpha = 0;
      clippySlideX = 300;
      // Wechsle zwischen den Sprechblasen (0 -> 1 -> 0 -> 1 ...)
      clippyMessageIndex = (clippyMessageIndex + 1) % 2;
      // Optional: starte Binary Mode nicht automatisch
    }
    return; // Skip rest of draw for this frame
  }

  // Update und zeichne Cursor zuletzt, damit er über allem liegt
  updateCursor();
  drawCursor();

  // Clippy Update und Zeichnen (ganz am Ende, damit er über allem liegt)
  updateClippy();
  if (showClippy && clippyAlpha > 0) {
    drawClippy();
  }
}

/************************************/
/* Clippy Update                    */
/************************************/
function updateClippy() {
  if (!showClippy) return;
  
  let timeSinceAppear = millis() - clippyAppearTime;
  
  // Fade-In Animation (erste 800ms)
  if (timeSinceAppear < 800) {
    clippyAlpha = map(timeSinceAppear, 0, 800, 0, 255);
    clippySlideX = map(timeSinceAppear, 0, 800, 300, 0);
  } 
  // Sichtbar bleiben
  else if (timeSinceAppear < clippyDuration - 800) {
    clippyAlpha = 255;
    clippySlideX = 0;
  } 
  // Fade-Out Animation (letzte 800ms)
  else if (timeSinceAppear < clippyDuration) {
    let fadeOutTime = timeSinceAppear - (clippyDuration - 800);
    clippyAlpha = map(fadeOutTime, 0, 800, 255, 0);
    clippySlideX = map(fadeOutTime, 0, 800, 0, 300);
  } 
  // Vollständig verschwunden
  else {
    showClippy = false;
    clippyAlpha = 0;
  }
  
  // Beat-Animation: Bounce und Rotation
  if (isBeatDetected) {
    clippyBounce = 20; // Sprung-Höhe
    clippyRotation = random(-15, 15); // Zufällige Rotation
  }
  
  // Bounce sanft zurückgehen
  if (clippyBounce > 0) {
    clippyBounce *= 0.85; // Dämpfung
    if (clippyBounce < 0.5) clippyBounce = 0;
  }
  
  // Rotation sanft zurückgehen
  if (abs(clippyRotation) > 0) {
    clippyRotation *= 0.85; // Dämpfung
    if (abs(clippyRotation) < 0.5) clippyRotation = 0;
  }
}

/************************************/
/* Clippy Zeichnen                  */
/************************************/
function drawClippy() {
  push();
  
  // Transparenz anwenden
  tint(255, clippyAlpha);
  
  // Position: rechter Bildschirmrand mit Abstand, vertikal mittig
  let baseClippyX = width - 250 + clippySlideX; // 250px vom rechten Rand + Slide Animation
  let baseClippyY = height / 2 - 100; // vertikal mittig, etwas nach oben versetzt
  
  // Beat-Animation: Bounce und Rotation hinzufügen
  let clippyX = baseClippyX;
  let clippyY = baseClippyY - clippyBounce; // Bounce nach oben
  
  // Zeichne nur die Sprechblase, die gerade dran ist
  if (clippyMessageIndex === 0) {
    // Erste Sprechblase: "It looks like you're trying to escape your dream…"
    let bubbleW = 280;
    let bubbleH = 80;
    let bubbleX = clippyX - bubbleW - 20; // links von Clippy
    let bubbleY = clippyY - 20;
    
    // Sprechblase Schatten
    fill(0, 0, 0, 50 * (clippyAlpha / 255));
    noStroke();
    rect(bubbleX + 4, bubbleY + 4, bubbleW, bubbleH, 10);
    
    // Sprechblase Hintergrund
    fill(255, 255, 220, clippyAlpha);
    stroke(0, clippyAlpha);
    strokeWeight(2);
    rect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
    
    // Sprechblase Pfeil (Dreieck zum Clippy)
    fill(255, 255, 220, clippyAlpha);
    stroke(0, clippyAlpha);
    strokeWeight(2);
    triangle(
      bubbleX + bubbleW, bubbleY + bubbleH / 2 - 10,
      bubbleX + bubbleW, bubbleY + bubbleH / 2 + 10,
      bubbleX + bubbleW + 15, bubbleY + bubbleH / 2
    );
    
    // Sprechblase Text
    fill(0, clippyAlpha);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(18);
    text("It looks like you're trying\n to escape your dream…", 
         bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
  } else {
    // Zweite Sprechblase: "You better don't wake up"
    let bubbleW = 240;
    let bubbleH = 60;
    let bubbleX = clippyX - bubbleW - 20; // links von Clippy
    let bubbleY = clippyY + 20; // auf gleicher Höhe wie Clippy
    
    // Sprechblase Schatten
    fill(0, 0, 0, 50 * (clippyAlpha / 255));
    noStroke();
    rect(bubbleX + 4, bubbleY + 4, bubbleW, bubbleH, 10);
    
    // Sprechblase Hintergrund
    fill(255, 255, 220, clippyAlpha);
    stroke(0, clippyAlpha);
    strokeWeight(2);
    rect(bubbleX, bubbleY, bubbleW, bubbleH, 10);
    
    // Sprechblase Pfeil (Dreieck zum Clippy)
    fill(255, 255, 220, clippyAlpha);
    stroke(0, clippyAlpha);
    strokeWeight(2);
    triangle(
      bubbleX + bubbleW, bubbleY + bubbleH / 2 - 10,
      bubbleX + bubbleW, bubbleY + bubbleH / 2 + 10,
      bubbleX + bubbleW + 15, bubbleY + bubbleH / 2
    );
    
    // Sprechblase Text
    fill(0, clippyAlpha);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text("You better don't wake up", 
         bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
  }
  
  // Clippy SVG zeichnen mit Rotation
  push();
  translate(clippyX, clippyY + 50);
  rotate(radians(clippyRotation)); // Beat-Rotation
  imageMode(CENTER);
  image(clippySvg, 0, 0, 150, 150); // 150x150 Größe
  pop();
  
  pop();
}

/************************************/
/* Desktop Zeichnen                 */
/************************************/
function drawDesktop() {
  // Dunkler Gradient-Hintergrund
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color(20, 30, 50), color(10, 15, 30), inter);
    stroke(c);
    line(0, y, width, y);
  }
}

function drawDesktopIcons() {
  textAlign(CENTER, CENTER);

  for (let icon of desktopIcons) {
    let iconSize = icon.size || 40;
    
    // Icon Emoji (ohne Hintergrund, größer)
    noStroke();
    textSize(iconSize);
    text(icon.icon, icon.x + iconSize / 2, icon.y + iconSize / 2);

    // Label
    textSize(14);
    fill(220);
    noStroke();
    text(icon.label, icon.x + iconSize / 2, icon.y + iconSize + 20);
  }
}

function drawTaskbar() {
  // Taskbar Hintergrund (größer)
  fill(30, 30, 30);
  noStroke();
  rect(0, height - 60, width, 60);

  // Windows Start Button
  fill(50, 100, 180);
  rect(0, height - 60, 60, 60);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text("⊞", 30, height - 30);

  // Taskbar Icons
  for (let icon of taskbarIcons) {
    // Icon-Hintergrund
    fill(50, 50, 50);
    rect(icon.x, icon.y, 60, 45, 3);

    // Icon
    textSize(26);
    fill(255);
    text(icon.icon, icon.x + 30, icon.y + 22);
  }

  // System Tray (Uhr) - echte Systemzeit
  fill(255);
  textAlign(RIGHT, CENTER);
  textSize(14);
  let h = hour();
  let m = minute();
  let timeStr = nf(h, 2) + ":" + nf(m, 2);
  text(timeStr, width - 15, height - 30);
}

/************************************/
/* Error Windows Management         */
/************************************/
function addErrorWindow() {
  // Zufällige Position (aber innerhalb sichtbarem Bereich)
  let x = random(100, width - 500);
  let y = random(50, height - 250);

  // Neue Fenster immer vorne -> push (wird zuletzt/oben gezeichnet)
  errorWindows.push({
    x: x,
    y: y,
    width: 450,
    height: 200,
    wobbleX: 0,
    wobbleY: 0,
    alpha: 255, // Sofort sichtbar (kein Fade-in)
    glitchOffset: 0,
    // Timer für Wake-Up Button Glitch (kurzer, initialer Glitch)
    wakeGlitchTimer: int(random(12, 28))
  });
}

// Helper: get frontmost window (vorderste) - last element in array
function getFrontmostWindow() {
  if (errorWindows.length === 0) return null;
  return errorWindows[errorWindows.length - 1];
}

// Compute global center coordinates of the Wake up button for the frontmost window
function getWakeButtonCenter(win) {
  if (!win) return null;
  // Based on drawSingleErrorWindow: Wake up button at (170,140) size 130x40
  let localX = 170 + 130 / 2;
  let localY = 140 + 40 / 2;
  // Translate used: translate(win.x + win.wobbleX + win.glitchOffset, win.y + win.wobbleY)
  let globalX = win.x + win.wobbleX + (win.glitchOffset || 0) + localX;
  let globalY = win.y + win.wobbleY + localY;
  return { x: globalX, y: globalY };
}

function updateCursor() {
  // initialize cursor in center if first frame
  if (cursorX === 0 && cursorY === 0) {
    cursorX = width / 2;
    cursorY = height / 2;
  }

  // Determine target (frontmost Wake up button)
  let front = getFrontmostWindow();
  if (front) {
    let target = getWakeButtonCenter(front);
    cursorTarget = target;
  } else {
    cursorTarget = { x: width - 40, y: height - 40 };
  }

  // Move cursor towards target with simple easing
  if (cursorTarget) {
    let dx = cursorTarget.x - cursorX;
    let dy = cursorTarget.y - cursorY;
    let dist = sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      let step = min(dist, cursorSpeed);
      cursorX += (dx / dist) * step + random(-0.5, 0.5) * (clickAttemptTimer > 0 ? 2 : 0.4);
      cursorY += (dy / dist) * step + random(-0.5, 0.5) * (clickAttemptTimer > 0 ? 2 : 0.4);
    }

    // If close enough and cooldown passed -> start a burst of clicks (2-6)
    let now = millis();
    if (dist < 14 && clickBurstRemaining === 0 && now - lastClickTime > clickCooldownMs) {
      // start a burst: random 2..6 clicks
      clickBurstRemaining = int(random(2, 7));
      nextBurstClickTime = now; // start immediately
      // set lastClickTime to prevent new bursts starting immediately
      lastClickTime = now;
    }

    // If we have an active burst, perform clicks at intervals
    if (clickBurstRemaining > 0 && now >= nextBurstClickTime) {
      // perform one click visual
      clickAttemptTimer = 10; // frames (shorter, faster animation)
      clickAttemptDuration = clickAttemptTimer;
      showCrossTimer = 28; // frames to show crossed-out symbol
      // clicking does NOT close the window; just a glitch effect
      triggerGlitch();
      // schedule next click in the burst
      nextBurstClickTime = now + clickBurstIntervalMs;
      clickBurstRemaining--;
      // update lastClickTime so overall cooldown enforces between bursts
      lastClickTime = now;
    }
  }

  // Update timers
  if (clickAttemptTimer > 0) clickAttemptTimer--;
  if (showCrossTimer > 0) showCrossTimer--;
}

function drawCursor() {
  push();
  noStroke();

  // Draw cursor as larger white arrow-like triangle with slight shadow
  translate(cursorX, cursorY);
  // If clicking attempt -> glitchy color and stronger jitter
  // Glitchy multi-channel draw when clicking
  if (clickAttemptTimer > 0 && clickAttemptDuration > 0) {
    let prog = 1 - (clickAttemptTimer / clickAttemptDuration);
    // Draw RGB offset arrows behind
    let channels = [
      { c: [255, 50, 50, 150 * (1 - prog)], dx: -4, dy: -2 },
      { c: [50, 255, 120, 150 * (1 - prog)], dx: 3, dy: 2 },
      { c: [80, 120, 255, 140 * prog], dx: -2, dy: 3 }
    ];
    for (let ch of channels) {
      push();
      translate(ch.dx + random(-2, 2), ch.dy + random(-2, 2));
      fill(ch.c[0], ch.c[1], ch.c[2], ch.c[3]);
      beginShape();
      vertex(0, 0);
      vertex(-12, 36);
      vertex(-4, 24);
      vertex(12, 36);
      endShape(CLOSE);
      pop();
    }
    // jitter overall
    translate(random(-6, 6) * prog, random(-6, 6) * prog);
  }

  // base white arrow on top
  fill(255);
  beginShape();
  vertex(0, 0);
  vertex(-12, 36);
  vertex(-4, 24);
  vertex(12, 36);
  endShape(CLOSE);

  // Click ripple while clicking
  if (clickAttemptTimer > 0 && clickAttemptDuration > 0) {
    let prog = 1 - (clickAttemptTimer / clickAttemptDuration);
    let r = map(prog, 0, 1, 10, 48);
    noFill();
    stroke(255, 200, 60, 180 * (1 - prog));
    strokeWeight(2 + 2 * (1 - prog));
    ellipse(0, 12, r * 2, r * 2);
  }

  // If showCrossTimer active, draw larger crossed-out symbol near cursor
  if (showCrossTimer > 0) {
    push();
    // Draw circle with slash (larger)
    noFill();
    stroke(255, 80, 80, map(showCrossTimer, 0, 28, 0, 255));
    strokeWeight(4);
    ellipse(22, 0, 44, 44);
    // slash
    line(10, -10, 34, 10);
    pop();
  }

  pop();
}

function updateErrorWindows() {
  for (let win of errorWindows) {
    // Kein Fade-in mehr - alpha bleibt bei 255

    // Leichtes Wackeln basierend auf Musik
    win.wobbleX = sin(frameCount * 0.1) * ampAverage * 10;
    win.wobbleY = cos(frameCount * 0.15) * ampAverage * 10;

    // Glitch-Offset
    if (isGlitching) {
      win.glitchOffset = random(-5, 5);
    } else {
      win.glitchOffset = 0;
    }

    // Update Wake-Up Glitch Timer
    if (win.wakeGlitchTimer > 0) {
      win.wakeGlitchTimer -= 1;
    }
  }
}

function drawErrorWindows() {
  for (let i = 0; i < errorWindows.length; i++) {
    let win = errorWindows[i];
    drawSingleErrorWindow(win, i);
  }
}

function drawSingleErrorWindow(win, index) {
  push();
  translate(win.x + win.wobbleX + win.glitchOffset, win.y + win.wobbleY);

  // Schatten
  fill(0, 0, 0, 100 * (win.alpha / 255));
  noStroke();
  rect(5, 5, win.width, win.height, 5);

  // Fenster-Hintergrund (DARKMODE)
  fill(40, 44, 52, win.alpha);
  stroke(60, 60, 70, win.alpha);
  strokeWeight(1);
  rect(0, 0, win.width, win.height, 5);

  // Titlebar
  let gradientSteps = 30;
  for (let i = 0; i < gradientSteps; i++) {
    let inter = i / gradientSteps;
    let c = lerpColor(color(0, 84, 166, win.alpha), color(0, 60, 120, win.alpha), inter);
    fill(c);
    noStroke();
    rect(0, i, win.width, 1);
  }

  // Titlebar Border
  stroke(100, 100, 100, win.alpha);
  strokeWeight(1);
  noFill();
  rect(0, 0, win.width, 30, 5, 5, 0, 0);

  // Titlebar Text
  fill(255, 255, 255, win.alpha);
  noStroke();
  textAlign(LEFT, CENTER);
  textSize(14);
  text("Windows - Error", 10, 15);

  // Close Button (dunkler Style)
  fill(120, 24, 24, win.alpha);
  rect(win.width - 32, 6, 26, 22, 3);
  fill(255, 255, 255, win.alpha);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("×", win.width - 19, 17);

  // Error Icon
  fill(230, 180, 40, win.alpha);
  textSize(48);
  text("⚠", 30, 78);

  // Error Message (größer, hell auf dunklem Hintergrund)
  fill(240, 240, 240, win.alpha);
  textAlign(LEFT, TOP);
  textSize(20);
  let msg = "Loading Dream.exe has been failed.\nNightmare protocol initiated.";
  // leicht höher platzieren damit größere Schrift passt
  text(msg, 90, 44);

  // Buttons (größer)
  drawButton(win, 170, 140, 130, 40, "Wake up", win.alpha);
  drawButton(win, 320, 140, 90, 40, "Close", win.alpha);

  // Window Number (kleines Label)
  fill(150, 150, 150, win.alpha);
  textSize(9);
  textAlign(RIGHT, BOTTOM);
  text(`#${index + 1}`, win.width - 5, win.height - 5);

  pop();
}

function drawButton(win, x, y, w, h, label, alpha) {
  // Button Background
  fill(70, 75, 85, alpha);
  stroke(100, 100, 100, alpha * 0.6);
  strokeWeight(1);
  rect(x, y, w, h, 3);

  // Button Highlight
  stroke(255, 255, 255, alpha * 0.08);
  line(x + 2, y + 2, x + w - 2, y + 2);
  line(x + 2, y + 2, x + 2, y + h - 2);

  // Button Shadow
  stroke(160, 160, 160, alpha);
  line(x + w - 2, y + 2, x + w - 2, y + h - 2);
  line(x + 2, y + h - 2, x + w - 2, y + h - 2);

  // Button Text (hell)
  fill(240, 240, 240, alpha);
  noStroke();
  textAlign(CENTER, CENTER);
  // Falls es der Wake-Up Button ist, mache ein subtilen Glitch-Effekt
  let isWake = label.toLowerCase().includes("wake");
  if (isWake && winHasActiveWakeGlitch(winFromContext())) {
    // kleiner Skaling-Effekt + Farb-Flackern
    push();
    translate(random(-1, 1), random(-1, 1));
    textSize(max(14, h * 0.45));
    fill(250, 240, 200, alpha);
    text(label, x + w / 2 + random(-2, 2), y + h / 2 + random(-1, 1));
    pop();
  } else {
    textSize(max(12, h * 0.4));
    text(label, x + w / 2, y + h / 2);
  }
}

// Helper: prüfen ob für dieses Fenster der Wake Glitch noch aktiv ist
function winHasActiveWakeGlitch(win) {
  if (!win) return false;
  return win.wakeGlitchTimer > 0;
}

// Context-finder: find the window object matching the last drawn window position
// (a small heuristic since drawButton doesn't receive the window object)
function winFromContext() {
  // returns the last error window (frontmost) as heuristic
  if (errorWindows.length === 0) return null;
  return errorWindows[0];
}

/************************************/
/* Spektrum-Visualisierung          */
/************************************/
function drawSpectrumVisualization() {
  let spectrum = low_fft.analyze();

  // Spektrum-Historie speichern
  spectrumHistory.push(spectrum.slice());
  if (spectrumHistory.length > 60) {
    spectrumHistory.shift();
  }

  push();
  noFill();

  // Zeichne mehrere Spektrum-Linien übereinander (3D-Effekt)
  // Bis zum Canvas-Rand (0 bis width)
  for (let h = 0; h < spectrumHistory.length; h++) {
    let spec = spectrumHistory[h];
    let alpha = map(h, 0, spectrumHistory.length, 50, 200);

    // Farbe basierend auf Frequenzen
    let r = map(sub_freq, 0, 255, 50, 255);
    let g = map(mid_freq, 0, 255, 50, 200);
    let b = map(treble_freq, 0, 255, 100, 255);

    stroke(r, g, b, alpha);
    strokeWeight(2);

    beginShape();
    for (let i = 0; i < spec.length; i += 4) {
      // Wellenform bis zum Canvas-Rand (0 bis width)
      let x = map(i, 0, spec.length, 0, width);
      let y = map(spec[i], 0, 255, height - 80, height - 220);
      let yOffset = h * 2; // Verschiebe ältere Linien nach oben
      vertex(x, y - yOffset);
    }
    endShape();
  }

  pop();
}

/************************************/
/* Glitch-Effekt                    */
/************************************/
function triggerGlitch() {
  isGlitching = true;
  glitchDuration = 10; // Frames
  glitchOffsetX = random(-15, 15);
  glitchOffsetY = random(-10, 10);
}

// Beat timestamp tracking for rapid-beat detection
function updateBeatTimestamps() {
  // Remove old timestamps
  let now = millis();
  beatTimestamps = beatTimestamps.filter(t => now - t <= rapidBeatWindowMs);
  // If a beat was detected in this frame, add timestamp
  if (isBeatDetected) {
    beatTimestamps.push(now);
  }
}

// Initialize binary columns for Matrix effect
function initBinaryColumns() {
  binaryColumns = [];
  let cols = int(width / 14);
  for (let i = 0; i < cols; i++) {
    binaryColumns.push({ y: random(-height, 0), speed: random(1, 6) });
  }
}

function drawBinaryMatrix() {
  push();
  // semi-transparent overlay so desktop still visible faintly
  fill(0, 0, 0, 100);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textSize(18);
  for (let i = 0; i < binaryColumns.length; i++) {
    let colX = i * 14 + 7;
    let col = binaryColumns[i];
    for (let j = 0; j < 20; j++) {
      let charY = col.y + j * 16;
      let val = random() > 0.5 ? '1' : '0';
      let alpha = map(j, 0, 20, 255, 40);
      // Add slight brightness variation based on bass
      let brightness = map(sub_freq, 0, 255, 150, 255);
      fill(0, brightness, 120, alpha * 0.9);
      text(val, colX, charY % height);
    }
    // update y
    col.y += col.speed + map(sub_freq, 0, 255, 0, 4);
    if (col.y > height) col.y = random(-200, -20);
  }
  pop();
}

function updateGlitch() {
  if (isGlitching) {
    glitchDuration--;
    if (glitchDuration <= 0) {
      isGlitching = false;
      glitchOffsetX = 0;
      glitchOffsetY = 0;
    }
  }
}

function drawGlitchOverlay() {
  push();

  // RGB-Kanal-Verschiebung simulieren
  loadPixels();
  let d = pixelDensity();
  let offset = int(random(5, 15));

  // Nur zufällige Bereiche glitchen
  for (let i = 0; i < 5; i++) {
    let startY = int(random(height));
    let endY = startY + int(random(10, 50));

    for (let y = startY; y < endY && y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sourceIndex = 4 * ((y * d) * (width * d) + (x * d));

        // Verschiebe nur den roten Kanal
        if (x + offset < width) {
          let targetIndex = 4 * ((y * d) * (width * d) + ((x + offset) * d));
          pixels[targetIndex] = pixels[sourceIndex]; // R
        }
      }
    }
  }
  updatePixels();

  // Zufällige horizontale Linien
  stroke(random(255), random(255), random(255), 150);
  strokeWeight(2);
  for (let i = 0; i < 3; i++) {
    let y = random(height);
    line(0, y, width, y);
  }

  pop();
}

/**
 * Zeichnet einen kurzen Absturz-Screen (full-screen) mit Glitch-Effekten
 */
function drawCrashScreen() {
  push();

  // Füllung: dunkles Bild mit großen Fehlermeldungen
  background(10, 10, 20);

  // Großer Fehler-Text
  fill(255, 100, 100);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Dreams.exe failed loading", width / 2, height / 2 - 30);

  fill(255);
  textSize(40);
  text("Please wait while Nightmare protocol initializes...", width / 2, height / 2 + 20);

  // Starke Glitch-Linien
  for (let i = 0; i < 10; i++) {
    stroke(random(200, 255), random(50, 200), random(50, 200), 200);
    strokeWeight(random(1, 6));
    let y = random(height);
    line(0, y + random(-6, 6), width, y + random(-6, 6));
  }

  // RGB Shift Blocks
  loadPixels();
  let d = pixelDensity();
  let offset = int(random(10, 40));
  for (let y = 0; y < height; y += int(random(6, 40))) {
    for (let x = 0; x < width; x++) {
      let sx = x + offset;
      if (sx < width) {
        let si = 4 * ((y * d) * (width * d) + (x * d));
        let ti = 4 * ((y * d) * (width * d) + (sx * d));
        if (si >= 0 && ti >= 0 && si < pixels.length && ti < pixels.length) {
          pixels[ti] = pixels[si];
        }
      }
    }
  }
  updatePixels();

  pop();
}

/************************************/
/* Beat Detection                   */
/************************************/
function beatDetection() {
  let level = amplitude.getLevel();

  if (level > beatCutoff && level > beatThreshold) {
    beatCutoff = level * 1.2;
    framesSinceLastBeat = 0;
    return true;
  } else {
    if (framesSinceLastBeat <= beatHoldFrames) {
      framesSinceLastBeat++;
    } else {
      beatCutoff *= beatDecayRate;
      beatCutoff = Math.max(beatCutoff, beatThreshold);
    }
    return false;
  }
}

/************************************/
/* FFT Energy                       */
/************************************/
function getFFTEnergy() {
  low_fft.analyze();
  mid_fft.analyze();
  high_fft.analyze();

  sub_freq = low_fft.getEnergy("bass");
  low_freq = low_fft.getEnergy("lowMid");
  mid_freq = mid_fft.getEnergy("mid");
  hi_freq = high_fft.getEnergy("highMid");
  treble_freq = high_fft.getEnergy("treble");

  return {
    sub: sub_freq,
    low: low_freq,
    mid: mid_freq,
    high: hi_freq,
    treble: treble_freq
  };
}
