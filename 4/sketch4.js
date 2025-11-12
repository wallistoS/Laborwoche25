let isStarted = false;
let sound;
let dinoLeftImg;
let dinoRightImg;
let cactusImg;
let cloudImg;
let retroFont;

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

/************************************/
/* Variablen für Dino-Game          */
/************************************/
let dinoX = 960; // Mitte des Canvas (1920 / 2)
let dinoY;
let groundY;
let dinoSize = 80;
let isJumping = false;
let jumpVelocity = 0;
let gravity = 0.6; // Smoother: 0.6 statt 0.8
let jumpHeight = -9; // Smoother: -9 statt -10
let currentDinoFrame = 0; // 0 = left, 1 = right
let frameCounter = 0;

// Hindernisse (Kakteen)
let obstacles = [];
let obstacleSpeed = 5;
let lastObstacleTime = 0;
let obstacleInterval = 800; // Reduziert von 2000 auf 1200ms für mehr Hindernisse

// Wolken
let clouds = [];

// Partikel für Beat-Effekte
let particles = [];

// Boden-Effekte
let groundPoints = [];
let groundGrains = [];

// Musik-reaktive Variablen
let groundThickness = 2;
let grainIntensity = 0;
let flashIntensity = 0;
let blackFlashIntensity = 0; // Schwarzes Flackern bei Kicks
let groundPulse = 0; // Pulsieren bei Kicks
let groundVibration = 0; // Vibration bei Bass

// Highscore
let highScore = 12; // Fester Highscore
let currentScore = 0; // Aktuelle übersprungene Hindernisse

// Geschwindigkeits-Multiplikator
let speedMultiplier = 1.0; // Erhöht sich mit jedem Hindernis

// Kick-Counter und Dino-Farbe
let kickCounter = 0;
let dinoTintColor = [255, 255, 255]; // Standard: Weiß [R, G, B]

// Dino Hue-Shift (für sanften Farb-Tween bei Kick)
let dinoHue = 0; // 0-360
let dinoHueTarget = 0;
let dinoHueSaturation = 90;
let dinoHueBrightness = 100;

// Kontrast/ADD-Flash bei Kick
let kickContrast = 0;

// Bass-Drop Detection (für tiefe Frequenzen)
let bassHistory = [];
let lastBass = 0;
let bassDropDetected = false;
let bassDropThreshold = 35; // Schwellwert für Bass-Anstieg

// Party-Modus (ab 3. Hindernis)
let partyMode = false;
let bgColor = [0, 0, 0]; // Hintergrundfarbe
let groundColor = [255, 255, 255]; // Bodenfarbe
let cloudColor = [255, 255, 255]; // Wolkenfarbe
let cactusColor = [255, 255, 255]; // Kaktusfarbe
let grainColor = [255, 255, 255]; // Sandkornfarbe
let highscoreColor = [255, 255, 255]; // Highscore-Farbe
let highscoreHue = 0; // Für Rainbow-Effekt

// Wind-Linien für Geschwindigkeits-Visualisierung
let windLines = [];

// Regenbogen-Schatten für Dino (Nyancat-Style)
let rainbowTrail = [];

// Game Over
let gameOver = false;
let gameOverY = -100; // Startposition oben außerhalb
let gameOverTime = 0;
let gameOverColor = [255, 255, 255];

// FFT Energie Variablen
let sub_freq = 0;
let low_freq = 0;
let mid_freq = 0;
let hi_freq = 0;
let treble_freq = 0;

function preload() {
  sound = loadSound("./assets/Gonzi_Basskiller.mp3");
  dinoLeftImg = loadImage("./assets/Chrome_T-Rex_Left_Run.webp");
  dinoRightImg = loadImage("./assets/Chrome_T-Rex_Right_Run.webp");
  cactusImg = loadImage("./assets/1_Cactus_Chrome_Dino.webp");
  cloudImg = loadImage("./assets/Chromium_T-Rex-cloud.png");
  retroFont = loadFont("./assets/PressStart2P-Regular.ttf");
}

function setup() {
  createCanvas(1920, 450);
  frameRate(30); // Verdreifacht von 30 auf 90

  groundY = height - 80;
  dinoY = groundY - dinoSize;

  amplitude = new p5.Amplitude();

  low_fft = new p5.FFT(0.9, band_cnt);
  mid_fft = new p5.FFT(0.75, band_cnt);
  high_fft = new p5.FFT(0.5, band_cnt);
  low_fft.setInput(sound);
  mid_fft.setInput(sound);
  high_fft.setInput(sound);

  // Erstelle initiale Wolken
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(width),
      y: random(50, 150),
      speed: random(0.5, 1.5)
    });
  }
  
  // Erstelle Boden mit leichten Unebenheiten
  createGround();
  
  // Erstelle Sandkörner
  createGroundGrains();
}

function mousePressed() {
  if (!isStarted) {
    sound.loop();
    isStarted = true;
  } else {
    sound.pause();
    isStarted = false;
  }
}

function draw() {
  // Hintergrund abhängig von Party-Modus
  if (partyMode) {
    background(bgColor[0], bgColor[1], bgColor[2]);
  } else {
    background(0);
  }
  drawGrain();

  if (isStarted && !gameOver) {
    // Musik-Analyse
    isBeatDetected = beatDetection();
    let isBassDropDetected = bassDropDetection();
    ampAverage = amplitude.getLevel();
    fftEnergy = getFFTEnergy();
    
    // Bass-Vibration (noch empfindlicher)
    if (low_freq > 80) { // Noch sensibler: 80 statt 100
      groundVibration = map(low_freq, 80, 255, 0, 8); // Noch stärker: 0-8 statt 0-6
    } else {
      groundVibration = lerp(groundVibration, 0, 0.3);
    }

    // Beat-reaktive Effekte (Beat = Kick ODER Bass-Drop, beide lösen die gleichen Effekte aus)
    if (isBeatDetected || isBassDropDetected) {
      // Schwarzes Flackern bei Beat/Kick (nur wenn nicht im Party-Modus)
      if (!partyMode) {
        blackFlashIntensity = 255;
      }
      
      // Ground-Dicke erhöhen und pulsieren lassen
      groundThickness = 6;
      groundPulse = 1.5;
      
      // Partikel erstellen
      createBeatParticles();
      
      // Kick-Counter erhöhen und Farbe ändern bei JEDEM Beat/Kick
      kickCounter++;
      // Trigger hue-shift tween and additive contrast flash
      triggerDinoHueShift();
      kickContrast = 255;
      
      // Im Party-Modus: Ändere alle Farben bei jedem Beat
      if (partyMode) {
        changeAllColors();
      }
    }
    
    // Automatisches Springen vor Hindernissen
    checkObstacleCollision();

    // Musik-reaktive Variablen aktualisieren
    updateMusicReactiveValues();
    
    // Update Highscore Rainbow-Effekt im Party-Modus
    if (partyMode) {
      updateHighscoreRainbow();
      updateRainbowTrail();
    }
    
    // Hindernisse spawnen
    spawnObstacles();
    
    // Spawne Wind-Linien
    spawnWindLines();
    
    // Update
    updateDino();
    updateDinoAnimation();
    updateObstacles();
    updateClouds();
    updateParticles();
    updateWindLines();
  }

  // Zeichne Szene
  drawRainbowTrail(); // Zuerst der Schatten (hinter dem Dino)
  drawClouds();
  drawWindLines();
  drawGround();
  drawDino();
  drawObstacles();
  drawParticles();
  // Additive contrast boost on kicks (over everything else but under black flash)
  drawKickContrast();
  
  // UI-Elemente
  drawHighScore();
  
  // Schwarzes Flackern bei Kick (über allem)
  drawBlackFlash();
  
  // Vignette
  drawVignette();
  
  // Game Over Animation
  if (gameOver) {
    drawGameOver();
  }
  
  // Start-Anweisung
  if (!isStarted) {
    drawStartText();
  }
}

/************************************/
/* Dino-Funktionen                  */
/************************************/
function updateDino() {
  if (isJumping) {
    jumpVelocity += gravity * 3; // Angepasst an 90fps
    dinoY += jumpVelocity;

    // Landung
    if (dinoY >= groundY - dinoSize) {
      dinoY = groundY - dinoSize;
      jumpVelocity = 0;
      isJumping = false;
    }
  }
}

function updateDinoAnimation() {
  // Laufanimation: Wechsel zwischen links und rechts (angepasst an 90fps)
  // Geschwindigkeit erhöht sich mit speedMultiplier
  frameCounter++;
  let animSpeed = floor(30 / speedMultiplier); // Schneller bei höherem Multiplikator
  if (frameCounter % animSpeed === 0) {
    currentDinoFrame = 1 - currentDinoFrame; // Toggle zwischen 0 und 1
  }
}

function checkObstacleCollision() {
  // Prüfe ob ein Hindernis in der Nähe ist
  for (let obs of obstacles) {
    let distance = obs.x - dinoX;
    // Wenn Hindernis in Sprungreichweite und Dino am Boden
    // Früher springen für smoothere Animation
    if (distance > 80 && distance < 150 && !isJumping) {
      jump();
      break; // Nur einmal springen
    }
  }
}

function jump() {
  if (!isJumping) {
    isJumping = true;
    jumpVelocity = jumpHeight * 3; // Angepasst an 90fps
  }
}

function drawDino() {
  push();
  
  // Wähle das richtige Frame für die Laufanimation
  let currentFrame = currentDinoFrame === 0 ? dinoLeftImg : dinoRightImg;
  
  // Leichte Skalierung basierend auf Bass-Frequenz
  let bassScale = map(low_freq, 0, 255, 1, 1.1);
  let dinoW = dinoSize * bassScale;
  let dinoH = dinoSize * bassScale;
  
  // Wende Farbfilter an
  // Smooth hue interpolation for short tween on kick
  // Interpolate current hue towards target for a short/tight tween
  dinoHue = lerp(dinoHue, dinoHueTarget, 0.28);

  // Convert HSB color to RGB for tinting
  colorMode(HSB, 360, 100, 100);
  let c = color(dinoHue, dinoHueSaturation, dinoHueBrightness);
  colorMode(RGB, 255);
  tint(red(c), green(c), blue(c));
  
  imageMode(CENTER);
  image(currentFrame, dinoX, dinoY + dinoSize/2, dinoW, dinoH);
  
  pop();
}

function changeDinoColor() {
  // Zufällige lebendige Farben für den Dino
  let colors = [
    [255, 100, 100], // Rot
    [100, 255, 100], // Grün
    [100, 100, 255], // Blau
    [255, 255, 100], // Gelb
    [255, 100, 255], // Magenta
    [100, 255, 255], // Cyan
    [255, 150, 100], // Orange
    [255, 255, 255]  // Weiß (zurück zu normal)
  ];
  
  // Wähle eine zufällige Farbe
  dinoTintColor = random(colors);
}

// Trigger a short hue shift on the Dino when a kick/beat occurs
function triggerDinoHueShift() {
  // pick a noticeable hue shift (wrap-around allowed)
  dinoHueTarget = (dinoHue + random(60, 160)) % 360;
}

function changeAllColors() {
  // Ändere NUR RGB-Farben - weniger intensive Farben
  bgColor = [random(20, 80), random(20, 80), random(20, 80)]; // Weniger intensiv
  groundColor = [random(80, 180), random(80, 180), random(80, 180)]; // Weniger intensiv
  cloudColor = [random(80, 180), random(80, 180), random(80, 180)]; // Weniger intensiv
  cactusColor = [random(80, 180), random(80, 180), random(80, 180)]; // Weniger intensiv
  grainColor = [random(80, 180), random(80, 180), random(80, 180)]; // Weniger intensiv
  dinoTintColor = [random(100, 255), random(100, 255), random(100, 255)]; // Dino bleibt intensiv
}

function updateHighscoreRainbow() {
  // Rainbow-Effekt wie bei Mario Kart - VIEL schneller
  colorMode(HSB, 360, 100, 100);
  highscoreHue = (highscoreHue + 8) % 360; // Erhöht von 2 auf 8 = 4x schneller
  let c = color(highscoreHue, 80, 100);
  highscoreColor = [red(c), green(c), blue(c)];
  colorMode(RGB, 255);
}

/************************************/
/* Hindernisse                      */
/************************************/
function spawnObstacles() {
  if (millis() - lastObstacleTime > obstacleInterval) {
    obstacles.push({
      x: width,
      y: groundY,
      width: random(20, 40),
      height: random(40, 80),
      scored: false // Ob das Hindernis bereits gezählt wurde
    });
    lastObstacleTime = millis();
    obstacleInterval = random(800, 1800); // Reduziert von 1500-3000 auf 800-1800ms
  }
}

function updateObstacles() {
  // Geschwindigkeit basierend auf Mid-Frequenz (angepasst an 90fps)
  // Multipliziert mit speedMultiplier für progressive Erhöhung
  let currentSpeed = map(mid_freq, 0, 255, 3, 8) * 5 * speedMultiplier;
  
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].x -= currentSpeed;
    
    // Prüfe ob Hindernis erfolgreich übersprungen wurde
    if (!obstacles[i].scored && obstacles[i].x + obstacles[i].width < dinoX) {
      obstacles[i].scored = true;
      currentScore++;
      
      // Erhöhe Geschwindigkeit bei JEDEM Hindernis
      speedMultiplier += 0.01; // 1% Erhöhung pro Hindernis
      
      // Aktiviere Party-Modus nach dem 3. Hindernis
      if (currentScore === 3) {
        partyMode = true;
        console.log("🎉 PARTY-MODUS AKTIVIERT! 🎉");
      }
      
      // Game Over nach dem 12. Hindernis
      if (currentScore === 12) {
        triggerGameOver();
      }
      
      console.log("Speed erhöht! Neuer Multiplikator:", speedMultiplier.toFixed(2));
    }
    
    // Entferne Hindernisse außerhalb des Bildschirms
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

function drawObstacles() {
  push();
  imageMode(CENTER);
  
  // Wende Farbe an wenn im Party-Modus
  if (partyMode) {
    tint(cactusColor[0], cactusColor[1], cactusColor[2]);
  }
  
  for (let obs of obstacles) {
    // Zeichne Kaktus-Bild
    image(cactusImg, obs.x + obs.width/2, obs.y - obs.height/2, obs.width, obs.height);
  }
  
  pop();
}

/************************************/
/* Wolken                           */
/************************************/
function updateClouds() {
  for (let cloud of clouds) {
    cloud.x -= cloud.speed * 3 * speedMultiplier; // Verdreifacht für 90fps + speedMultiplier
    
    // Wenn Wolke links rausgeht, respawne rechts
    if (cloud.x < -50) {
      cloud.x = width + 50;
      cloud.y = random(50, 150);
    }
  }
}

function drawClouds() {
  push();
  
  // Wolken-Transparenz basierend auf High-Frequenz
  let cloudAlpha = map(hi_freq, 0, 255, 150, 255);
  
  // Wende Farbe an wenn im Party-Modus
  if (partyMode) {
    tint(cloudColor[0], cloudColor[1], cloudColor[2], cloudAlpha);
  } else {
    tint(255, cloudAlpha);
  }
  
  imageMode(CENTER);
  for (let cloud of clouds) {
    image(cloudImg, cloud.x, cloud.y, 92, 27); // Original Chrome-Wolken-Größe
  }
  
  pop();
}

/************************************/
/* Boden                            */
/************************************/
function createGround() {
  // Erstelle Punkte für eine Linie im Pixel-Stil mit gelegentlichen Unebenheiten
  groundPoints = [];
  let currentY = groundY;
  
  for (let x = 0; x <= width; x += 10) { // Größere Schritte für Pixel-Look
    // Nur gelegentlich (10% Chance) eine Unebenheit
    if (random() < 0.1) {
      currentY = groundY + floor(random(-2, 3)); // Pixel-präzise Werte (-2, -1, 0, 1, 2)
    } else {
      currentY = groundY; // Meistens gerade
    }
    groundPoints.push({x: x, y: currentY, baseY: currentY});
  }
}

function createGroundGrains() {
  // Erstelle weniger, aber größere Sandkörner unterhalb der Bodenlinie
  groundGrains = [];
  for (let i = 0; i < 25; i++) { // Reduziert von 50 auf 25
    groundGrains.push({
      x: random(width),
      y: groundY + random(15, 35), // Noch weiter unten: 15-35px (war 10-25px)
      size: random(3, 7), // Größer: 3-7 statt 2-5
      alpha: random(100, 200)
    });
  }
}

function drawGround() {
  push();
  
  // Zeichne die Bodenlinie im Pixel-Stil - Bass-Visualisierung
  let lineColor = partyMode ? groundColor : [255, 255, 255];
  
  // Bass beeinflusst die Dicke der Linie (noch empfindlicher)
  let bassThickness = map(low_freq, 0, 255, 2, 16); // Noch dicker: 2-16 statt 2-12
  strokeWeight(bassThickness);
  
  stroke(lineColor[0], lineColor[1], lineColor[2], 200 + groundPulse * 55);
  noFill();
  
  beginShape();
  for (let point of groundPoints) {
    // Bass-Vibration hinzufügen
    let vibrationOffset = random(-groundVibration, groundVibration);
    vertex(point.x, point.baseY + vibrationOffset);
  }
  endShape();
  
  // Zeichne Sandkörner unterhalb der Linie
  noStroke();
  for (let grain of groundGrains) {
    // Körner pulsieren leicht bei Kicks
    let grainAlpha = grain.alpha + groundPulse * 100;
    let currentGrainColor = partyMode ? grainColor : [255, 255, 255];
    fill(currentGrainColor[0], currentGrainColor[1], currentGrainColor[2], grainAlpha);
    let grainSize = grain.size + groundPulse * 0.5;
    circle(grain.x, grain.y, grainSize);
    
    // Bewege Körner langsam (angepasst an höhere Framerate + speedMultiplier)
    grain.x -= 0.5 * 3 * speedMultiplier; // Verdreifacht wegen 90fps + speedMultiplier
    if (grain.x < 0) {
      grain.x = width;
      grain.y = groundY + random(15, 35); // Noch weiter unten: 15-35px
    }
  }
  
  // Ground-Dicke und Puls langsam zurücksetzen
  groundThickness = lerp(groundThickness, 2, 0.1);
  groundPulse = lerp(groundPulse, 0, 0.15);
  
  pop();
}

/************************************/
/* Partikel-Effekte                 */
/************************************/
function createBeatParticles() {
  // Erstelle Partikel am Dino
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: dinoX,
      y: dinoY + dinoSize/2,
      vx: random(-3, 3),
      vy: random(-5, -2),
      life: 1.0,
      size: random(3, 8)
    });
  }
}

/************************************/
/* Wind-Linien (Geschwindigkeits-Visualisierung) */
/************************************/
function spawnWindLines() {
  // Spawne Wind-Linien basierend auf Geschwindigkeit
  if (frameCount % floor(10 / speedMultiplier) === 0) {
    windLines.push({
      x: width,
      y: dinoY + random(-20, 40), // Auf Höhe des Dinos
      length: random(20, 60),
      speed: random(4, 8) * speedMultiplier,
      alpha: random(100, 200)
    });
  }
}

function updateWindLines() {
  for (let i = windLines.length - 1; i >= 0; i--) {
    windLines[i].x -= windLines[i].speed * 3; // Angepasst an 90fps
    
    // Entferne Wind-Linien außerhalb des Bildschirms
    if (windLines[i].x + windLines[i].length < 0) {
      windLines.splice(i, 1);
    }
  }
}

function drawWindLines() {
  push();
  strokeWeight(2);
  
  for (let windLine of windLines) {
    let lineColor = partyMode ? [random(100, 255), random(100, 255), random(100, 255)] : [255, 255, 255];
    stroke(lineColor[0], lineColor[1], lineColor[2], windLine.alpha);
    line(windLine.x, windLine.y, windLine.x + windLine.length, windLine.y);
  }
  
  pop();
}

/************************************/
/* Regenbogen-Schatten (Nyancat-Style) */
/************************************/
function updateRainbowTrail() {
  // Füge neue Position am Dino hinzu (nur im Party-Modus)
  if (frameCount % 1 === 0) { // Jeden Frame für flüssigen Trail
    rainbowTrail.unshift({ // unshift fügt am Anfang hinzu
      x: dinoX,
      y: dinoY + dinoSize/2,
      hue: (frameCount * 3) % 360,
      offset: 0 // Startposition
    });
  }
  
  // Update alle Trail-Positionen - bewege sie nach links
  for (let i = 0; i < rainbowTrail.length; i++) {
    rainbowTrail[i].offset += 8 * speedMultiplier; // Bewegt sich nach links
    rainbowTrail[i].x = dinoX - rainbowTrail[i].offset; // Position links vom Dino
  }
  
  // Entferne Trails die zu weit links sind (bis zum Canvas-Rand)
  rainbowTrail = rainbowTrail.filter(t => t.x > -10);
  
  // Keine Längenbegrenzung - Trail geht bis zum Rand
}

function drawRainbowTrail() {
  if (!partyMode || rainbowTrail.length < 2) return;
  
  push();
  colorMode(HSB, 360, 100, 100);
  noStroke();
  
  // Zeichne als pixelige Rechtecke statt Linien
  for (let i = 0; i < rainbowTrail.length; i++) {
    let trail = rainbowTrail[i];
    
    // Alpha fadeout - sanftes Ausfaden, nicht abschneiden
    let distanceFromDino = abs(trail.x - dinoX);
    let fadeDistance = dinoX * 0.5; // Faded über 50% der verfügbaren Distanz
    
    // Weicheres Mapping mit flacherer Kurve für sanftes Ausfaden
    let normalizedDistance = distanceFromDino / fadeDistance;
    normalizedDistance = constrain(normalizedDistance, 0, 1);
    
    // Flachere Kurve (pow 0.6 = bleibt länger bei voller Opacity, dann sanfter Übergang)
    let alpha = (1 - pow(normalizedDistance, 0.05)) * 100;
    alpha = constrain(alpha, 0, 100);
    
    // Höhe basierend auf Position im Trail
    let trailHeight = map(i, 0, rainbowTrail.length, 15, 45); // Höhe von 15 bis 45 Pixel
    
    fill(trail.hue, 80, 100, alpha);
    
    // Pixelige Rechtecke (keine Rundungen)
    rectMode(CENTER);
    rect(trail.x, trail.y, 10, trailHeight); // Breite 10px, variable Höhe
  }
  
  colorMode(RGB, 255);
  pop();
}

/************************************/
/* Partikel-Updates                 */
/************************************/

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    p.x += p.vx * 3 * speedMultiplier; // Angepasst an 90fps + speedMultiplier
    p.y += p.vy * 3; // Angepasst an 90fps (Gravity bleibt gleich)
    p.vy += 0.2; // Gravity
    p.life -= 0.05 * 3; // Angepasst an 90fps
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  push();
  noStroke();
  
  for (let p of particles) {
    fill(255, p.life * 255);
    circle(p.x, p.y, p.size * p.life);
  }
  
  pop();
}

// Draw an additive, overexposed ring/flash for contrast boost on kick
function drawKickContrast() {
  if (kickContrast <= 1) return;

  push();
  // additive blending to fake contrast/overexposure
  blendMode(ADD);
  noStroke();

  // Base size influenced by bass
  // Smaller ring around the Dino (user request)
  // Base size smaller and positioned at the Dino
  let centerX = dinoX;
  let centerY = dinoY + dinoSize / 2;

  // smaller base size, still reacting to bass but limited
  let baseSize = 60 + map(low_freq, 0, 255, 0, 160); // ~60 - 220

  // draw a few concentric soft rings (subtle)
  // Pixelated ring: draw small squares in an annulus around the Dino
  rectMode(CENTER);
  // pixel size scales a bit with baseSize but remains blocky
  let pixelSize = max(4, floor(map(baseSize, 60, 220, 5, 10)));

  // define inner/outer radius for the ring (elliptical vertically)
  let innerR = baseSize * 0.72;
  let outerR = baseSize * 1.05;

  // iterate over a tight bounding box and place blocks where distance fits the annulus
  for (let px = centerX - baseSize; px <= centerX + baseSize; px += pixelSize) {
    for (let py = centerY - baseSize * 0.6; py <= centerY + baseSize * 0.6; py += pixelSize) {
      // account for vertical squish to keep elliptical shape similar to previous ring
      let dx = px - centerX;
      let dy = (py - centerY) / 0.6; // scale Y for elliptical distance
      let d = sqrt(dx * dx + dy * dy);
      if (d >= innerR && d <= outerR) {
        // normalized falloff from inner to outer
        let norm = 1 - (d - innerR) / (outerR - innerR);
        let a = (kickContrast / 255) * (140 * norm); // alpha per block
        fill(255, a);
        rect(px, py, pixelSize, pixelSize);
      }
    }
  }

  // decay the contrast quickly but keep smooth
  kickContrast = lerp(kickContrast, 0, 0.42);
  pop();
}

/************************************/
/* Visuelle Effekte                 */
/************************************/
function drawGrain() {
  // Körnung basierend auf Amplitude
  let grainAmount = map(ampAverage, 0, 0.3, 5, 30);
  
  push();
  loadPixels();
  for (let i = 0; i < grainAmount * 100; i++) {
    let x = floor(random(width));
    let y = floor(random(height));
    let index = (x + y * width) * 4;
    let grain = random(10, 30);
    pixels[index] = grain;
    pixels[index + 1] = grain;
    pixels[index + 2] = grain;
    pixels[index + 3] = 255;
  }
  updatePixels();
  pop();
}

function drawBlackFlash() {
  if (blackFlashIntensity > 0) {
    push();
    fill(0, blackFlashIntensity);
    noStroke();
    rect(0, 0, width, height);
    blackFlashIntensity *= 0.7; // Schnelles Abklingen
    pop();
  }
}

function drawVignette() {
  push();
  
  // Radial gradient für Vignette
  let vignetteStrength = 100;
  
  drawingContext.save();
  let gradient = drawingContext.createRadialGradient(
    width/2, height/2, height/4,
    width/2, height/2, width/1.2
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${vignetteStrength/255})`);
  
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
  drawingContext.restore();
  
  pop();
}

function drawHighScore() {
  push();
  
  // Verwende die Retro-Schriftart
  textFont(retroFont);
  textSize(20);
  
  // Farbe abhängig vom Party-Modus
  if (partyMode) {
    fill(highscoreColor[0], highscoreColor[1], highscoreColor[2]);
  } else {
    fill(255);
  }
  
  noStroke();
  textAlign(RIGHT, TOP);
  
  // Position weiter nach links und unten, näher zur Mitte
  let xPos = width - 150; // Weiter nach links (war 30)
  let yPos = 60; // Weiter nach unten (war 30)
  
  // Formatiere die Zahlen mit führenden Nullen
  let scoreText = nf(currentScore, 5); // 5 Stellen mit führenden Nullen
  
  // Zeichne "HI" und Highscore
  text("HI " + nf(highScore, 5) + " " + scoreText, xPos, yPos);
  
  pop();
}

function drawStartText() {
  push();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text("CLICK TO START", width/2, height/2);
  pop();
}

/************************************/
/* Game Over                        */
/************************************/
function triggerGameOver() {
  gameOver = true;
  gameOverTime = millis();
  gameOverY = -100;
  console.log("💀 GAME OVER! 💀");
}

function drawGameOver() {
  // Animiere "GAME OVER" Text von oben nach unten
  if (gameOverY < height/2) {
    gameOverY += 15; // Geschwindigkeit des Reinflugs
  }
  
  // RGB-Blinken (sehr schnell)
  gameOverColor = [random(100, 255), random(100, 255), random(100, 255)];
  
  push();
  textFont(retroFont);
  textSize(64);
  fill(gameOverColor[0], gameOverColor[1], gameOverColor[2]);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width/2, gameOverY);
  pop();
  
  // Nach 3 Sekunden: Neustart
  if (millis() - gameOverTime > 3000) {
    resetGame();
  }
}

function resetGame() {
  // Reset aller Variablen (außer Musik)
  gameOver = false;
  gameOverY = -100;
  currentScore = 0;
  speedMultiplier = 1.0;
  partyMode = false;
  kickCounter = 0;
  
  // Reset Arrays
  obstacles = [];
  particles = [];
  windLines = [];
  rainbowTrail = [];
  
  // Reset Farben
  bgColor = [0, 0, 0];
  groundColor = [255, 255, 255];
  cloudColor = [255, 255, 255];
  cactusColor = [255, 255, 255];
  grainColor = [255, 255, 255];
  dinoTintColor = [255, 255, 255];
  highscoreColor = [255, 255, 255];
  
  // Reset Dino
  dinoY = groundY - dinoSize;
  isJumping = false;
  jumpVelocity = 0;
  
  // Recreate Ground
  createGround();
  createGroundGrains();
  
  console.log("🔄 NEUSTART! 🔄");
}

/************************************/
/* Musik-reaktive Updates           */
/************************************/
function updateMusicReactiveValues() {
  // Bereits in getFFTEnergy() gesetzt
  // Weitere Anpassungen können hier erfolgen
}

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

function updateThresholdsKick() {
  maxAmpFreq = max(maxAmpFreq, ampLevelClamp);
  maxAmpFreq *= 0.99999;
  thresholdKick = maxAmpFreq * thresholdKickFraction;
}

/*******************************/
/* Code für Bass-Drop Detection */
/*******************************/
function bassDropDetection() {
  // Verwende sub_freq (tiefste Frequenzen) für Bass-Drop-Erkennung
  let currentBass = sub_freq;
  
  // Berechne die Differenz zum vorherigen Frame (Delta)
  let bassDelta = currentBass - lastBass;
  
  // Speichere Bass-Historie für smoothing
  bassHistory.push(currentBass);
  if (bassHistory.length > 60) {
    bassHistory.shift();
  }
  
  // Erkenne starke Anstiege im Bass (Drop)
  // Nur wenn Bass aktuell auch hoch genug ist (mindestens 100)
  if (bassDelta > bassDropThreshold && currentBass > 100 && !bassDropDetected) {
    bassDropDetected = true;
    lastBass = currentBass;
    return true;
  } else if (bassDelta < bassDropThreshold * 0.3) {
    // Reset detection wenn Delta wieder klein wird
    bassDropDetected = false;
  }
  
  // Update lastBass mit leichtem smoothing für stabilere Detection
  lastBass = lerp(lastBass, currentBass, 0.3);
  
  return false;
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
    ellipse(width / 2, height / 2, 200, 200);
  }
}

/**********************************/
/* Code für FFT, Spectrum, Energy */
/**********************************/
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
