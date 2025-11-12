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

/************************************/
/* Variablen für den Kopf           */
/************************************/
let headVertices = [];
let headTriangles = [];
let gridLines = [];
let activeGridLines = []; // Aktuell animierte Linien
let gridOffset = 0;
let rotationY = 0;
let coloredTriangles = []; // Speichert welche Dreiecke gerade farbig sind
let currentSegments = 5;   // Aktuelle Anzahl Segmente
let currentRings = 6;      // Aktuelle Anzahl Ringe

/************************************/
/* Effekt-Variablen                 */
/************************************/
let kickCounter = 0;        // Zählt Kicks
let lastKickCounted = false; // Verhindert Mehrfachzählung
let flickerIntensity = 1.0; // 1.0 = normal, < 1.0 = gedimmt
let isFlickering = false;
let flickerDuration = 0;
let scanLineOffset = 0;     // Offset für Scan-Lines

// Glitch-Effekt
let isGlitching = false;
let glitchDuration = 0;
let glitchOffsetX = 0;
let glitchOffsetY = 0;
let glitchScale = 1.0;
let glitchRotation = 0;

// Psychose-Effekt (3 Köpfe)
let isPsychosis = false;
let psychosisKickStart = 0;  // Bei welchem Kick die Psychose gestartet wurde
let leftHeadGlitchX = 0;
let leftHeadGlitchY = 0;
let rightHeadGlitchX = 0;
let rightHeadGlitchY = 0;

// Separate Daten für linken Psychose-Kopf
let leftHeadVertices = [];
let leftHeadTriangles = [];
let leftColoredTriangles = [];
let leftCurrentSegments = 5;
let leftCurrentRings = 6;
let leftRotationY = 0;

// Separate Daten für rechten Psychose-Kopf
let rightHeadVertices = [];
let rightHeadTriangles = [];
let rightColoredTriangles = [];
let rightCurrentSegments = 5;
let rightCurrentRings = 6;
let rightRotationY = 0;

function preload() {
  sound = loadSound("./assets/audio/katyperry.mp3");
}

function setup() {
  createCanvas(1920, 450, WEBGL);
  frameRate(30);

  amplitude = new p5.Amplitude();

  low_fft = new p5.FFT(0.9, band_cnt);
  mid_fft = new p5.FFT(0.75, band_cnt);
  high_fft = new p5.FFT(0.5, band_cnt);
  low_fft.setInput(sound);
  mid_fft.setInput(sound);
  high_fft.setInput(sound);

  // Erstelle den polygonalen Kopf
  createHead();
  
  // Erstelle die Psychose-Köpfe
  createPsychosisHeads();
  
  // Erstelle das Gitternetz für den Hintergrund
  createGrid();
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
  background(0);

  isBeatDetected = beatDetection();
  ampAverage = amplitude.getLevel();
  fftEnergy = getFFTEnergy();
  
  // Update Effekte
  updateFlicker();
  updateScanLines();
  updateGlitch();
  updatePsychosis();

  // Bei Beat: Ersetze komplett die Farb-Liste (sofortiger Effekt)
  if (isBeatDetected) {
    coloredTriangles = []; // Leere alte Liste
    
    // Zähle Kicks nur einmal pro Beat (nicht mehrfach wenn isBeatDetected mehrere Frames true ist)
    if (!lastKickCounted) {
      kickCounter++;
      lastKickCounted = true;
      
      // Prüfe Psychose-Status basierend auf Kick-Zyklus
      checkPsychosisState();
      
      // Nach jedem 9. Kick (also beim 10., 20., 30., etc.): Flackern auslösen
      if (kickCounter % 10 === 0) {
        triggerFlicker();
        console.log("Flackern bei Kick:", kickCounter); // Debug
      }
      
      // Nach jedem 19. Kick (also beim 20., 40., 60., etc.): Glitch auslösen
      if (kickCounter % 20 === 0) {
        triggerGlitch();
        console.log("Glitch bei Kick:", kickCounter); // Debug
      }
    }
    
    // Verändere Segments und Rings zufällig für Hauptkopf
    currentSegments = int(random(3, 12));
    currentRings = int(random(3, 16));
    
    // Erstelle Hauptkopf neu mit neuen Werten
    createHead();
    
    // PSYCHOSE-KÖPFE: Verändere unabhängig bei jedem Beat
    if (isPsychosis) {
      // Linker Kopf: völlig zufällige Werte
      leftCurrentSegments = int(random(3, 12));
      leftCurrentRings = int(random(3, 16));
      
      // Rechter Kopf: völlig andere zufällige Werte
      rightCurrentSegments = int(random(3, 12));
      rightCurrentRings = int(random(3, 16));
      
      // Erstelle beide Psychose-Köpfe neu
      createPsychosisHeads();
    }
    
    // Füge 30-50 zufällige Dreiecke zum Hauptkopf hinzu
    let numToAdd = int(random(30, 50));
    for (let i = 0; i < numToAdd; i++) {
      let randomTri = int(random(headTriangles.length));
      let randomColor = getRandomColorForBeat();
      coloredTriangles.push({
        index: randomTri,
        color: randomColor,
        life: 1.0
      });
    }
    
    // Füge zufällige Dreiecke zu den Psychose-Köpfen hinzu (wenn aktiv)
    if (isPsychosis) {
      // Linker Kopf
      leftColoredTriangles = [];
      let numToAddLeft = int(random(30, 50));
      for (let i = 0; i < numToAddLeft; i++) {
        let randomTri = int(random(leftHeadTriangles.length));
        let randomColor = getRandomColorForBeat();
        leftColoredTriangles.push({
          index: randomTri,
          color: randomColor,
          life: 1.0
        });
      }
      
      // Rechter Kopf
      rightColoredTriangles = [];
      let numToAddRight = int(random(30, 50));
      for (let i = 0; i < numToAddRight; i++) {
        let randomTri = int(random(rightHeadTriangles.length));
        let randomColor = getRandomColorForBeat();
        rightColoredTriangles.push({
          index: randomTri,
          color: randomColor,
          life: 1.0
        });
      }
    }
  } else {
    // Kein Beat: Lösche sofort alle farbigen Dreiecke
    coloredTriangles = [];
    leftColoredTriangles = [];
    rightColoredTriangles = [];
    // Reset für nächsten Kick
    lastKickCounted = false;
  }

  // Schnellere automatische Rotation
  rotationY += 0.03;
  
  // Psychose-Köpfe drehen in entgegengesetzte Richtungen
  leftRotationY -= 0.025;  // Dreht nach links
  rightRotationY += 0.035; // Dreht nach rechts (schneller)
  
  // Update Grid-Animationen
  updateGridAnimations();
  
  // Zeichne animiertes Gitternetz im Hintergrund
  drawBackgroundGrid();
  
  // Zeichne Psychose-Köpfe (links und rechts, wenn aktiv)
  if (isPsychosis) {
    drawPsychosisHeads();
  }
  
  // Zeichne den Hauptkopf (Mitte)
  drawHead();
  
  // Post-Processing Effekte (in 2D)
  drawScanLines();
  drawVignette();
}

/************************************/
/* Kopf-Erstellung                  */
/************************************/
function createHead() {
  let scale = min(width, height) * 0.25;
  
  headVertices = [];
  headTriangles = [];
  
  // Nutze die aktuellen Segment- und Ring-Werte (werden bei Kicks geändert)
  let segments = currentSegments;
  let rings = currentRings;
  
  for (let ring = 0; ring <= rings; ring++) {
    let phi = map(ring, 0, rings, 0, PI);
    
    for (let seg = 0; seg < segments; seg++) {
      let theta = map(seg, 0, segments, 0, TWO_PI);
      
      // Kopfform: breiter oben, schmaler unten
      let radiusX = scale * 0.8;
      let radiusY = scale * (1.2 - ring / rings * 0.4);
      let radiusZ = scale * 0.7;
      
      let x = radiusX * sin(phi) * cos(theta);
      let y = radiusY * cos(phi) - scale * 0.3;
      let z = radiusZ * sin(phi) * sin(theta);
      
      headVertices.push({x: x, y: y, z: z, ring: ring, seg: seg});
    }
  }
  
  // Erstelle Dreiecke für den Hauptkopf
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segments; seg++) {
      let nextSeg = (seg + 1) % segments;
      
      let current = ring * segments + seg;
      let next = ring * segments + nextSeg;
      let below = (ring + 1) * segments + seg;
      let belowNext = (ring + 1) * segments + nextSeg;
      
      if (ring < rings) {
        headTriangles.push([current, next, below]);
        headTriangles.push([next, belowNext, below]);
      }
    }
  }
  
  // Füge Augen hinzu
  createEyes(scale);
  
  // Füge Mund hinzu
  createMouth(scale);
}

/************************************/
/* Psychose-Köpfe Erstellung        */
/************************************/
function createPsychosisHeads() {
  let scale = min(width, height) * 0.25;
  
  // LINKER KOPF
  leftHeadVertices = [];
  leftHeadTriangles = [];
  
  let leftSegments = leftCurrentSegments;
  let leftRings = leftCurrentRings;
  
  for (let ring = 0; ring <= leftRings; ring++) {
    let phi = map(ring, 0, leftRings, 0, PI);
    
    for (let seg = 0; seg < leftSegments; seg++) {
      let theta = map(seg, 0, leftSegments, 0, TWO_PI);
      
      let radiusX = scale * 0.8;
      let radiusY = scale * (1.2 - ring / leftRings * 0.4);
      let radiusZ = scale * 0.7;
      
      let x = radiusX * sin(phi) * cos(theta);
      let y = radiusY * cos(phi) - scale * 0.3;
      let z = radiusZ * sin(phi) * sin(theta);
      
      leftHeadVertices.push({x: x, y: y, z: z, ring: ring, seg: seg});
    }
  }
  
  for (let ring = 0; ring < leftRings; ring++) {
    for (let seg = 0; seg < leftSegments; seg++) {
      let nextSeg = (seg + 1) % leftSegments;
      
      let current = ring * leftSegments + seg;
      let next = ring * leftSegments + nextSeg;
      let below = (ring + 1) * leftSegments + seg;
      let belowNext = (ring + 1) * leftSegments + nextSeg;
      
      if (ring < leftRings) {
        leftHeadTriangles.push([current, next, below]);
        leftHeadTriangles.push([next, belowNext, below]);
      }
    }
  }
  
  // Füge Augen zum linken Kopf hinzu (größere Augen)
  createPsychosisEyes(scale, leftHeadVertices, leftHeadTriangles, 0.18);
  
  // Füge Mund zum linken Kopf hinzu (breiterer Mund)
  createPsychosisMouth(scale, leftHeadVertices, leftHeadTriangles, 0.5, 0.12);
  
  // RECHTER KOPF
  rightHeadVertices = [];
  rightHeadTriangles = [];
  
  let rightSegments = rightCurrentSegments;
  let rightRings = rightCurrentRings;
  
  for (let ring = 0; ring <= rightRings; ring++) {
    let phi = map(ring, 0, rightRings, 0, PI);
    
    for (let seg = 0; seg < rightSegments; seg++) {
      let theta = map(seg, 0, rightSegments, 0, TWO_PI);
      
      let radiusX = scale * 0.8;
      let radiusY = scale * (1.2 - ring / rightRings * 0.4);
      let radiusZ = scale * 0.7;
      
      let x = radiusX * sin(phi) * cos(theta);
      let y = radiusY * cos(phi) - scale * 0.3;
      let z = radiusZ * sin(phi) * sin(theta);
      
      rightHeadVertices.push({x: x, y: y, z: z, ring: ring, seg: seg});
    }
  }
  
  for (let ring = 0; ring < rightRings; ring++) {
    for (let seg = 0; seg < rightSegments; seg++) {
      let nextSeg = (seg + 1) % rightSegments;
      
      let current = ring * rightSegments + seg;
      let next = ring * rightSegments + nextSeg;
      let below = (ring + 1) * rightSegments + seg;
      let belowNext = (ring + 1) * rightSegments + nextSeg;
      
      if (ring < rightRings) {
        rightHeadTriangles.push([current, next, below]);
        rightHeadTriangles.push([next, belowNext, below]);
      }
    }
  }
  
  // Füge Augen zum rechten Kopf hinzu (kleinere, enger beieinander)
  createPsychosisEyes(scale, rightHeadVertices, rightHeadTriangles, 0.12);
  
  // Füge Mund zum rechten Kopf hinzu (schmalerer, höherer Mund)
  createPsychosisMouth(scale, rightHeadVertices, rightHeadTriangles, 0.35, 0.18);
}

/************************************/
/* Augen-Erstellung                 */
/************************************/
function createEyes(scale) {
  let eyeSize = scale * 0.15;
  let eyeDistance = scale * 0.3;
  let eyeDepth = scale * 0.55; // Z-Position (nach vorne)
  let eyeHeight = -scale * 0.1; // Y-Position
  
  // Linkes Auge
  createEye(-eyeDistance, eyeHeight, eyeDepth, eyeSize);
  
  // Rechtes Auge
  createEye(eyeDistance, eyeHeight, eyeDepth, eyeSize);
}

function createEye(centerX, centerY, centerZ, size) {
  let startIndex = headVertices.length;
  let segments = 8;
  
  // Zentrum des Auges
  headVertices.push({x: centerX, y: centerY, z: centerZ});
  
  // Ring um das Auge
  for (let i = 0; i < segments; i++) {
    let angle = map(i, 0, segments, 0, TWO_PI);
    let x = centerX + cos(angle) * size;
    let y = centerY + sin(angle) * size;
    let z = centerZ + size * 0.1; // Leicht nach vorne
    
    headVertices.push({x: x, y: y, z: z});
  }
  
  // Erstelle Dreiecke für das Auge
  for (let i = 0; i < segments; i++) {
    let next = (i + 1) % segments;
    headTriangles.push([startIndex, startIndex + 1 + i, startIndex + 1 + next]);
  }
}

/************************************/
/* Mund-Erstellung                  */
/************************************/
function createMouth(scale) {
  let mouthWidth = scale * 0.4;
  let mouthHeight = scale * 0.15;
  let mouthY = scale * 0.25;
  let mouthZ = scale * 0.5;
  
  let startIndex = headVertices.length;
  let segments = 10;
  
  // Obere Lippenlinie
  for (let i = 0; i <= segments; i++) {
    let t = map(i, 0, segments, -1, 1);
    let x = t * mouthWidth;
    let y = mouthY - abs(t) * mouthHeight * 0.3; // Leichtes Lächeln
    let z = mouthZ;
    
    headVertices.push({x: x, y: y, z: z});
  }
  
  // Untere Lippenlinie
  for (let i = 0; i <= segments; i++) {
    let t = map(i, 0, segments, -1, 1);
    let x = t * mouthWidth;
    let y = mouthY + mouthHeight - abs(t) * mouthHeight * 0.2;
    let z = mouthZ - mouthHeight * 0.1;
    
    headVertices.push({x: x, y: y, z: z});
  }
  
  // Verbinde obere und untere Linie mit Dreiecken
  for (let i = 0; i < segments; i++) {
    let topCurrent = startIndex + i;
    let topNext = startIndex + i + 1;
    let bottomCurrent = startIndex + segments + 1 + i;
    let bottomNext = startIndex + segments + 1 + i + 1;
    
    headTriangles.push([topCurrent, topNext, bottomCurrent]);
    headTriangles.push([topNext, bottomNext, bottomCurrent]);
  }
}

/************************************/
/* Psychose-Augen & Mund Erstellung */
/************************************/
function createPsychosisEyes(scale, vertices, triangles, eyeSizeMultiplier) {
  let eyeSize = scale * eyeSizeMultiplier;
  let eyeDistance = scale * 0.3;
  let eyeDepth = scale * 0.55;
  let eyeHeight = -scale * 0.1;
  
  // Linkes Auge
  createPsychosisEye(-eyeDistance, eyeHeight, eyeDepth, eyeSize, vertices, triangles);
  
  // Rechtes Auge
  createPsychosisEye(eyeDistance, eyeHeight, eyeDepth, eyeSize, vertices, triangles);
}

function createPsychosisEye(centerX, centerY, centerZ, size, vertices, triangles) {
  let startIndex = vertices.length;
  let segments = 8;
  
  // Zentrum des Auges
  vertices.push({x: centerX, y: centerY, z: centerZ});
  
  // Ring um das Auge
  for (let i = 0; i < segments; i++) {
    let angle = map(i, 0, segments, 0, TWO_PI);
    let x = centerX + cos(angle) * size;
    let y = centerY + sin(angle) * size;
    let z = centerZ + size * 0.1;
    
    vertices.push({x: x, y: y, z: z});
  }
  
  // Erstelle Dreiecke für das Auge
  for (let i = 0; i < segments; i++) {
    let next = (i + 1) % segments;
    triangles.push([startIndex, startIndex + 1 + i, startIndex + 1 + next]);
  }
}

function createPsychosisMouth(scale, vertices, triangles, widthMultiplier, heightMultiplier) {
  let mouthWidth = scale * widthMultiplier;
  let mouthHeight = scale * heightMultiplier;
  let mouthY = scale * 0.25;
  let mouthZ = scale * 0.5;
  
  let startIndex = vertices.length;
  let segments = 10;
  
  // Obere Lippenlinie
  for (let i = 0; i <= segments; i++) {
    let t = map(i, 0, segments, -1, 1);
    let x = t * mouthWidth;
    let y = mouthY - abs(t) * mouthHeight * 0.3;
    let z = mouthZ;
    
    vertices.push({x: x, y: y, z: z});
  }
  
  // Untere Lippenlinie
  for (let i = 0; i <= segments; i++) {
    let t = map(i, 0, segments, -1, 1);
    let x = t * mouthWidth;
    let y = mouthY + mouthHeight - abs(t) * mouthHeight * 0.2;
    let z = mouthZ - mouthHeight * 0.1;
    
    vertices.push({x: x, y: y, z: z});
  }
  
  // Verbinde obere und untere Linie mit Dreiecken
  for (let i = 0; i < segments; i++) {
    let topCurrent = startIndex + i;
    let topNext = startIndex + i + 1;
    let bottomCurrent = startIndex + segments + 1 + i;
    let bottomNext = startIndex + segments + 1 + i + 1;
    
    triangles.push([topCurrent, topNext, bottomCurrent]);
    triangles.push([topNext, bottomNext, bottomCurrent]);
  }
}

/************************************/
/* Gitternetz-Erstellung            */
/************************************/
function createGrid() {
  let spacing = 50;
  
  // Erstelle mehr Linien als nötig (für dynamisches Spacing)
  gridLines = [];
  
  // Erstelle vertikale Linien
  for (let x = -width * 2; x <= width * 2; x += spacing) {
    gridLines.push({
      type: 'vertical',
      baseX: x,
      x1: x,
      y1: -height * 2,
      x2: x,
      y2: height * 2,
      isActive: false,
      progress: 0
    });
  }
  
  // Erstelle horizontale Linien
  for (let y = -height * 2; y <= height * 2; y += spacing) {
    gridLines.push({
      type: 'horizontal',
      baseY: y,
      x1: -width * 2,
      y1: y,
      x2: width * 2,
      y2: y,
      isActive: false,
      progress: 0
    });
  }
}

/************************************/
/* Grid-Animation Update            */
/************************************/
function updateGridAnimations() {
  // Berechne wie viele Linien basierend auf Amplitude aktiviert werden sollen
  let amplitudeNormalized = map(ampAverage, 0, 0.1, 0, 1);
  amplitudeNormalized = constrain(amplitudeNormalized, 0, 1);
  
  // Erhöhte Aktivierungschance (wegen mehr Linien)
  let activationChance = amplitudeNormalized * 0.25; // 0% bis 25% Chance (erhöht für mehr Linien)
  
  if (random() < activationChance && amplitudeNormalized > 0.15) { // Niedrigerer Schwellwert
    let inactiveLines = gridLines.filter(line => !line.isActive);
    if (inactiveLines.length > 0) {
      let randomLine = random(inactiveLines);
      randomLine.isActive = true;
      randomLine.progress = 0;
    }
  }
  
  // Bei Beats: Aktiviere mehr Linien (angepasst für größeres Grid)
  if (isBeatDetected) {
    let numLines = int(random(4, 8)); // Mehr Linien bei Beats
    for (let i = 0; i < numLines; i++) {
      let inactiveLines = gridLines.filter(line => !line.isActive);
      if (inactiveLines.length > 0) {
        let randomLine = random(inactiveLines);
        randomLine.isActive = true;
        randomLine.progress = 0;
      }
    }
  }
  
  // Update alle aktiven Linien
  for (let line of gridLines) {
    if (line.isActive) {
      // Geschwindigkeit
      let speed = 0.03 + amplitudeNormalized * 0.02;
      line.progress += speed;
      
      // Deaktiviere wenn fertig
      if (line.progress >= 1.0) {
        line.isActive = false;
        line.progress = 0;
      }
    }
  }
}

/************************************/
/* Hintergrund-Gitternetz           */
/************************************/
function drawBackgroundGrid() {
  push();
  
  // Bewege Grid nach hinten
  translate(0, 0, -300);
  
  // Wellenartige Vibration des gesamten Grids
  let waveAmplitude = 15 + ampAverage * 30; // Basis-Welle + Audio-Verstärkung
  let waveSpeed = frameCount * 0.08;
  
  // Rotiere und verschiebe das gesamte Grid leicht
  let globalWaveX = sin(waveSpeed) * waveAmplitude;
  let globalWaveY = cos(waveSpeed * 0.7) * waveAmplitude;
  let globalRotation = sin(waveSpeed * 0.5) * 0.02; // Leichte Rotation
  
  rotateZ(globalRotation);
  translate(globalWaveX, globalWaveY, 0);
  
  // Amplitude-reaktives Spacing: Hohe Lautstärke = größeres Spacing
  let amplitudeNormalized = map(ampAverage, 0, 0.1, 0, 1);
  amplitudeNormalized = constrain(amplitudeNormalized, 0, 1);
  let spacingMultiplier = map(amplitudeNormalized, 0, 1, 0.5, 2.0); // 0.5x bis 2.0x Spacing
  
  // Audio-reaktive Vibration für einzelne Linien
  let audioVibration = ampAverage * 50;
  let timeOffset = frameCount * 0.05;
  
  // Zeichne alle Linien mit dynamischem Spacing
  for (let i = 0; i < gridLines.length; i++) {
    let gridLine = gridLines[i];
    
    // Berechne individuelle Vibration für diese Linie
    let vibration = sin(timeOffset + i * 0.1) * audioVibration;
    
    // Wende Amplitude-Spacing an
    let x1, y1, x2, y2;
    
    if (gridLine.type === 'vertical') {
      // Zentriere Spacing-Multiplikation um Ursprung
      x1 = gridLine.baseX * spacingMultiplier;
      x2 = gridLine.baseX * spacingMultiplier;
      x1 += vibration;
      x2 += vibration;
      y1 = gridLine.y1;
      y2 = gridLine.y2;
    } else {
      // Zentriere Spacing-Multiplikation um Ursprung
      y1 = gridLine.baseY * spacingMultiplier;
      y2 = gridLine.baseY * spacingMultiplier;
      y1 += vibration;
      y2 += vibration;
      x1 = gridLine.x1;
      x2 = gridLine.x2;
    }
    
    if (gridLine.isActive) {
      // Aktive Linie mit Lichtfaden-Animation (keine Basislinie)
      drawAnimatedLine(gridLine, x1, y1, x2, y2);
    } else {
      // Inaktive Linien: Zeichne dünnes graues Grid (mit Flicker)
      stroke(40 * flickerIntensity, 40 * flickerIntensity, 40 * flickerIntensity);
      strokeWeight(1);
      line(x1, y1, x2, y2);
    }
  }
  
  pop();
}

function drawAnimatedLine(gridLine, x1, y1, x2, y2) {
  // Berechne aktuelle Position des Lichtfadens
  let currentX = lerp(x1, x2, gridLine.progress);
  let currentY = lerp(y1, y2, gridLine.progress);
  
  // KEINE Basislinie mehr - nur der Lichtfaden wird gezeichnet
  
  // 1. Zeichne den bereits durchlaufenen Teil (leuchtend, mit Fade-out)
  if (gridLine.progress > 0.05) {
    // Trail mit Fade-out Effekt
    let segments = 20;
    for (let i = 0; i < segments; i++) {
      let t1 = map(i, 0, segments, 0, gridLine.progress);
      let t2 = map(i + 1, 0, segments, 0, gridLine.progress);
      
      let x1Trail = lerp(x1, x2, t1);
      let y1Trail = lerp(y1, y2, t1);
      let x2Trail = lerp(x1, x2, t2);
      let y2Trail = lerp(y1, y2, t2);
      
      // Fade-out: Je näher am Anfang, desto transparenter (mit Flicker)
      let fadeAlpha = map(t1, 0, gridLine.progress, 0, 180) * flickerIntensity;
      stroke(180 * flickerIntensity, 180 * flickerIntensity, 180 * flickerIntensity, fadeAlpha);
      strokeWeight(2);
      line(x1Trail, y1Trail, x2Trail, y2Trail);
    }
  }
  
  // 2. Zeichne den Lichtfaden mit starkem Glow (mit Flicker)
  let glowSize = 30;
  
  // Mehrere Glow-Layers
  for (let i = 6; i > 0; i--) {
    let alpha = map(i, 0, 6, 50, 255) * flickerIntensity;
    let weight = map(i, 0, 6, 10, 2);
    stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, alpha);
    strokeWeight(weight);
    
    // Berechne zurückliegenden Punkt für Trail
    let trailProgress = constrain(gridLine.progress - i * 0.02, 0, 1);
    let trailX = lerp(x1, x2, trailProgress);
    let trailY = lerp(y1, y2, trailProgress);
    
    line(trailX, trailY, currentX, currentY);
  }
  
  // 3. Hellster Kern (mit Flicker)
  stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity);
  strokeWeight(5);
  point(currentX, currentY);
  
  // 4. Zusätzlicher Glow um den Punkt (mit Flicker)
  noStroke();
  fill(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 150 * flickerIntensity);
  push();
  translate(currentX, currentY, 0);
  sphere(3);
  pop();
}

/************************************/
/* Kopf-Zeichnung                   */
/************************************/
function drawHead() {
  push();
  
  // Glitch-Effekt: Verschiebung und Verzerrung
  if (isGlitching) {
    translate(glitchOffsetX, glitchOffsetY, 0);
    scale(glitchScale, glitchScale, 1.0);
    rotateZ(glitchRotation);
  }
  
  // Rotation basierend auf Zeit und Audio
  rotateY(rotationY + ampAverage * 0.7);
  rotateX(sin(frameCount * 0.01) * 0.1);
  
  // Zeichne alle Dreiecke
  for (let i = 0; i < headTriangles.length; i++) {
    let tri = headTriangles[i];
    let v1 = headVertices[tri[0]];
    let v2 = headVertices[tri[1]];
    let v3 = headVertices[tri[2]];
    
    // Prüfe ob dieses Dreieck gerade gefüllt sein soll (bei Beat)
    let shouldFill = false;
    let fillColor = color(255);
    
    for (let colored of coloredTriangles) {
      if (colored.index === i) {
        shouldFill = true;
        fillColor = colored.color;
        break;
      }
    }
    
    // Zeichne Dreieck
    if (shouldFill) {
      // Bei Kick: Gefüllte Fläche in zufälliger Farbe (mit Flicker)
      let flickeredColor = color(
        red(fillColor) * flickerIntensity,
        green(fillColor) * flickerIntensity,
        blue(fillColor) * flickerIntensity
      );
      fill(flickeredColor);
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 200 * flickerIntensity);
      strokeWeight(2);
    } else {
      // Normal: Nur Outline, keine Füllung (mit Flicker)
      noFill();
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 180 * flickerIntensity);
      strokeWeight(1.5);
    }
    
    // Leichte Animation der Vertices basierend auf Audio
    let wobble = ampAverage * 30;
    let noise1 = noise(frameCount * 0.01 + tri[0]) * wobble;
    let noise2 = noise(frameCount * 0.01 + tri[1]) * wobble;
    let noise3 = noise(frameCount * 0.01 + tri[2]) * wobble;
    
    // Zeichne Dreieck in 3D
    beginShape();
    vertex(v1.x + noise1, v1.y, v1.z);
    vertex(v2.x + noise2, v2.y, v2.z);
    vertex(v3.x + noise3, v3.y, v3.z);
    endShape(CLOSE);
  }
  
  pop();
}

/************************************/
/* Farbe für Dreiecke               */
/************************************/
function getRandomColorForBeat() {
  // Zufällige intensive Farben für Beat-Effekte
  let colorOptions = [
    color(255, 50, 100),   // Rot/Pink
    color(50, 255, 150),   // Grün/Cyan
    color(100, 100, 255),  // Blau
    color(255, 255, 50),   // Gelb
    color(255, 100, 255),  // Magenta
    color(100, 255, 255),  // Cyan
    color(255, 150, 50),   // Orange
  ];
  
  return random(colorOptions);
}

/*******************************/
/* Beat Detection Code         */
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
    ellipse(width / 2, height / 2, 200, 200);
  }
}

/**********************************/
/* FFT Energy Code                */
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

// Responsive Canvas
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  gridLines = [];
  createGrid();
  headVertices = [];
  headTriangles = [];
  createHead();
}

/************************************/
/* Vignette-Effekt                  */
/************************************/
function drawVignette() {
  push();
  
  // Wechsel zu 2D-Koordinaten (Ortho-Modus für Overlay)
  // Setze Kamera zurück für 2D-Zeichnung
  camera(0, 0, (height/2.0) / tan(PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
  resetMatrix();
  
  // Zeichne rechteckige Vignette von den Canvas-Rändern
  let vignetteSize = min(width, height) * 0.4; // Wie weit die Verdunkelung reingeht
  
  noStroke();
  
  // Oben
  for (let i = 0; i < vignetteSize; i++) {
    let alpha = map(i, 0, vignetteSize, 150, 0);
    fill(0, alpha);
    rect(-width/2, -height/2 + i, width, 1);
  }
  
  // Unten
  for (let i = 0; i < vignetteSize; i++) {
    let alpha = map(i, 0, vignetteSize, 150, 0);
    fill(0, alpha);
    rect(-width/2, height/2 - i, width, 1);
  }
  
  // Links
  for (let i = 0; i < vignetteSize; i++) {
    let alpha = map(i, 0, vignetteSize, 150, 0);
    fill(0, alpha);
    rect(-width/2 + i, -height/2, 1, height);
  }
  
  // Rechts
  for (let i = 0; i < vignetteSize; i++) {
    let alpha = map(i, 0, vignetteSize, 150, 0);
    fill(0, alpha);
    rect(width/2 - i, -height/2, 1, height);
  }
  
  pop();
}

/************************************/
/* Flackerndes Licht                */
/************************************/
function triggerFlicker() {
  isFlickering = true;
  flickerDuration = 15; // 15 Frames (~0.5 Sekunden bei 30fps)
}

function updateFlicker() {
  if (isFlickering) {
    // Schnelles An/Aus-Flackern (wie defekte Lampe)
    if (random() < 0.5) {
      flickerIntensity = 0.0; // Komplett aus
    } else {
      flickerIntensity = 1.0; // Komplett an
    }
    
    flickerDuration--;
    
    // Beende Flackern
    if (flickerDuration <= 0) {
      isFlickering = false;
      flickerIntensity = 1.0;
    }
  } else {
    // Normaler Zustand: volle Helligkeit
    flickerIntensity = 1.0;
  }
}

/************************************/
/* Glitch-Effekt                    */
/************************************/
function triggerGlitch() {
  isGlitching = true;
  glitchDuration = 20; // 20 Frames (~0.67 Sekunden bei 30fps)
}

function updateGlitch() {
  if (isGlitching) {
    // Chaotische Glitch-Werte jeden Frame
    glitchOffsetX = random(-50, 50);
    glitchOffsetY = random(-30, 30);
    glitchScale = random(0.85, 1.15); // Größenverzerrung
    glitchRotation = random(-0.1, 0.1); // Leichte Rotation
    
    glitchDuration--;
    
    // Beende Glitch
    if (glitchDuration <= 0) {
      isGlitching = false;
      glitchOffsetX = 0;
      glitchOffsetY = 0;
      glitchScale = 1.0;
      glitchRotation = 0;
    }
  } else {
    // Normaler Zustand: keine Verzerrung
    glitchOffsetX = 0;
    glitchOffsetY = 0;
    glitchScale = 1.0;
    glitchRotation = 0;
  }
}

/************************************/
/* Psychose-Effekt (3 Köpfe)        */
/************************************/
function checkPsychosisState() {
  // Berechne Position im 20-Kick-Zyklus (5 Kicks Pause + 15 Kicks Anzeige)
  let cyclePosition = kickCounter % 20;
  
  // Kicks 1-5: Psychose aus
  // Kicks 6-20: Psychose an
  if (cyclePosition >= 5 || cyclePosition === 0) {
    if (!isPsychosis) {
      isPsychosis = true;
      psychosisKickStart = kickCounter;
      console.log("PSYCHOSE START bei Kick:", kickCounter);
    }
  } else {
    if (isPsychosis) {
      isPsychosis = false;
      console.log("PSYCHOSE ENDE bei Kick:", kickCounter);
    }
  }
}

function triggerPsychosis() {
  // Diese Funktion wird nicht mehr benötigt, aber wir behalten sie für Kompatibilität
  isPsychosis = true;
  psychosisKickStart = kickCounter;
}

function updatePsychosis() {
  if (isPsychosis) {
    // Berechne Glitch-Stärke basierend auf Bass und Tiefen (sub_freq und low_freq)
    // Normalisiere die FFT-Werte (typischerweise 0-255) auf einen Bereich von 0-1
    let bassIntensity = map(sub_freq, 0, 255, 0, 1);
    let lowIntensity = map(low_freq, 0, 255, 0, 1);
    
    // Kombiniere beide Werte für die Gesamtstärke
    let glitchStrength = (bassIntensity + lowIntensity) / 2;
    
    // Verstärke die Effekte bei höheren Werten (quadratisch für mehr Dynamik)
    glitchStrength = pow(glitchStrength, 1.5);
    
    // Berechne maximale Glitch-Offsets basierend auf der Stärke
    let maxOffsetX = glitchStrength * 40; // Erhöht von 8 auf bis zu 40
    let maxOffsetY = glitchStrength * 25; // Erhöht von 5 auf bis zu 25
    
    // Glitch-Offsets für beide Köpfe (unabhängig voneinander)
    leftHeadGlitchX = random(-maxOffsetX, maxOffsetX);
    leftHeadGlitchY = random(-maxOffsetY, maxOffsetY);
    rightHeadGlitchX = random(-maxOffsetX, maxOffsetX);
    rightHeadGlitchY = random(-maxOffsetY, maxOffsetY);
  } else {
    leftHeadGlitchX = 0;
    leftHeadGlitchY = 0;
    rightHeadGlitchX = 0;
    rightHeadGlitchY = 0;
  }
}

function drawPsychosisHeads() {
  // Linker Kopf (dreht nach links)
  push();
  translate(-width * 0.3 + leftHeadGlitchX, leftHeadGlitchY, 0);
  drawLeftHead();
  pop();
  
  // Rechter Kopf (dreht nach rechts)
  push();
  translate(width * 0.3 + rightHeadGlitchX, rightHeadGlitchY, 0);
  drawRightHead();
  pop();
}

function drawLeftHead() {
  push();
  
  // Rotation NACH LINKS (entgegengesetzt zum Hauptkopf)
  rotateY(leftRotationY + ampAverage * 0.7);
  rotateX(sin(frameCount * 0.01) * 0.1);
  
  // Zeichne alle Dreiecke des linken Kopfes
  for (let i = 0; i < leftHeadTriangles.length; i++) {
    let tri = leftHeadTriangles[i];
    let v1 = leftHeadVertices[tri[0]];
    let v2 = leftHeadVertices[tri[1]];
    let v3 = leftHeadVertices[tri[2]];
    
    // Prüfe ob dieses Dreieck gerade gefüllt sein soll
    let shouldFill = false;
    let fillColor = color(255);
    
    for (let colored of leftColoredTriangles) {
      if (colored.index === i) {
        shouldFill = true;
        fillColor = colored.color;
        break;
      }
    }
    
    // Zeichne Dreieck
    if (shouldFill) {
      let flickeredColor = color(
        red(fillColor) * flickerIntensity,
        green(fillColor) * flickerIntensity,
        blue(fillColor) * flickerIntensity
      );
      fill(flickeredColor);
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 200 * flickerIntensity);
      strokeWeight(2);
    } else {
      noFill();
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 180 * flickerIntensity);
      strokeWeight(1.5);
    }
    
    // Animation
    let wobble = ampAverage * 30;
    let noise1 = noise(frameCount * 0.01 + tri[0]) * wobble;
    let noise2 = noise(frameCount * 0.01 + tri[1]) * wobble;
    let noise3 = noise(frameCount * 0.01 + tri[2]) * wobble;
    
    beginShape();
    vertex(v1.x + noise1, v1.y, v1.z);
    vertex(v2.x + noise2, v2.y, v2.z);
    vertex(v3.x + noise3, v3.y, v3.z);
    endShape(CLOSE);
  }
  
  pop();
}

function drawRightHead() {
  push();
  
  // Rotation NACH RECHTS (schneller als Hauptkopf)
  rotateY(rightRotationY + ampAverage * 0.7);
  rotateX(sin(frameCount * 0.01) * 0.1);
  
  // Zeichne alle Dreiecke des rechten Kopfes
  for (let i = 0; i < rightHeadTriangles.length; i++) {
    let tri = rightHeadTriangles[i];
    let v1 = rightHeadVertices[tri[0]];
    let v2 = rightHeadVertices[tri[1]];
    let v3 = rightHeadVertices[tri[2]];
    
    // Prüfe ob dieses Dreieck gerade gefüllt sein soll
    let shouldFill = false;
    let fillColor = color(255);
    
    for (let colored of rightColoredTriangles) {
      if (colored.index === i) {
        shouldFill = true;
        fillColor = colored.color;
        break;
      }
    }
    
    // Zeichne Dreieck
    if (shouldFill) {
      let flickeredColor = color(
        red(fillColor) * flickerIntensity,
        green(fillColor) * flickerIntensity,
        blue(fillColor) * flickerIntensity
      );
      fill(flickeredColor);
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 200 * flickerIntensity);
      strokeWeight(2);
    } else {
      noFill();
      stroke(255 * flickerIntensity, 255 * flickerIntensity, 255 * flickerIntensity, 180 * flickerIntensity);
      strokeWeight(1.5);
    }
    
    // Animation
    let wobble = ampAverage * 30;
    let noise1 = noise(frameCount * 0.01 + tri[0]) * wobble;
    let noise2 = noise(frameCount * 0.01 + tri[1]) * wobble;
    let noise3 = noise(frameCount * 0.01 + tri[2]) * wobble;
    
    beginShape();
    vertex(v1.x + noise1, v1.y, v1.z);
    vertex(v2.x + noise2, v2.y, v2.z);
    vertex(v3.x + noise3, v3.y, v3.z);
    endShape(CLOSE);
  }
  
  pop();
}

/************************************/
/* VHS Scan Lines                   */
/************************************/
function updateScanLines() {
  // Bewege Scan-Lines nach unten
  scanLineOffset += 1;
  if (scanLineOffset > 3) scanLineOffset = 0;
}

function drawScanLines() {
  push();
  
  // Wechsel zu 2D-Koordinaten
  camera(0, 0, (height/2.0) / tan(PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
  resetMatrix();
  
  stroke(255, 255, 255, 25); // Reduzierte Transparenz
  strokeWeight(1);
  
  // Horizontale Scan-Lines über den ganzen Canvas (weniger Linien)
  for (let y = -height/2 + scanLineOffset; y < height/2; y += 6) {
    line(-width/2, y, width/2, y);
  }
  
  pop();
}
