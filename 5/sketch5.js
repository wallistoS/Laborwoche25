let sounds = []; // Array für alle Sounds
let currentSoundIndex = -1;
let fft;
let amplitude;

// Text Eigenschaften - dynamisch basierend auf Musik-Intensität
let currentWord = 0;
let words = ["FLOATING", "DREAM", "FALLING", "NIGHTMARE"];
let textToDisplay = words[0];
let bars = [];
let lastWordChange = 0;
let wordChangeDuration = 0; // Kein Minimum - Echtzeit-Wechsel
let transitionProgress = 0;
let isTransitioning = false;
let transitionDuration = 300; // 0.3 Sekunden schneller Übergang

// Audio-Analyse für automatischen Zustandswechsel
let energyHistory = [];
let historyLength = 60; // 1 Sekunde bei 60fps

// Intensitäts-Schwellwerte für verschiedene Zustände
// 0: FLOATING (10-35%), 1: DREAM (35-55%), 2: FALLING (55-75%), 3: NIGHTMARE (70%+)
let intensityRanges = [
  { min: 0.10, max: 0.35, word: 0 },  // FLOATING
  { min: 0.35, max: 0.60, word: 1 },  // DREAM
  { min: 0.60, max: 0.80, word: 2 },  // FALLING
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
  
  // Initialisiere Balken-Raster
  createBarGrid();
  
  // Starte mit zufälligem Song
  playRandomSound();
}

function playRandomSound() {
  // Stoppe ALLE Sounds komplett
  for (let i = 0; i < sounds.length; i++) {
    sounds[i].stop();
    // Entferne alle Event Listener
    sounds[i].onended(() => {});
  }
  
  // Wähle zufälligen Song (0-4)
  currentSoundIndex = floor(random(sounds.length));
  
  // Hole aktuellen Sound
  let currentSound = sounds[currentSoundIndex];
  
  // Setze FFT und Amplitude Input
  fft.setInput(currentSound);
  amplitude.setInput(currentSound);
  
  console.log(`Playing: Song ${currentSoundIndex + 1}/${sounds.length}`);
  
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
  console.log(`Creating bars for: ${textToDisplay}`);
  
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
  let textBarCount = bars.filter(b => b.isText).length;
  console.log(`Total bars: ${bars.length}, Text bars: ${textBarCount}`);
  
  pg.remove();
}

function mousePressed() {
  // Bei Klick: Neuen zufälligen Song starten
  playRandomSound();
}

function keyPressed() {
  // Leertaste oder N: Neuen zufälligen Song
  if (key === ' ' || key === 'n' || key === 'N') {
    playRandomSound();
  }
}

function draw() {
  // Schwarzer Hintergrund
  background(0);
  
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
    
    // Beat Detection basierend auf Bass
    isBeat = lowFreq > 0.6;
    
    // Speichere Intensität in History
    energyHistory.push(musicIntensity);
    if (energyHistory.length > historyLength) {
      energyHistory.shift();
    }
    
    // Berechne durchschnittliche Intensität
    let avgIntensity = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    
    // Bestimme Ziel-Zustand basierend auf Intensität
    let targetWord = 0; // Default: FLOATING
    for (let i = 0; i < intensityRanges.length; i++) {
      if (avgIntensity >= intensityRanges[i].min && avgIntensity < intensityRanges[i].max) {
        targetWord = intensityRanges[i].word;
        break;
      }
    }
    // Falls über 60% → NIGHTMARE
    if (avgIntensity >= 0.60) targetWord = 3; // NIGHTMARE
    
    // Wechsel nur wenn genug Zeit vergangen und Zustand sich ändert
    if (!isTransitioning && 
        currentWord !== targetWord && 
        millis() - lastWordChange > wordChangeDuration) {
      isTransitioning = true;
      transitionProgress = 0;
      lastWordChange = millis();
    }
  }
  
  // Übergangs-Animation
  if (isTransitioning) {
    transitionProgress = (millis() - lastWordChange) / transitionDuration;
    
    if (transitionProgress >= 1) {
      transitionProgress = 1;
      isTransitioning = false;
      
      // Wechsel zum neuen Zustand basierend auf aktueller Intensität
      let avgIntensity = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
      
      // Bestimme neuen Zustand
      currentWord = 0; // Default: FLOATING
      for (let i = 0; i < intensityRanges.length; i++) {
        if (avgIntensity >= intensityRanges[i].min && avgIntensity < intensityRanges[i].max) {
          currentWord = intensityRanges[i].word;
          break;
        }
      }
      if (avgIntensity >= 0.60) currentWord = 3; // NIGHTMARE
      
      textToDisplay = words[currentWord];
      createBarGrid(); // Neues Raster für nächstes Wort
      lastWordChange = millis();
    }
  }
  
  // Easing für Übergang
  let easeProgress = easeInOutCubic(transitionProgress);
  
  // Puls-Wert für smooth animation
  pulseValue = lerp(pulseValue, isBeat ? 1 : 0, 0.15);
  
  // Zeichne Balken-Raster mit Effekten je nach Zustand
  if (currentWord === 0) { // FLOATING
    drawFloatingBars(lowFreq, isBeat, easeProgress);
  } else if (currentWord === 1) { // DREAM
    drawDreamBars(lowFreq, isBeat, easeProgress);
  } else if (currentWord === 2) { // FALLING
    drawFallingBars(lowFreq, isBeat, easeProgress);
  } else { // NIGHTMARE
    drawNightmareBars(lowFreq, isBeat, easeProgress);
  }
  
  // Debug Info
  let avgIntensity = energyHistory.length > 0 
    ? energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length 
    : 0;
  
  fill(100);
  textAlign(LEFT, TOP);
  textSize(12);
  let songNames = ["LanaTechno", "test", "test2"];
  let playingStatus = (currentSoundIndex >= 0 && sounds[currentSoundIndex].isPlaying()) ? 'Playing' : 'Stopped';
  let currentSongName = currentSoundIndex >= 0 ? songNames[currentSoundIndex] : 'None';
  text(`${textToDisplay} | Song: ${currentSongName} (${currentSoundIndex + 1}/${sounds.length}) | Intensity: ${(avgIntensity * 100).toFixed(0)}% | Beat: ${isBeat}`, 10, 10);
  text(`FLOATING: 20-30% | DREAM: 30-45% | FALLING: 45-60% | NIGHTMARE: 60%+ | ${playingStatus} | Click or [Space] for random song`, 10, 25);
}

function drawFloatingBars(lowFreq, isBeat, transitionEase) {
  // FLOATING: Sanftes, schwebendes Auf und Ab - reagiert auf Beat
  
  floatOffset += 0.02 + lowFreq * 0.05; // Geschwindigkeit reagiert auf Bass
  let floatIntensity = 15 + lowFreq * 20; // Intensität reagiert auf Bass
  
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich
    push();
    fill(40);
    noStroke();
    
    if (isTransitioning) {
      let alpha = 255 * (1 - transitionEase * 0.5);
      fill(40, alpha);
    }
    
    rect(bar.x - barWidth/2, 0, barWidth, height);
    pop();
    
    // DANN: Text-Balken mit schwebendem Effekt
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Pulsieren reagiert auf Bass
        let pulseScale = 1 + lowFreq * 0.6;
        if (isBeat) pulseScale *= 1.2; // Extra Puls bei Beat
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
        // Schwebendes Auf und Ab - sanfte Sinuswellen, verstärkt bei Bass
        let floatY = sin(floatOffset + bar.phase) * floatIntensity;
        
        let x = bar.x;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert leicht mit Bass
        let heightScale = 1 + lowFreq * 0.2;
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter - textBarHeight/2 + floatY;
        
        // Weiße Farbe mit sanftem Glow
        fill(255, 255, 255);
        noStroke();
        
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        rect(x - textBarWidth/2, y, textBarWidth, textBarHeight);
        
        // Glow verstärkt sich bei Beat
        if (!isTransitioning) {
          let glowAlpha = 50 + lowFreq * 80;
          if (isBeat) glowAlpha += 50;
          fill(255, 255, 255, glowAlpha);
          rect(x - textBarWidth/2 - 3, y - 3, textBarWidth + 6, textBarHeight + 6);
        }
        
        pop();
      }
    }
  }
}

function drawDreamBars(lowFreq, isBeat, transitionEase) {
  // DREAM: Pulsieren und Vibrieren auf tiefe Frequenzen
  
  // Vibrations-Offset basierend auf Bass
  vibrateOffset += 0.3;
  let vibrateIntensity = lowFreq * 8;
  
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich (durchgehend von oben bis unten)
    push();
    fill(40); // Dunkles Grau
    noStroke();
    
    if (isTransitioning) {
      let alpha = 255 * (1 - transitionEase * 0.5);
      fill(40, alpha);
    }
    
    rect(bar.x - barWidth/2, 0, barWidth, height);
    pop();
    
    // DANN: Wenn dieser Balken Teil des Texts ist, zeichne DICKERE Balken drüber
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Puls-Effekt: Breite ändert sich mit Bass
        let pulseScale = 1 + lowFreq * 1.2;
        if (isBeat) pulseScale *= 1.3;
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
        // Vibrations-Offset
        let vibrateX = sin(vibrateOffset + bar.phase) * vibrateIntensity;
        let vibrateY = cos(vibrateOffset * 1.3 + bar.phase) * vibrateIntensity * 0.5;
        
        // Position mit Vibration (zentriert auf dem dünnen Strich)
        let x = bar.x + vibrateX;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert auch leicht
        let heightScale = 1 + lowFreq * 0.3;
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter - textBarHeight/2 + vibrateY;
        
        // Weiße Farbe - SEHR HELL
        fill(255, 255, 255);
        noStroke();
        
        // Übergangseffekt
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        rect(x - textBarWidth/2, y, textBarWidth, textBarHeight);
        
        // Glow bei Beat
        if (isBeat && !isTransitioning) {
          fill(255, 255, 255, 100);
          rect(x - textBarWidth/2 - 4, y - 4, textBarWidth + 8, textBarHeight + 8);
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
  
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich
    push();
    fill(40);
    noStroke();
    
    if (isTransitioning) {
      let alpha = 255 * (1 - transitionEase * 0.5);
      fill(40, alpha);
    }
    
    rect(bar.x - barWidth/2, 0, barWidth, height);
    pop();
    
    // DANN: Text-Balken mit Wellen-Effekt + Vibration
    if (bar.isText) {
      for (let segment of bar.textSegments) {
        push();
        
        // Pulsieren bei Bass - moderat
        let pulseScale = 1 + lowFreq * 0.6;
        if (isBeat) pulseScale *= 1.15; // Weniger extra bei Beat
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
        // Wellen-Effekt: Vertikale Bewegung basierend auf X-Position - reduziert
        let waveY = sin(waveOffset + bar.x * waveFrequency) * waveIntensity;
        // Zusätzliche Welle mit anderer Frequenz für komplexeren Effekt
        waveY += cos(waveOffset * 1.3 + bar.x * waveFrequency * 0.7) * (waveIntensity * 0.4);
        
        // VIBRATION - Horizontale und vertikale Offsets - reduziert
        let vibrateX = sin(vibrateOffset + bar.phase) * vibrateIntensity;
        let vibrateY = cos(vibrateOffset * 1.4 + bar.phase) * vibrateIntensity * 0.3;
        
        // Kombiniere Wellen und Vibration
        let x = bar.x + vibrateX;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert mit Bass - moderat
        let heightScale = 1 + lowFreq * 0.2;
        let textBarHeight = segment.height * heightScale;
        let y = segmentCenter - textBarHeight/2 + waveY + vibrateY;
        
        // Weiße Farbe
        fill(255, 255, 255);
        noStroke();
        
        if (isTransitioning) {
          let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
          fill(255, 255, 255, alpha);
        }
        
        rect(x - textBarWidth/2, y, textBarWidth, textBarHeight);
        
        // Glow bei Bass und stärkeren Wellen
        if (!isTransitioning && (isBeat || abs(waveY) > waveIntensity * 0.5)) {
          let glowAlpha = 60 + lowFreq * 60; // Reduziert
          fill(255, 255, 255, glowAlpha);
          rect(x - textBarWidth/2 - 3, y - 3, textBarWidth + 6, textBarHeight + 6);
        }
        
        pop();
      }
    }
  }
  
  // Wellen-Linien im Hintergrund - reagieren auf Bass - reduziert
  push();
  noFill();
  let strokeAlpha = 60 + lowFreq * 60; // Weniger sichtbar
  stroke(100, 100, 100, strokeAlpha);
  strokeWeight(1 + lowFreq * 1); // Dünner
  for (let waveNum = 0; waveNum < 2; waveNum++) { // Nur 2 statt 3 Wellen
    beginShape();
    for (let x = 0; x < width; x += 15) { // Gröbere Schritte
      let y = height/2 + sin(waveOffset * (1 + waveNum * 0.3) + x * waveFrequency) * (waveIntensity * 1.5);
      vertex(x, y);
    }
    endShape();
  }
  pop();
  
  // Extra Effekt bei Beat: Kurze horizontale Störlinien - reduziert
  if (isBeat && random(1) > 0.8) { // Seltener
    push();
    for (let i = 0; i < 3; i++) { // Weniger Linien
      let y = random(height);
      let w = random(80, 200); // Kürzer
      let x = random(width);
      stroke(255, 255, 255, 100); // Transparenter
      strokeWeight(1);
      line(x, y, x + w, y);
    }
    pop();
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
    let glitchStrength = 8 + lowFreq * 12; // Bis zu 20px statt 60px
    for (let bar of bars) {
      bar.glitchOffsetX = random(-glitchStrength, glitchStrength);
      bar.glitchOffsetY = random(-glitchStrength/3, glitchStrength/3);
    }
  } else {
    // Schneller zurück zu 0 - glattere Übergänge
    for (let bar of bars) {
      bar.glitchOffsetX = lerp(bar.glitchOffsetX, 0, 0.6);
      bar.glitchOffsetY = lerp(bar.glitchOffsetY, 0, 0.6);
    }
  }
  
  // Zeichne alle Balken
  for (let i = 0; i < bars.length; i++) {
    let bar = bars[i];
    
    // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich (durchgehend von oben bis unten)
    push();
    fill(40); // Dunkles Grau
    noStroke();
    
    if (isTransitioning) {
      let alpha = 255 * (1 - transitionEase * 0.5);
      fill(40, alpha);
    }
    
    rect(bar.x - barWidth/2, 0, barWidth, height);
    pop();
  }
  
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
            
            // Weniger Pulsieren
            let pulseScale = 1 + lowFreq * 0.3;
            let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
            let x = bar.x + bar.glitchOffsetX + layerOffsetX;
            let y = segment.yStart + bar.glitchOffsetY + layerOffsetY;
            
            // Subtilere Farben - weniger aggressiv
            let alphaBoost = lowFreq * 30;
            if (layer === 0) {
              fill(255, 100, 100, 140 + alphaBoost); // Helles Rot - weniger intensiv
            } else if (layer === 1) {
              fill(255, 255, 255, 160 + alphaBoost); // Weiß
            } else {
              fill(200, 200, 200, 120 + alphaBoost); // Hellgrau
            }
            noStroke();
            
            rect(x - textBarWidth/2, y, textBarWidth, segment.height);
            
            pop();
          }
        }
      }
    }
  } else {
    // Normale Darstellung - dicke Balken ÜBER den dünnen Strichen
    for (let i = 0; i < bars.length; i++) {
      let bar = bars[i];
      
      if (bar.isText) {
        // TEXT-BALKEN: Weiß, dick, über den dünnen Strichen
        
        for (let segment of bar.textSegments) {
          push();
          
          // Moderates Pulsieren mit Bass
          let pulseScale = 1 + lowFreq * 0.5;
          if (isBeat) pulseScale *= 1.1; // Weniger dramatisch
          let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
          let x = bar.x + bar.glitchOffsetX;
          let y = segment.yStart + bar.glitchOffsetY;
          
          // Weniger rötliche Färbung - besser lesbar
          if (lowFreq > 0.7 && random(1) > 0.85) { // Seltener und nur bei sehr starkem Bass
            let redIntensity = 30 + lowFreq * 50; // Weniger Rot
            fill(255, 220 - redIntensity, 220 - redIntensity); // Leicht rötlich
          } else {
            fill(255, 255, 255); // Weiß
          }
          noStroke();
          
          // Übergangseffekt
          if (isTransitioning) {
            let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
            fill(255, 255, 255, alpha);
          }
          
          rect(x - textBarWidth/2, y, textBarWidth, segment.height);
          
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
        fill(255, 100, 100, 40 + lowFreq * 40); // Transparenter
      } else {
        fill(255, 255, 255, 30 + lowFreq * 30); // Sehr transparent
      }
      noStroke();
      rect(offsetX, y, width, h);
    }
    pop();
  }
  
  // Subtilere Scanlines - nur bei sehr starkem Bass
  if (lowFreq > 0.5) {
    push();
    stroke(255, 100, 100, lowFreq * 40); // Viel transparenter
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
