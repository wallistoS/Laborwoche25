let sounds = []; // Array für alle Sounds
let currentSoundIndex = -1;
let fft;
let amplitude;

// Text Eigenschaften - dynamisch basierend auf Musik-Intensität
let currentWord = 0;
let nextWord = 0;
let words = ["FLOATING", "DREAM", "FALLING", "NIGHTMARE"];
let textToDisplay = words[0];
let bars = [];
let lastWordChange = 0;
let wordChangeDuration = 1000; // 1 Sekunde Mindest-Delay zwischen Zustandswechseln
let transitionProgress = 0;
let isTransitioning = false;
let transitionDuration = 1000; // 1 Sekunde für smooth Morphing

// Wolken für DREAM-Zustand
let clouds = [];

// Kick Detection
let kickPulse = 0;
let lastKickTime = 0;

// Audio-Analyse für automatischen Zustandswechsel
let energyHistory = [];
let historyLength = 60; // 1 Sekunde bei 60fps

// Tracking für maximale Intensität pro Song
let maxIntensityThisSong = 0;
let songIntensityStats = [];
let isAnalyzingSongs = false;
let analysisComplete = false;
let analysisProgress = 0;

// Intensitäts-Schwellwerte für verschiedene Zustände
// 0: FLOATING (10-40%), 1: DREAM (40-65%), 2: FALLING (65-80%), 3: NIGHTMARE (80%+)
let wordThresholds = [
  { min: 0.10, max: 0.40, word: 0 },  // FLOATING
  { min: 0.40, max: 0.65, word: 1 },  // DREAM
  { min: 0.65, max: 0.80, word: 2 },  // FALLING
  { min: 0.80, max: 1.00, word: 3 }   // NIGHTMARE
];

// Raster
const barWidth = 3;
const spacing = 3;
const barStep = barWidth + spacing;
const textBarWidthMultiplier = 4; // Text-Balken sind 4x breiter

// Effekte
let pulseValue = 0;
let vibrateOffset = 0;
let glitchActive = false;
let glitchFrames = 0;
let floatOffset = 0; // Für FLOATING
let waveOffset = 0; // Für FALLING

function preload() {
  // Lade alle MP3-Dateien
  sounds.push(loadSound("./assets/LanaTechno.mp3"));
  sounds.push(loadSound("./assets/test.mp3"));
  sounds.push(loadSound("./assets/test2.mp3"));
  sounds.push(loadSound("./assets/Gonzi_BASSKILLER.mp3"));
  sounds.push(loadSound("./assets/katyperry.mp3"));
}

function setup() {
  createCanvas(1920, 450);
  frameRate(60);
  
  amplitude = new p5.Amplitude();
  fft = new p5.FFT(0.8, 1024);
  
  // Setze Lautstärke für alle Sounds auf Maximum
  for (let i = 0; i < sounds.length; i++) {
    sounds[i].setVolume(1.0);
  }
  
  // Initialisiere Balken-Raster und Wolken
  createBarGrid();
  createClouds();
  
  // Starte Song-Analyse
  console.log("Starting song analysis...");
  analyzeSongs();
}

function analyzeSongs() {
  isAnalyzingSongs = true;
  let currentAnalysisIndex = 0;
  let samplesPerSong = 100; // Anzahl der Samples pro Song
  let sampleInterval = 0; // Wird pro Song berechnet
  let currentSample = 0;
  let tempMaxIntensity = 0;
  
  function analyzeNextSample() {
    if (currentAnalysisIndex >= sounds.length) {
      // Analyse komplett
      isAnalyzingSongs = false;
      analysisComplete = true;
      console.log("\n=== SONG ANALYSIS COMPLETE ===");
      console.log("Results:");
      for (let stat of songIntensityStats) {
        console.log(`Song ${stat.songIndex + 1}: Max Intensity = ${stat.maxPercentage}%`);
      }
      
      // Finde globale maximale Intensität
      let globalMax = Math.max(...songIntensityStats.map(s => s.maxIntensity));
      console.log(`\nGlobal Maximum: ${(globalMax * 100).toFixed(1)}%`);
      if (globalMax < 0.80) {
        console.log(`⚠️ WARNING: No song reaches 80% (NIGHTMARE threshold)`);
        console.log(`Highest song only reaches ${(globalMax * 100).toFixed(1)}%`);
      }
      console.log("==============================\n");
      
      // Starte normales Playback
      playRandomSound();
      return;
    }
    
    let currentSound = sounds[currentAnalysisIndex];
    
    if (currentSample === 0) {
      // Starte neuen Song
      console.log(`Analyzing Song ${currentAnalysisIndex + 1}/${sounds.length}...`);
      tempMaxIntensity = 0;
      sampleInterval = currentSound.duration() / samplesPerSong;
      
      fft.setInput(currentSound);
      amplitude.setInput(currentSound);
      currentSound.play();
    }
    
    // Analysiere aktuellen Zeitpunkt
    let spectrum = fft.analyze();
    let level = amplitude.getLevel();
    let bass = fft.getEnergy("bass") / 255;
    let lowMid = fft.getEnergy("lowMid") / 255;
    let mid = fft.getEnergy("mid") / 255;
    let treble = fft.getEnergy("treble") / 255;
    
    let musicIntensity = (level * 0.4) + (bass * 0.3) + (mid * 0.2) + (treble * 0.1);
    
    if (musicIntensity > tempMaxIntensity) {
      tempMaxIntensity = musicIntensity;
    }
    
    currentSample++;
    analysisProgress = ((currentAnalysisIndex + (currentSample / samplesPerSong)) / sounds.length) * 100;
    
    if (currentSample >= samplesPerSong) {
      // Song-Analyse abgeschlossen
      currentSound.stop();
      songIntensityStats.push({
        songIndex: currentAnalysisIndex,
        maxIntensity: tempMaxIntensity,
        maxPercentage: (tempMaxIntensity * 100).toFixed(1)
      });
      console.log(`✓ Song ${currentAnalysisIndex + 1} analyzed - Max: ${(tempMaxIntensity * 100).toFixed(1)}%`);
      
      currentAnalysisIndex++;
      currentSample = 0;
      
      // Kleine Pause zwischen Songs
      setTimeout(analyzeNextSample, 100);
    } else {
      // Nächstes Sample
      setTimeout(analyzeNextSample, sampleInterval * 1000);
    }
  }
  
  analyzeNextSample();
}

function playRandomSound() {
  // Stoppe ALLE Sounds komplett und speichere Stats vom vorherigen Song
  for (let i = 0; i < sounds.length; i++) {
    if (i === currentSoundIndex && maxIntensityThisSong > 0) {
      // Speichere Stats für den Song, der gerade zu Ende geht
      songIntensityStats.push({
        songIndex: i,
        maxIntensity: maxIntensityThisSong,
        maxPercentage: (maxIntensityThisSong * 100).toFixed(1)
      });
      console.log(`Song ${i + 1} finished - Max Intensity: ${(maxIntensityThisSong * 100).toFixed(1)}%`);
    }
    sounds[i].stop();
    // Entferne alle Event Listener
    sounds[i].onended(() => {});
  }
  
  // Reset für neuen Song
  maxIntensityThisSong = 0;
  
  // Wähle zufälligen Song (0-4)
  currentSoundIndex = floor(random(sounds.length));
  
  // Hole aktuellen Sound
  let currentSound = sounds[currentSoundIndex];
  
  // Setze FFT und Amplitude Input
  fft.setInput(currentSound);
  amplitude.setInput(currentSound);
  
  console.log(`Now playing: Song ${currentSoundIndex + 1}/${sounds.length}`);
  
  // Spiele Sound ab
  currentSound.play();
}

function createBarGrid() {
  bars = [];
  
  // Temporäres Graphics-Objekt für Text mit willReadFrequently
  let pg = createGraphics(width, height);
  pg.drawingContext.willReadFrequently = true; // Performance-Optimierung
  pg.background(0);
  pg.textAlign(CENTER, CENTER);
  pg.textSize(250);
  pg.textFont('Arial Black');
  pg.fill(255);
  pg.text(textToDisplay, width/2, height/2);
  
  // Debug: Zeige was gerendert wurde
  // console.log(`Creating bars for: ${textToDisplay}`);
  
  // Erstelle Balken-Raster
  for (let x = 0; x < width; x += barStep) {
    // Prüfe ob dieser Balken Teil der Schrift ist
    let textSegments = [];
    let inText = false;
    let segmentStart = 0;
    
    // Von oben nach unten scannen
    for (let y = 0; y < height; y++) {
      let pixelColor = pg.get(x, y);
      let brightness = (pixelColor[0] + pixelColor[1] + pixelColor[2]) / 3;
      
      if (brightness > 128 && !inText) {
        // Text-Segment beginnt
        segmentStart = y;
        inText = true;
      } else if (brightness <= 128 && inText) {
        // Text-Segment endet
        textSegments.push({
          yStart: segmentStart,
          yEnd: y,
          height: y - segmentStart
        });
        inText = false;
      }
    }
    
    // Falls Segment am Ende noch offen
    if (inText) {
      textSegments.push({
        yStart: segmentStart,
        yEnd: height,
        height: height - segmentStart
      });
    }
    
    bars.push({
      x: x,
      isText: textSegments.length > 0,
      textSegments: textSegments,
      phase: random(TWO_PI),
      glitchOffsetX: 0,
      glitchOffsetY: 0
    });
  }
  
  // Debug: Zähle Text-Balken
  // let textBarCount = bars.filter(b => b.isText).length;
  // console.log(`Total bars: ${bars.length}, Text bars: ${textBarCount}`);
  
  pg.remove();
}

function createClouds() {
  clouds = [];
  let numClouds = 8;
  
  for (let i = 0; i < numClouds; i++) {
    // Erstelle Wolke mit festen Bump-Positionen
    let cloudSize = random(80, 200);
    let numBumps = 7 + floor(cloudSize / 50);
    let bumps = [];
    
    // Generiere feste Bump-Struktur
    for (let j = 0; j < numBumps; j++) {
      let angle = (j / numBumps) * TWO_PI;
      bumps.push({
        angle: angle,
        size: random(0.25, 0.65), // Relative Größe
        distance: 0.3 + sin(angle * 2) * 0.2, // Relative Distanz
        phaseOffset: random(TWO_PI) // Für subtile Animation
      });
    }
    
    clouds.push({
      x: random(width),
      y: random(height),
      size: cloudSize,
      speed: random(0.3, 0.8),
      opacity: random(40, 90),
      phase: random(TWO_PI),
      bumps: bumps, // Feste Struktur
      colorPhase: random(TWO_PI) // Für sanfte Farbänderung
    });
  }
}

function mousePressed() {
  // Bei Klick: Neuen zufälligen Song starten (nur wenn Analyse fertig)
  if (analysisComplete && !isAnalyzingSongs) {
    playRandomSound();
  }
}

function keyPressed() {
  // Leertaste oder N: Neuen zufälligen Song (nur wenn Analyse fertig)
  if ((key === ' ' || key === 'n' || key === 'N') && analysisComplete && !isAnalyzingSongs) {
    playRandomSound();
  }
}

function draw() {
  // Schwarzer Hintergrund
  background(0);
  
  // Zeige Analyse-Fortschritt
  if (isAnalyzingSongs) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Analyzing Songs...", width / 2, height / 2 - 30);
    textSize(24);
    text(`${analysisProgress.toFixed(0)}%`, width / 2, height / 2 + 20);
    
    // Fortschrittsbalken
    noFill();
    stroke(255);
    strokeWeight(2);
    rect(width / 2 - 200, height / 2 + 60, 400, 20);
    fill(100, 200, 255);
    noStroke();
    rect(width / 2 - 200, height / 2 + 60, 400 * (analysisProgress / 100), 20);
    
    return; // Nichts anderes zeichnen während Analyse
  }
  
  if (!analysisComplete) {
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Click to start analysis", width / 2, height / 2);
    return;
  }
  
  // Prüfe ob aktueller Sound zu Ende ist, dann nächsten spielen
  if (currentSoundIndex >= 0 && sounds[currentSoundIndex] && !sounds[currentSoundIndex].isPlaying()) {
    // Warte einen Frame bevor neuer Song startet
    if (frameCount % 60 === 0) { // Nur einmal pro Sekunde prüfen
      playRandomSound();
    }
  }
  
  // Audio-Analyse - nur wenn Sound läuft
  let bass = 0;
  let lowMid = 0;
  let mid = 0;
  let treble = 0;
  let lowFreq = 0;
  let isBeat = false;
  let musicIntensity = 0;
  
  if (currentSoundIndex >= 0 && sounds[currentSoundIndex] && sounds[currentSoundIndex].isPlaying()) {
    let spectrum = fft.analyze();
    let level = amplitude.getLevel();
    bass = fft.getEnergy("bass");
    lowMid = fft.getEnergy("lowMid");
    mid = fft.getEnergy("mid");
    treble = fft.getEnergy("treble");
    
    // Normalisierte Werte - Focus auf tiefe Frequenzen
    let bassNormalized = bass / 255;
    let lowMidNormalized = lowMid / 255;
    let midNormalized = mid / 255;
    let trebleNormalized = treble / 255;
    
    lowFreq = (bassNormalized + lowMidNormalized) / 2;
    
    // Musik-Intensität: Kombination aus Level und allen Frequenzen
    musicIntensity = (level * 0.4) + (bassNormalized * 0.3) + (midNormalized * 0.2) + (trebleNormalized * 0.1);
    
    // Kick Detection - nur tiefe Bass-Frequenzen (20-60 Hz)
    let kickSpectrum = fft.analyze();
    let kickEnergy = 0;
    for (let i = 1; i < 5; i++) { // Tiefe Frequenzen
      kickEnergy += kickSpectrum[i];
    }
    kickEnergy = kickEnergy / (4 * 255);
    
    // Starker Kick bei hoher Energie + Mindestabstand von 200ms
    if (kickEnergy > 0.7 && millis() - lastKickTime > 200) {
      kickPulse = 1.0;
      lastKickTime = millis();
    }
    
    // Beat Detection basierend auf Bass
    isBeat = lowFreq > 0.6;
    
    // Kick-Puls abklingen lassen
    kickPulse *= 0.85;
    
    // Speichere Intensität in History
    energyHistory.push(musicIntensity);
    if (energyHistory.length > historyLength) {
      energyHistory.shift();
    }
    
    // Berechne durchschnittliche Intensität
    let avgIntensity = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    
    // Tracke maximale Intensität für aktuellen Song
    if (avgIntensity > maxIntensityThisSong) {
      maxIntensityThisSong = avgIntensity;
    }
    
    // Bestimme Ziel-Zustand basierend auf Intensität
    let targetWord = 0; // Default: FLOATING
    for (let i = 0; i < wordThresholds.length; i++) {
      if (avgIntensity >= wordThresholds[i].min && avgIntensity < wordThresholds[i].max) {
        targetWord = wordThresholds[i].word;
        break;
      }
    }
    // Falls über 80% → NIGHTMARE
    if (avgIntensity >= 0.80) targetWord = 3; // NIGHTMARE
    
    // Wechsel nur wenn genug Zeit vergangen und Zustand sich ändert
    if (!isTransitioning && 
        currentWord !== targetWord && 
        millis() - lastWordChange > wordChangeDuration) {
      isTransitioning = true;
      transitionProgress = 0;
      nextWord = targetWord; // Speichere Ziel-Zustand
      lastWordChange = millis();
    }
  }
  
  // Übergangs-Animation mit smoothem Morphing
  if (isTransitioning) {
    transitionProgress = (millis() - lastWordChange) / transitionDuration;
    
    if (transitionProgress >= 1) {
      transitionProgress = 1;
      isTransitioning = false;
      currentWord = nextWord; // Wechsel zum neuen Zustand
      textToDisplay = words[currentWord];
      createBarGrid(); // Neues Raster nur am Ende
    }
  }
  
  // Easing für Übergang
  let easeProgress = easeInOutCubic(transitionProgress);
  
  // Puls-Wert für smooth animation
  pulseValue = lerp(pulseValue, isBeat ? 1 : 0, 0.15);
  
  // Zeichne Balken-Raster mit Effekten je nach Zustand
  // Einfaches Rendering - nur ein Zustand, smooth fade während Transition
  if (currentWord === 0) {
    drawFloatingBars(lowFreq, isBeat, easeProgress);
  } else if (currentWord === 1) {
    drawDreamBars(lowFreq, isBeat, easeProgress);
  } else if (currentWord === 2) {
    drawFallingBars(lowFreq, isBeat, easeProgress);
  } else {
    drawNightmareBars(lowFreq, isBeat, easeProgress);
  }
  
  // Debug Info - EINGESCHALTET für Debugging
  let avgIntensity = energyHistory.length > 0 
    ? energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length 
    : 0;
  
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  let playingStatus = currentSoundIndex >= 0 && sounds[currentSoundIndex] && sounds[currentSoundIndex].isPlaying() ? "PLAYING" : "STOPPED";
  text(`State: ${words[currentWord]} | Intensity: ${(avgIntensity * 100).toFixed(0)}% | MAX: ${(maxIntensityThisSong * 100).toFixed(1)}% | ${playingStatus} | Click or [Space] for random song`, 10, 10);
//   let playingStatus = (currentSoundIndex >= 0 && sounds[currentSoundIndex].isPlaying()) ? 'Playing' : 'Stopped';
//   let currentSongName = currentSoundIndex >= 0 ? songNames[currentSoundIndex] : 'None';
//   text(`${textToDisplay} | Song: ${currentSongName} (${currentSoundIndex + 1}/${sounds.length}) | Intensity: ${(avgIntensity * 100).toFixed(0)}% | Beat: ${isBeat}`, 10, 10);
//   text(`FLOATING: 20-30% | DREAM: 30-45% | FALLING: 45-60% | NIGHTMARE: 60%+ | ${playingStatus} | Click or [Space] for random song`, 10, 25);
}

function drawFloatingBars(lowFreq, isBeat, transitionEase) {
  // FLOATING: Sanftes, schwebendes Auf und Ab - reagiert auf Beat
  
  floatOffset += 0.02 + lowFreq * 0.05; // Geschwindigkeit reagiert auf Bass
  let floatIntensity = 15 + lowFreq * 20; // Intensität reagiert auf Bass
  
  // HINTERGRUND: Wellige vertikale Linien (wie Vorhänge im Wind) - SICHTBARER
  push();
  // Lila/Türkis Gradient
  strokeWeight(2); // Dicker
  noFill();
  
  let numLines = 40;
  for (let i = 0; i < numLines; i++) {
    let x = (width / numLines) * i;
    let waveAmplitude = 20 + lowFreq * 15;
    
    // Farbverlauf zwischen Lila und Türkis
    let t = i / numLines;
    let r = lerp(150, 80, t);   // Lila -> Türkis
    let g = lerp(80, 180, t);   // Lila -> Türkis
    let b = lerp(200, 220, t);  // Lila -> Türkis
    stroke(r, g, b, 150);
    
    beginShape();
    for (let y = 0; y < height; y += 10) {
      let waveX = sin(floatOffset * 0.3 + y * 0.02 + i * 0.3) * waveAmplitude;
      vertex(x + waveX, y);
    }
    endShape();
  }
  pop();
  
  // Text-Balken
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Kick-Reaktion: Starker Puls
        let kickScale = 1 + kickPulse * 0.4;
        
        // Pulsieren reagiert auf Bass - REDUZIERT für Lesbarkeit
        let pulseScale = 1 + lowFreq * 0.3; // War 0.6
        if (isBeat) pulseScale *= 1.1; // War 1.2
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale * kickScale;
        
        // Schwebendes Auf und Ab - REDUZIERT für Lesbarkeit
        let floatY = sin(floatOffset + bar.phase) * (floatIntensity * 0.6); // Reduziert auf 60%
        
        let x = bar.x;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert leicht mit Bass
        let heightScale = 1 + lowFreq * 0.15 + kickPulse * 0.3; // Reduziert + Kick
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter - textBarHeight/2 + floatY;
        
        // ROTATION - sanft, zum Beat
        let rotation = sin(floatOffset * 0.8 + bar.phase) * 0.05 + lowFreq * 0.08;
        translate(x, y + textBarHeight/2);
        rotate(rotation);
        
        // Weiße Farbe mit sanftem Glow
        fill(255, 255, 255);
        noStroke();
        
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        // Position angepasst wegen Rotation
        rect(-textBarWidth/2, -textBarHeight/2, textBarWidth, textBarHeight);
        
        // Glow verstärkt sich bei Beat
        if (!isTransitioning) {
          let glowAlpha = 50 + lowFreq * 80;
          if (isBeat) glowAlpha += 50;
          fill(255, 255, 255, glowAlpha);
          rect(-textBarWidth/2 - 3, -textBarHeight/2 - 3, textBarWidth + 6, textBarHeight + 6);
        }
        
        pop();
      }
    }
  }
}

function drawDreamBars(lowFreq, isBeat, transitionEase) {
  // DREAM: Vibrierende, pulsierende Balken - reagiert auf Beat
  
  vibrateOffset += 0.08 + lowFreq * 0.1;
  let vibrateIntensity = lowFreq * 8;
  
  // HINTERGRUND: Schwebende Wolken - SICHTBARER & REALISTISCHER
  push();
  noStroke();
  
  for (let cloud of clouds) {
    // Bewege Wolken smooth
    cloud.x += cloud.speed + lowFreq * 0.5;
    if (cloud.x > width + cloud.size * 1.5) {
      cloud.x = -cloud.size * 1.5;
      cloud.y = random(height);
    }
    
    // Sehr sanfte vertikale Schwingung
    let floatY = sin(vibrateOffset * 0.3 + cloud.phase) * 15; // Langsamer und weniger
    
    // Zeichne realistische Wolke mit Lila/Türkis-Tönen
    let baseY = cloud.y + floatY;
    let baseSize = cloud.size;
    
    // Sanfte Farbänderung über Zeit
    cloud.colorPhase += 0.001;
    let colorMix = (sin(cloud.colorPhase) * 0.5 + 0.5); // 0-1
    let r = lerp(180, 100, colorMix);   // Helles Lila -> Türkis
    let g = lerp(130, 200, colorMix);   // Lila -> Türkis
    let b = lerp(220, 230, colorMix);   // Lila -> Türkis
    
    // Mehrere Schichten für Tiefe und Weichheit
    for (let layer = 0; layer < 4; layer++) {
      let layerAlpha = cloud.opacity * (2.0 - layer * 0.35);
      let layerBrightness = 1 - layer * 0.12;
      fill(r * layerBrightness, g * layerBrightness, b * layerBrightness, layerAlpha);
      
      // Verwende feste Bump-Struktur (kein random mehr!)
      for (let bump of cloud.bumps) {
        let bumpSize = baseSize * bump.size * (1 - layer * 0.1);
        let offsetDist = baseSize * bump.distance * (1 - layer * 0.15);
        
        let bumpX = cloud.x + cos(bump.angle) * offsetDist;
        let bumpY = baseY + sin(bump.angle) * offsetDist * 0.6; // Flacher
        
        // Sehr subtile, langsame Animation
        let pulse = sin(vibrateOffset * 0.15 + bump.phaseOffset) * 0.03 + 1;
        
        // Smooth Ellipsen
        ellipse(bumpX, bumpY, bumpSize * pulse, bumpSize * 0.75 * pulse);
      }
    }
    
    // Subtile Schatten für Tiefe
    fill(0, 0, 0, cloud.opacity * 0.15);
    for (let bump of cloud.bumps) {
      if (bump.angle > PI * 0.3 && bump.angle < PI * 1.7) { // Untere Hälfte
        let bumpSize = baseSize * bump.size * 0.7;
        let offsetDist = baseSize * bump.distance;
        let bumpX = cloud.x + cos(bump.angle) * offsetDist;
        let bumpY = baseY + sin(bump.angle) * offsetDist * 0.6 + 5;
        ellipse(bumpX, bumpY, bumpSize * 0.8, bumpSize * 0.5);
      }
    }
    
    // Highlight-Akzente (hellere Bereiche) - FEST positioniert
    fill(255, 255, 255, cloud.opacity * 0.5);
    // Haupthighlight oben links
    ellipse(cloud.x - baseSize * 0.15, baseY - baseSize * 0.1, baseSize * 0.3, baseSize * 0.18);
    // Sekundäres Highlight
    ellipse(cloud.x + baseSize * 0.1, baseY - baseSize * 0.05, baseSize * 0.2, baseSize * 0.12);
    // Tertiäres Highlight
    ellipse(cloud.x - baseSize * 0.25, baseY + baseSize * 0.05, baseSize * 0.15, baseSize * 0.1);
  }
  pop();
  
  // Text-Balken
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Kick-Reaktion: Starker Puls
        let kickScale = 1 + kickPulse * 0.5;
        
        // Puls-Effekt: Breite ändert sich mit Bass - REDUZIERT für Lesbarkeit
        let pulseScale = 1 + lowFreq * 0.6; // War 1.2
        if (isBeat) pulseScale *= 1.15; // War 1.3
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale * kickScale;
        
        // Vibrations-Offset - REDUZIERT für Lesbarkeit
        let vibrateX = sin(vibrateOffset + bar.phase) * (vibrateIntensity * 0.5); // 50% weniger
        let vibrateY = cos(vibrateOffset * 1.3 + bar.phase) * (vibrateIntensity * 0.3); // 40% weniger
        
        // Position mit Vibration (zentriert auf dem dünnen Strich)
        let x = bar.x + vibrateX;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // ROTATION - vibrierend - REDUZIERT
        let rotation = sin(vibrateOffset * 0.7 + bar.phase) * 0.04 + lowFreq * 0.06; // Reduziert
        
        // Höhe pulsiert auch leicht
        let heightScale = 1 + lowFreq * 0.2 + kickPulse * 0.3; // Reduziert + Kick
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter + vibrateY;
        
        translate(x, y);
        rotate(rotation);
        
        // Weiße Farbe - SEHR HELL
        fill(255, 255, 255);
        noStroke();
        
        // Übergangseffekt
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        rect(-textBarWidth/2, -textBarHeight/2, textBarWidth, textBarHeight);
        
        // Glow bei Beat
        if (isBeat && !isTransitioning) {
          fill(255, 255, 255, 100);
          rect(-textBarWidth/2 - 4, -textBarHeight/2 - 4, textBarWidth + 8, textBarHeight + 8);
        }
        
        pop();
      }
    }
  }
}

function drawFallingBars(lowFreq, isBeat, transitionEase) {
  // FALLING: Wellen-Effekt als würde man fallen + Vibration - reagiert auf Beat
  
  waveOffset += 0.1 + lowFreq * 0.15; // Langsamer - reduziert
  let waveIntensity = 12 + lowFreq * 18; // Weniger intensiv - halbiert
  let waveFrequency = 0.008; // Wellenfrequenz über X-Achse
  
  // Vibrations-Offset wie bei DREAM - aber reduziert
  vibrateOffset += 0.2 + lowFreq * 0.2;
  let vibrateIntensity = lowFreq * 6; // Vibration reduziert
  
  // HINTERGRUND: Vertikale Motion Blur Streifen (Fallbewegung) - SICHTBARER & LILA/TÜRKIS
  push();
  noStroke();
  
  let numStripes = 30;
  for (let i = 0; i < numStripes; i++) {
    let x = (width / numStripes) * i + random(-5, 5);
    let fallSpeed = 5 + lowFreq * 10;
    let stripeHeight = 100 + lowFreq * 150;
    let yOffset = (waveOffset * fallSpeed * 3) % (height + stripeHeight);
    
    // Lila/Türkis Farbverlauf
    let t = (i / numStripes + frameCount * 0.001) % 1;
    let r = lerp(160, 90, t);    // Lila -> Türkis
    let g = lerp(100, 190, t);   // Lila -> Türkis
    let b = lerp(210, 225, t);   // Lila -> Türkis
    
    // Gradient-Effekt für Motion Blur - HELLER
    for (let j = 0; j < 3; j++) {
      let alpha = 80 - j * 20; // War 50-15
      fill(r, g, b, alpha);
      rect(x, yOffset - j * 30, random(3, 10), stripeHeight); // Breitere Streifen
    }
  }
  pop();
  
  // Text-Balken
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Kick-Reaktion: Starker Puls
        let kickScale = 1 + kickPulse * 0.45;
        
        // Pulsieren bei Bass - moderat - REDUZIERT für Lesbarkeit
        let pulseScale = 1 + lowFreq * 0.4; // War 0.6
        if (isBeat) pulseScale *= 1.1; // War 1.15
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale * kickScale;
        
        // Wellen-Effekt: Vertikale Bewegung - STARK REDUZIERT für Lesbarkeit
        let waveY = sin(waveOffset + bar.x * waveFrequency) * (waveIntensity * 0.4); // 60% weniger
        waveY += cos(waveOffset * 1.3 + bar.x * waveFrequency * 0.7) * (waveIntensity * 0.2); // 50% weniger
        
        // VIBRATION - REDUZIERT
        let vibrateX = sin(vibrateOffset + bar.phase) * (vibrateIntensity * 0.4); // 60% weniger
        let vibrateY = cos(vibrateOffset * 1.4 + bar.phase) * (vibrateIntensity * 0.2); // 33% weniger
        
        // ROTATION - REDUZIERT
        let rotation = sin(waveOffset * 0.6 + bar.phase) * 0.04 + lowFreq * 0.07; // Reduziert
        
        // Kombiniere Wellen und Vibration
        let x = bar.x + vibrateX;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert mit Bass - moderat
        let heightScale = 1 + lowFreq * 0.15 + kickPulse * 0.3; // Reduziert + Kick
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter + waveY + vibrateY;
        
        translate(x, y);
        rotate(rotation);
        
        // Weiße Farbe
        fill(255, 255, 255);
        noStroke();
        
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        rect(-textBarWidth/2, -textBarHeight/2, textBarWidth, textBarHeight);
        
        // Glow bei Bass und stärkeren Wellen
        if (!isTransitioning && (isBeat || abs(waveY) > waveIntensity * 0.5)) {
          let glowAlpha = 60 + lowFreq * 60; // Reduziert
          fill(255, 255, 255, glowAlpha);
          rect(-textBarWidth/2 - 3, -textBarHeight/2 - 3, textBarWidth + 6, textBarHeight + 6);
        }
        
        pop();
      }
    }
  }
}

function drawNightmareBars(lowFreq, isBeat, transitionEase) {
  // NIGHTMARE: Horror-Glitch - auf Kicks abgestimmt, subtiler
  
  // Glitch aktiviert sich NUR bei Kicks (Beats) - seltener
  if (isBeat && random(1) > 0.5) { // Nur 50% der Kicks
    glitchActive = true;
    glitchFrames = frameCount;
  }
  
  // Glitch dauert kürzer - besser lesbar
  let glitchDuration = 3 + lowFreq * 4; // 3-7 Frames - kürzer
  if (glitchActive && frameCount - glitchFrames > glitchDuration) {
    glitchActive = false;
  }
  
  // Bei Glitch: Reduzierte Offsets - Text bleibt lesbarer
  if (glitchActive) {
    let glitchStrength = 5 + lowFreq * 8; // War 8-12, jetzt 5-13 aber durchschnittlich weniger
    for (let bar of bars) {
      bar.glitchOffsetX = random(-glitchStrength, glitchStrength);
      bar.glitchOffsetY = random(-glitchStrength/4, glitchStrength/4); // War /3
    }
  } else {
    // Schneller zurück zu 0 - glattere Übergänge
    for (let bar of bars) {
      bar.glitchOffsetX = lerp(bar.glitchOffsetX, 0, 0.6);
      bar.glitchOffsetY = lerp(bar.glitchOffsetY, 0, 0.6);
    }
  }
  
  // HINTERGRUND: Statisches Rauschen (TV-Schnee) - SICHTBARER & LILA/TÜRKIS
  push();
  let noiseIntensity = glitchActive ? 120 : 50 + lowFreq * 60; // Höhere Base-Intensity
  
  // Zeichne statische Pixel - MEHR - in Lila/Türkis
  for (let i = 0; i < 1200; i++) { // War 800
    let x = random(width);
    let y = random(height);
    
    // Lila/Türkis Mix
    if (random(1) > 0.5) {
      // Lila-Töne
      let brightness = random(120, 200);
      stroke(brightness, brightness * 0.6, brightness * 1.1, random(noiseIntensity));
    } else {
      // Türkis-Töne
      let brightness = random(100, 180);
      stroke(brightness * 0.6, brightness * 1.1, brightness * 1.2, random(noiseIntensity));
    }
    
    strokeWeight(random(1, 3));
    point(x, y);
  }
  
  // Bei Glitch: Mehr Rauschen
  if (glitchActive) {
    for (let i = 0; i < 600; i++) { // War 400
      let x = random(width);
      let y = random(height);
      
      // Intensivere Lila/Türkis bei Glitch
      if (random(1) > 0.5) {
        stroke(180, 120, 220, random(80, 150));
      } else {
        stroke(100, 200, 230, random(80, 150));
      }
      
      strokeWeight(random(1, 4));
      point(x, y);
    }
  }
  pop();
  
  // RGB-Split bei aktivem Glitch - REDUZIERT
  if (glitchActive) {
    // Subtilerer RGB-Split
    let rgbSplitStrength = 4 + lowFreq * 6; // Viel weniger Offset
    for (let layer = 0; layer < 3; layer++) {
      let layerOffsetX = (layer - 1) * rgbSplitStrength;
      let layerOffsetY = (layer - 1) * (rgbSplitStrength * 0.3);
      
      for (let i = 0; i < bars.length; i++) {
        let bar = bars[i];
        
        if (bar.isText) {
          for (let segment of bar.textSegments) {
            push();
            
            // Kick-Reaktion im RGB-Split Modus
            let kickScale = 1 + kickPulse * 0.3;
            
            // Weniger Pulsieren
            let pulseScale = 1 + lowFreq * 0.2; // War 0.3
            let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale * kickScale;
            let textBarHeight = segment.height * (1 + kickPulse * 0.2);
            let x = bar.x + bar.glitchOffsetX + layerOffsetX;
            let segmentCenter = (segment.yStart + segment.yEnd) / 2;
            let y = segmentCenter + bar.glitchOffsetY + layerOffsetY;
            
            // Glitch-Rotation - ruckartig - REDUZIERT
            let rotation = glitchActive ? random(-0.1, 0.1) : 0; // War -0.15 bis 0.15
            translate(x, y);
            rotate(rotation);
            
            // Farben: Blau/Türkis/Lila/Violett
            let alphaBoost = lowFreq * 30;
            if (layer === 0) {
              // Zufällige Farbe aus Palette
              let colors = [
                {r: 100, g: 150, b: 255}, // Blau
                {r: 100, g: 200, b: 255}, // Türkis
                {r: 180, g: 100, b: 255}, // Lila
                {r: 200, g: 100, b: 255}  // Violett
              ];
              let col = colors[floor(random(colors.length))];
              fill(col.r, col.g, col.b, 140 + alphaBoost);
            } else if (layer === 1) {
              fill(255, 255, 255, 160 + alphaBoost); // Weiß
            } else {
              fill(200, 200, 200, 120 + alphaBoost); // Hellgrau
            }
            noStroke();
            
            rect(-textBarWidth/2, -textBarHeight/2, textBarWidth, textBarHeight);
            
            pop();
          }
        }
      }
    }
  } else {
    // Normale Darstellung - Text-Balken ohne RGB-Split
    for (let i = 0; i < bars.length; i++) {
      let bar = bars[i];
      
      if (bar.isText) {
        for (let segment of bar.textSegments) {
          push();
          
          // Kick-Reaktion: Starker Puls
          let kickScale = 1 + kickPulse * 0.5;
          
          // Moderates Pulsieren mit Bass - REDUZIERT für Lesbarkeit
          let pulseScale = 1 + lowFreq * 0.3; // War 0.5
          if (isBeat) pulseScale *= 1.05; // War 1.1
          let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale * kickScale;
          let textBarHeight = segment.height * (1 + kickPulse * 0.3);
          let x = bar.x + bar.glitchOffsetX;
          let segmentCenter = (segment.yStart + segment.yEnd) / 2;
          let y = segmentCenter + bar.glitchOffsetY;
          
          // Leichte zitternde Rotation - REDUZIERT
          let rotation = sin(frameCount * 0.1 + bar.phase) * 0.02 + lowFreq * 0.03; // War 0.03 + 0.05
          translate(x, y);
          rotate(rotation);
          
          // Farbliche Akzente: Blau/Türkis/Lila/Violett
          if (lowFreq > 0.7 && random(1) > 0.85) { // Seltener und nur bei sehr starkem Bass
            // Zufällige Farbe aus Palette
            let colors = [
              {r: 180, g: 200, b: 255}, // Helles Blau
              {r: 150, g: 230, b: 255}, // Helles Türkis
              {r: 220, g: 180, b: 255}, // Helles Lila
              {r: 230, g: 180, b: 255}  // Helles Violett
            ];
            let col = colors[floor(random(colors.length))];
            fill(col.r, col.g, col.b);
          } else {
            fill(255, 255, 255); // Weiß
          }
          noStroke();
          
          // Übergangseffekt
          if (isTransitioning) {
            let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
            fill(255, 255, 255, alpha);
          }
          
          rect(-textBarWidth/2, -textBarHeight/2, textBarWidth, textBarHeight);
          
          pop();
        }
      }
    }
  }
  
  // Reduzierte Glitch-Streifen - subtiler
  if (glitchActive && random(1) > 0.5) { // Nur 50% der Zeit
    push();
    let numStripes = 3 + lowFreq * 5; // Weniger Streifen
    for (let i = 0; i < numStripes; i++) {
      let y = random(height);
      let h = random(3, 15 + lowFreq * 15); // Kleinere Streifen
      let offsetX = random(-20, 20);
      
      if (random(1) > 0.7) {
        // Zufällige Farbe aus Palette
        let colors = [
          {r: 100, g: 150, b: 255}, // Blau
          {r: 100, g: 200, b: 255}, // Türkis
          {r: 180, g: 100, b: 255}, // Lila
          {r: 200, g: 100, b: 255}  // Violett
        ];
        let col = colors[floor(random(colors.length))];
        fill(col.r, col.g, col.b, 40 + lowFreq * 40);
      } else {
        fill(255, 255, 255, 30 + lowFreq * 30); // Sehr transparent
      }
      noStroke();
      rect(offsetX, y, width, h);
    }
    pop();
  }
  
  // Subtilere Scanlines - nur bei sehr starkem Bass - in Blau/Türkis/Lila/Violett
  if (lowFreq > 0.5) {
    push();
    // Zufällige Farbe aus Palette
    let colors = [
      {r: 100, g: 150, b: 255}, // Blau
      {r: 100, g: 200, b: 255}, // Türkis
      {r: 180, g: 100, b: 255}, // Lila
      {r: 200, g: 100, b: 255}  // Violett
    ];
    let col = colors[floor(random(colors.length))];
    stroke(col.r, col.g, col.b, lowFreq * 40);
    strokeWeight(1);
    let lineSpacing = 4; // Weniger dicht
    for (let y = 0; y < height; y += lineSpacing) {
      line(0, y, width, y);
    }
    pop();
  }
  
  // Kein Screen Shake mehr - war zu intensiv
}

function easeInOutCubic(t) {
  return t < 0.5 
    ? 4 * t * t * t 
    : 1 - pow(-2 * t + 2, 3) / 2;
}

function windowResized() {
  // Canvas-Größe bleibt fix bei 1920x450
}
