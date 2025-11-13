let sounds = [];
let currentSoundIndex = -1;
let fft;
let amplitude;

// Audio-Analyse
let bass = 0;
let lowMid = 0;
let mid = 0;
let treble = 0;
let lowFreq = 0;
let isBeat = false;

// Beat Detection
let beatHistory = [];
let beatHistoryLength = 120;
let lastBeatTime = 0;
let beatThreshold = 0.6;
let beatCooldown = 150;

// Totenkopf & Schwarzes Loch
let skull = {
  x: 0,
  y: 0,
  size: 150,
  rotation: 0,
  rotationSpeed: 0,
  eyeGlow: 0,
  distortPhase: 0,
  kickPulse: 0,
  lastKickTime: 0,
  kickCooldown: 250, // Mindestabstand zwischen Kicks
  laughMode: false,
  laughStartTime: 0,
  laughDuration: 0,
  laughPhase: 0
};

// Dämon/Teufel
let demon = {
  x: 0,
  y: 0,
  size: 140,
  rotation: 0,
  distortPhase: 0,
  hornAngle: 0,
  kickPulse: 0,
  lastKickTime: 0,
  kickCooldown: 200,
  screamMode: false,
  screamDuration: 0,
  screamStartTime: 0,
  smokeParticles: []
};

// Wendigo
let wendigo = {
  x: 0,
  y: 0,
  size: 160,
  rotation: 0,
  distortPhase: 0,
  breathPhase: 0,
  antlerPhase: 0,
  kickPulse: 0,
  lastKickTime: 0,
  kickCooldown: 300,
  shakeMode: false,
  shakeStartTime: 0,
  shakeDuration: 0,
  shakeIntensity: 0,
  eyesWarning: false,
  warningStartTime: 0
};

let blackHole = {
  x: 0,
  y: 0,
  size: 300,
  rotation: 0,
  intensity: 0,
  pulsePhase: 0
};

// Psychedelische Partikel
let particles = [];
let spirals = [];
let colorShift = 0;

function preload() {
  // Verwende Songs aus dem 5/assets Ordner
  sounds.push(loadSound("../5/assets/LanaTechno.mp3"));
  sounds.push(loadSound("../5/assets/test.mp3"));
  sounds.push(loadSound("../5/assets/test2.mp3"));
  sounds.push(loadSound("../5/assets/Gonzi_BASSKILLER.mp3"));
  sounds.push(loadSound("../5/assets/katyperry.mp3"));
}

function setup() {
  createCanvas(1920, 450);
  frameRate(60);
  
  amplitude = new p5.Amplitude();
  fft = new p5.FFT(0.8, 1024);
  
  // Lautstärke
  for (let i = 0; i < sounds.length; i++) {
    sounds[i].setVolume(0.8);
  }
  
  // Totenkopf & Schwarzes Loch Position (zentriert)
  skull.x = width / 2;
  skull.y = height / 2;
  
  // Dämon links - mehr Abstand
  demon.x = width / 5;
  demon.y = height / 2;
  
  // Wendigo rechts - mehr Abstand
  wendigo.x = width * 4/5;
  wendigo.y = height / 2;
  
  blackHole.x = width / 2;
  blackHole.y = height / 2;
  
  // Initialisiere Spiralen
  for (let i = 0; i < 8; i++) {
    spirals.push({
      angle: (TWO_PI / 8) * i,
      radius: 0,
      speed: random(0.01, 0.03),
      colorOffset: random(TWO_PI)
    });
  }
  
  // Starte zufälligen Song
  playRandomSound();
}

function playRandomSound() {
  // Stoppe alle Sounds
  for (let i = 0; i < sounds.length; i++) {
    sounds[i].stop();
    sounds[i].onended(() => {});
  }
  
  currentSoundIndex = floor(random(sounds.length));
  let currentSound = sounds[currentSoundIndex];
  
  fft.setInput(currentSound);
  amplitude.setInput(currentSound);
  
  console.log(`Playing: Song ${currentSoundIndex + 1}/${sounds.length}`);
  currentSound.play();
}

function draw() {
  // Schwarzer Hintergrund
  background(0);
  
  // Song-Ende Check
  if (currentSoundIndex >= 0 && sounds[currentSoundIndex] && !sounds[currentSoundIndex].isPlaying()) {
    if (frameCount % 60 === 0) {
      playRandomSound();
    }
  }
  
  // Audio-Analyse
  analyzeAudio();
  
  // Color Shift für psychedelische Farben
  colorShift += 0.01 + mid * 0.05;
  
  // Update Schwarzes Loch
  updateBlackHole();
  
  // Zeichne psychedelische Wellen (statt vollem Hintergrund)
  drawPsychedelicWaves();
  
  // Zeichne Schwarzes Loch
  drawBlackHole();
  
  // Update & Zeichne Spiralen und Partikel
  updateSpirals();
  updateParticles();
  
  // Zeichne alle drei Kreaturen
  drawSkull();
  drawDemon();
  drawWendigo();
  
  // Post-Processing
  drawPsychedelicEffects();
  
  // Debug Info
  drawDebugInfo();
}

function analyzeAudio() {
  if (currentSoundIndex >= 0 && sounds[currentSoundIndex] && sounds[currentSoundIndex].isPlaying()) {
    let spectrum = fft.analyze();
    let level = amplitude.getLevel();
    
    bass = fft.getEnergy("bass") / 255;
    lowMid = fft.getEnergy("lowMid") / 255;
    mid = fft.getEnergy("mid") / 255;
    treble = fft.getEnergy("treble") / 255;
    
    lowFreq = (bass + lowMid) / 2;
    
    // NUR KICKS (tiefe Bass-Frequenzen) - EXTREM SPEZIFISCH
    // Nur 20-60 Hz für echte Kick Drums
    let kickEnergy = fft.getEnergy(20, 60) / 255;
    
    // Adaptive Kick Detection - NUR auf tiefste Frequenzen
    beatHistory.push(kickEnergy);
    if (beatHistory.length > beatHistoryLength) {
      beatHistory.shift();
    }
    
    if (beatHistory.length > 30) {
      let avgKick = beatHistory.reduce((a, b) => a + b, 0) / beatHistory.length;
      let variance = beatHistory.reduce((sum, val) => sum + Math.pow(val - avgKick, 2), 0) / beatHistory.length;
      let stdDev = Math.sqrt(variance);
      // Höherer Threshold für präzisere Kick-Erkennung
      beatThreshold = Math.max(0.55, Math.min(0.9, avgKick + stdDev * 2.0));
    }
    
    let currentTime = millis();
    // NUR auf KICKS reagieren (20-60 Hz)
    if (kickEnergy > beatThreshold && currentTime - lastBeatTime > beatCooldown) {
      isBeat = true;
      lastBeatTime = currentTime;
      
      // Schwarzes Loch reagiert auf Kick
      blackHole.intensity = kickEnergy;
      createPsychedelicParticles(20);
      
      // Jede Kreatur reagiert INDIVIDUELL auf Kicks mit eigenem Timing
      // Skull reagiert auf 60% der Kicks
      if (random(1) > 0.4 && currentTime - skull.lastKickTime > skull.kickCooldown) {
        skull.kickPulse = 1.0;
        skull.lastKickTime = currentTime;
      }
      
      // Demon reagiert auf 70% der Kicks (häufiger)
      if (random(1) > 0.3 && currentTime - demon.lastKickTime > demon.kickCooldown) {
        demon.kickPulse = 1.0;
        demon.lastKickTime = currentTime;
        
        // SCREAM MODE: Nur wenn NICHT im Scream und KEINE Rauch-Partikel mehr da sind
        if (bass > 0.7 && kickEnergy > 0.8 && random(1) < 0.05 && !demon.screamMode && demon.smokeParticles.length === 0) {
          demon.screamMode = true;
          demon.screamStartTime = currentTime;
          demon.screamDuration = random(2000, 3000); // 2-3 Sekunden (länger: war 0.8-1.5s)
          demon.smokeParticles = [];
        }
      }
      
      // Wendigo reagiert auf 50% der Kicks (seltener, aber intensiver)
      if (random(1) > 0.5 && currentTime - wendigo.lastKickTime > wendigo.kickCooldown) {
        wendigo.kickPulse = 1.0;
        wendigo.lastKickTime = currentTime;
      }
      
    } else {
      isBeat = false;
    }
    
    // Lasse kickPulse für jede Kreatur individuell abklingen
    skull.kickPulse *= 0.85;
    demon.kickPulse *= 0.88;
    wendigo.kickPulse *= 0.82; // Langsamer abklingen für intensivere Reaktion
    
    // Demon Scream Mode Update
    if (demon.screamMode) {
      let currentTime = millis();
      if (currentTime - demon.screamStartTime > demon.screamDuration) {
        demon.screamMode = false;
        // NICHT mehr alle Partikel sofort löschen - sie lösen sich langsam auf
      } else {
        // Erstelle lila Rauch-Partikel während Scream - AUS DEM MUND
        if (frameCount % 2 === 0) {
          demon.smokeParticles.push({
            x: random(-20, 20), // Leicht seitlich vom Mund
            y: demon.size * 0.28, // Mundposition
            vx: random(-1.5, 1.5), // Seitliche Bewegung
            vy: random(-2, -0.5), // Nach oben
            size: random(18, 40),
            alpha: 255,
            life: 1.0,
            startY: demon.size * 0.28, // Startposition für nach-oben-Bewegung
            wobblePhase: random(TWO_PI), // Phase für Wabern
            wobbleSpeed: random(0.03, 0.08), // Geschwindigkeit des Waberns
            wobbleAmount: random(15, 30) // Amplitude des Waberns (größer für sichtbares Wabern)
          });
        }
      }
      
      // Update smoke particles (auch nach Scream-Ende)
      for (let i = demon.smokeParticles.length - 1; i >= 0; i--) {
        let p = demon.smokeParticles[i];
        
        // Update Wabern-Phase
        p.wobblePhase += p.wobbleSpeed;
        
        // Wabern-Effekt: Sinusförmige seitliche Bewegung
        let wobbleX = sin(p.wobblePhase) * p.wobbleAmount;
        let wobbleY = cos(p.wobblePhase * 1.3) * p.wobbleAmount * 0.3; // Weniger vertikales Wabern
        
        // Nach oben bewegen mit Wabern (direkt Position ändern)
        p.x += p.vx * 0.3 + wobbleX * 0.15; // Langsame seitliche Drift + Wabern
        p.y += p.vy + wobbleY * 0.1; // Nach oben + leichtes Wabern
        
        // Nach Scream-Ende: Rauch löst sich SEHR SEHR langsam auf
        if (!demon.screamMode) {
          p.life -= 0.0015; // EXTREM langsam verblassen
          p.vy *= 0.98; // Langsamer werden beim Aufsteigen
          p.wobbleAmount += 0.15; // Wabern wird größer beim Auflösen
        } else {
          p.life -= 0.008; // Während Scream
        }
        
        p.size += 0.3; // Langsamer wachsen
        p.alpha = p.life * 255;
        
        if (p.life <= 0) {
          demon.smokeParticles.splice(i, 1);
        }
      }
    } else if (demon.smokeParticles.length > 0) {
      // Auch nach Scream-Ende weiter Partikel updaten (Auflösung)
      for (let i = demon.smokeParticles.length - 1; i >= 0; i--) {
        let p = demon.smokeParticles[i];
        
        // Update Wabern-Phase
        p.wobblePhase += p.wobbleSpeed;
        
        // Wabern-Effekt auch nach Scream
        let wobbleX = sin(p.wobblePhase) * p.wobbleAmount;
        let wobbleY = cos(p.wobblePhase * 1.3) * p.wobbleAmount * 0.3;
        
        // Nach oben bewegen mit Wabern (direkt Position ändern)
        p.x += p.vx * 0.3 + wobbleX * 0.15; // Langsame seitliche Drift + Wabern
        p.y += p.vy + wobbleY * 0.1; // Nach oben + leichtes Wabern
        
        p.life -= 0.0015; // EXTREM langsam auflösen
        p.vy *= 0.98; // Langsamer werden beim Aufsteigen
        p.wobbleAmount += 0.15; // Wabern wird größer
        p.size += 0.3; // Langsamer wachsen
        p.alpha = p.life * 255;
        
        if (p.life <= 0) {
          demon.smokeParticles.splice(i, 1);
        }
      }
    }
    
    // Wendigo Shake Mode - aktiviert bei ruhiger Musik (ausgewogene Häufigkeit)
    if (bass < 0.3 && !wendigo.shakeMode && !wendigo.eyesWarning && random(1) < 0.01) { // ~1% Chance pro Frame (ausgeglichen: nicht zu oft, nicht zu selten)
      // ZUERST: Augen-Warnung (türkis)
      wendigo.eyesWarning = true;
      wendigo.warningStartTime = millis();
    }
    
    // Augen-Warnung Update -> dann Shake aktivieren
    if (wendigo.eyesWarning && !wendigo.shakeMode) {
      let now = millis();
      let warningDuration = 600; // 0.6 Sekunden Warnung mit türkisen Augen
      
      if (now - wendigo.warningStartTime > warningDuration) {
        // Nach Warnung: Shake starten
        wendigo.shakeMode = true;
        wendigo.shakeStartTime = now;
        wendigo.shakeDuration = random(800, 1200); // 0.8 - 1.2 Sekunden Schütteln (länger: war 0.5-0.9s)
        wendigo.shakeIntensity = random(0.3, 0.5);
      }
    }
    
    // Update Shake Mode
    if (wendigo.shakeMode) {
      let now = millis();
      if (now - wendigo.shakeStartTime > wendigo.shakeDuration) {
        wendigo.shakeMode = false;
        wendigo.eyesWarning = false; // Reset Warnung NACH Shake (Augen bleiben türkis während Shake)
      }
    }
    
    // Skull Laugh Mode - aktiviert SEHR selten und zufällig
    if (!skull.laughMode && random(1) < 0.001) { // ~0.1% Chance pro Frame (sehr selten, war 0.003)
      skull.laughMode = true;
      skull.laughStartTime = millis();
      skull.laughDuration = random(1500, 2500); // 1.5 - 2.5 Sekunden Lachen
      skull.laughPhase = 0;
    }
    
    // Update Laugh Mode
    if (skull.laughMode) {
      let now = millis();
      if (now - skull.laughStartTime > skull.laughDuration) {
        skull.laughMode = false;
      } else {
        // Lach-Animation Phase
        skull.laughPhase += 0.25; // Schnelle Lach-Bewegung
      }
    }
  }
}

function updateBlackHole() {
  // Rotation beschleunigt sich mit Musik - STARK audioreaktiv
  blackHole.rotation += 0.005 + bass * 0.05 + mid * 0.03;
  blackHole.pulsePhase += 0.05 + lowFreq * 0.2;
  
  // Größen-Pulsierung - reagiert auf alle Frequenzen
  let pulse = sin(blackHole.pulsePhase) * 0.1;
  blackHole.size = 300 + pulse * 100 + bass * 200 + mid * 100 + treble * 50;
  
  // Intensität abklingen
  blackHole.intensity *= 0.93;
}

function drawPsychedelicWaves() {
  // Wellige Linien - Schwarz-Weiß - Beat-reaktiv - GEDIMMT
  push();
  noFill();
  for (let i = 0; i < 5; i++) {
    // Schwarz-Weiß: Deutlich dunkler
    let brightness = isBeat ? 120 : 60 + bass * 40;
    stroke(brightness, brightness, brightness, 15 + bass * 40 + (isBeat ? 30 : 0));
    strokeWeight(1 + bass * 2 + (isBeat ? 1 : 0));
    
    beginShape();
    for (let x = 0; x < width; x += 10) {
      let y = height / 2 + 
              sin(x * 0.01 + frameCount * 0.02 + i + bass * 3) * (15 + bass * 40) +
              cos(x * 0.005 + frameCount * 0.01 + i * 2 + mid * 3) * (10 + mid * 30) +
              sin(x * 0.008 + treble * 4) * (5 + treble * 20);
      vertex(x, y + i * 30 - 60);
    }
    endShape();
  }
  pop();
}

function drawBlackHole() {
  push();
  translate(blackHole.x, blackHole.y);
  rotate(blackHole.rotation);
  
  // Schwarzes Loch - Spirale SCHWARZ-WEISS - GEDIMMT
  // Ringe faden nach außen aus
  noFill();
  
  for (let i = 0; i < 50; i++) {
    let radius = map(i, 0, 50, blackHole.size, 10);
    // Alpha faded nach außen - DEUTLICH REDUZIERT
    let baseAlpha = map(i, 0, 50, 5, 120);
    // Bei Beat: Weniger starke Erhöhung
    let alpha = isBeat ? baseAlpha * 1.1 : baseAlpha;
    
    // Schwarz-Weiß: Helligkeit reduziert
    let brightness = map(i, 0, 50, 40, 100) + (isBeat ? 20 : 0);
    
    stroke(brightness, brightness, brightness, alpha * (0.3 + bass * 0.3));
    strokeWeight(1 + bass * 3 + (isBeat ? 2 : 0));
    
    let segments = 100;
    beginShape();
    for (let j = 0; j < segments; j++) {
      let angle = map(j, 0, segments, 0, TWO_PI * 3);
      let r = radius * (1 - j / segments) * (1 + sin(frameCount * 0.05 + i) * bass * 0.2);
      let x = cos(angle + i * 0.1 + bass * 0.5) * r;
      let y = sin(angle + i * 0.1 + mid * 0.4) * r;
      vertex(x, y);
    }
    endShape();
  }
  
  // Zentrum - absolut schwarz mit weniger Pulsierung
  fill(0, 0, 0);
  noStroke();
  let centerSize = 80 + bass * 30 + sin(blackHole.pulsePhase) * 15 + (isBeat ? 20 : 0);
  ellipse(0, 0, centerSize, centerSize);
  
  // Event Horizon - glühender Ring - GEDIMMT
  noFill();
  let ringBrightness = isBeat ? 150 : 80 + bass * 30;
  stroke(ringBrightness, ringBrightness, ringBrightness, 100 + (isBeat ? 30 : 0));
  strokeWeight(2 + bass * 5 + (isBeat ? 3 : 0));
  let ringSize = 120 + sin(blackHole.pulsePhase) * 20 + bass * 40 + (isBeat ? 30 : 0);
  ellipse(0, 0, ringSize, ringSize);
  
  // Zusätzlicher äußerer Ring bei Beat - GEDIMMT
  if (isBeat) {
    stroke(150, 150, 150, 100);
    strokeWeight(3 + bass * 4);
    ellipse(0, 0, 180 + bass * 50);
  }
  
  pop();
}

function updateSpirals() {
  for (let spiral of spirals) {
    spiral.angle += spiral.speed + bass * 0.02 + mid * 0.01;
    spiral.radius += 0.3 + bass * 0.8;
    
    if (spiral.radius > width) {
      spiral.radius = 0;
      spiral.colorOffset = random(TWO_PI);
    }
    
    // Zeichne Spiralpunkt - SCHWARZ-WEISS - GEDIMMT
    let x = blackHole.x + cos(spiral.angle) * spiral.radius;
    let y = blackHole.y + sin(spiral.angle) * spiral.radius;
    
    let brightness = isBeat ? 140 : 70 + bass * 40;
    push();
    fill(brightness, brightness, brightness, map(spiral.radius, 0, width, 100 + bass * 30, 0));
    noStroke();
    ellipse(x, y, 8 + bass * 12 + (isBeat ? 8 : 0));
    
    // Glow bei Beat - REDUZIERT
    if (isBeat) {
      fill(140, 140, 140, 50);
      ellipse(x, y, 15 + bass * 15);
    }
    pop();
  }
}

function createPsychedelicParticles(count) {
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let speed = random(1, 3) + bass * 2; // LANGSAMER
    
    particles.push({
      x: blackHole.x,
      y: blackHole.y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      life: 1.0,
      size: random(3, 8) + bass * 5, // KLEINER
      hueOffset: random(360),
      rotation: 0,
      rotSpeed: random(-0.05, 0.05) + bass * 0.1
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.life -= 0.01;
    
    // Zeichne Partikel - SCHWARZ-WEISS - GEDIMMT
    let brightness = isBeat ? 120 : 80 + bass * 30;
    
    push();
    translate(p.x, p.y);
    rotate(p.rotation);
    
    // Outer glow - REDUZIERT
    noStroke();
    fill(brightness, brightness, brightness, p.life * 40);
    ellipse(0, 0, p.size * p.life * 2);
    
    // Inner core - weniger hell
    fill(140, 140, 140, p.life * 100);
    ellipse(0, 0, p.size * p.life);
    
    pop();
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawSkull() {
  push();
  translate(skull.x, skull.y);
  
  // Rotation reagiert auf Musik - REDUZIERT
  skull.rotation += 0.001 + mid * 0.005 + treble * 0.002;
  skull.distortPhase += 0.03 + bass * 0.08;
  rotate(sin(skull.distortPhase) * 0.05 + bass * 0.15);
  
  // Verzerrung bei Beat - REDUZIERT
  // Pulsierung bei Kick - INDIVIDUELL für Skull
  if (skull.kickPulse > 0.1) {
    scale(1 + skull.kickPulse * 0.18, 1 + skull.kickPulse * 0.12);
  } else if (bass > 0.5) {
    scale(
      1 + sin(skull.distortPhase * 2 + bass * 3) * bass * 0.08,
      1 + cos(skull.distortPhase * 1.7 + bass * 2) * bass * 0.05
    );
  }
  
  // SKELETT - realistischer
  let skullSize = skull.size + sin(frameCount * 0.05) * 5 + bass * 30 + (skull.kickPulse > 0.1 ? skull.kickPulse * 30 : 0);
  
  // Glow um Schädel - SCHWARZ-WEISS - GEDIMMT
  for (let i = 5; i > 0; i--) {
    let brightness = skull.kickPulse > 0.1 ? 120 + skull.kickPulse * 50 : 70 + bass * 30;
    noStroke();
    fill(brightness, brightness, brightness, 10 + bass * 20 + (skull.kickPulse > 0.1 ? skull.kickPulse * 20 : 0));
    ellipse(0, 0, skullSize + i * 40 + bass * 15 + (skull.kickPulse > 0.1 ? skull.kickPulse * 25 : 0), skullSize + i * 40);
  }
  
  // SCHÄDEL - Knochen-weiß mit Struktur
  fill(240, 235, 220);
  stroke(150, 145, 130);
  strokeWeight(2 + bass * 1 + (skull.kickPulse > 0.1 ? skull.kickPulse * 1.5 : 0));
  
  // Schädelform - realistischer (oval, oben breiter)
  ellipse(0, -skullSize * 0.1, skullSize * 0.9, skullSize * 1.2);
  
  // Wangenknochen
  fill(230, 225, 210);
  ellipse(-skullSize * 0.3, skullSize * 0.05, skullSize * 0.35, skullSize * 0.25);
  ellipse(skullSize * 0.3, skullSize * 0.05, skullSize * 0.35, skullSize * 0.25);
  
  // Unterkiefer mit realistischer Form
  fill(240, 235, 220);
  stroke(150, 145, 130);
  strokeWeight(2);
  beginShape();
  vertex(-skullSize * 0.35, skullSize * 0.3);
  quadraticVertex(-skullSize * 0.25, skullSize * 0.55, 0, skullSize * 0.6);
  quadraticVertex(skullSize * 0.25, skullSize * 0.55, skullSize * 0.35, skullSize * 0.3);
  vertex(skullSize * 0.3, skullSize * 0.25);
  vertex(-skullSize * 0.3, skullSize * 0.25);
  endShape(CLOSE);
  
  // Schädelrisse und Texturen
  stroke(120, 115, 100);
  strokeWeight(1 + bass * 1);
  for (let i = 0; i < 8; i++) {
    let startX = random(-skullSize * 0.4, skullSize * 0.4);
    let startY = random(-skullSize * 0.5, 0);
    let endX = startX + random(-20, 20);
    let endY = startY + random(30, 60);
    line(startX, startY, endX, endY);
  }
  
  // AUGENHÖHLEN - größer und tiefer
  fill(20, 20, 20);
  noStroke();
  // Links
  ellipse(-skullSize * 0.28, -skullSize * 0.15, skullSize * 0.35, skullSize * 0.45);
  // Rechts
  ellipse(skullSize * 0.28, -skullSize * 0.15, skullSize * 0.35, skullSize * 0.45);
  
  // Glühende Augen in den Höhlen - LILA im Laugh Mode
  skull.eyeGlow = lerp(skull.eyeGlow, (bass * 150 + mid * 100) * (isBeat ? 1.2 : 1), 0.3);
  let eyeSize = 25 + bass * 12 + (isBeat ? 12 : 0);
  drawSkeletonEye(-skullSize * 0.28, -skullSize * 0.15, eyeSize, skull.laughMode);
  drawSkeletonEye(skullSize * 0.28, -skullSize * 0.15, eyeSize, skull.laughMode);
  
  // NASENHÖHLE - dreieckig, realistisch
  fill(15, 15, 15);
  triangle(0, -skullSize * 0.05, -skullSize * 0.12, skullSize * 0.15, skullSize * 0.12, skullSize * 0.15);
  
  // ZÄHNE - realistischer, variierte Größen
  fill(250, 248, 240);
  stroke(140, 135, 120);
  strokeWeight(1);
  
  if (skull.laughMode) {
    // LAUGH MODE: Mund weit geöffnet zum Lachen
    // Kiefer öffnet sich
    push();
    let jawOpen = abs(sin(skull.laughPhase)) * 0.3; // Auf und zu Bewegung
    translate(0, skullSize * jawOpen);
    
    // Unterkiefer neu zeichnen (geöffnet)
    fill(240, 235, 220);
    stroke(150, 145, 130);
    strokeWeight(2);
    beginShape();
    vertex(-skullSize * 0.35, skullSize * 0.3);
    quadraticVertex(-skullSize * 0.25, skullSize * 0.55, 0, skullSize * 0.6);
    quadraticVertex(skullSize * 0.25, skullSize * 0.55, skullSize * 0.35, skullSize * 0.3);
    vertex(skullSize * 0.3, skullSize * 0.25);
    vertex(-skullSize * 0.3, skullSize * 0.25);
    endShape(CLOSE);
    
    // Untere Zähne (bewegt sich mit Kiefer)
    fill(250, 248, 240);
    stroke(140, 135, 120);
    strokeWeight(1);
    for (let i = -3; i <= 3; i++) {
      let x = i * (skullSize * 0.09);
      let y = skullSize * 0.45;
      let toothWidth = 7;
      let toothHeight = 14 + abs(sin(skull.laughPhase * 2 + i)) * 4;
      
      beginShape();
      vertex(x - toothWidth/2, y);
      vertex(x, y - toothHeight);
      vertex(x + toothWidth/2, y);
      endShape(CLOSE);
    }
    pop();
    
    // Obere Zähne (lachend)
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      let x = i * (skullSize * 0.08);
      let y = skullSize * 0.25;
      let toothWidth = 8 + random(-2, 2);
      let toothHeight = (i === -4 || i === 4) ? 12 : (abs(i) === 1 ? 22 : 18);
      toothHeight += abs(sin(skull.laughPhase * 1.5 + i)) * 5;
      
      beginShape();
      vertex(x - toothWidth/2, y);
      vertex(x - toothWidth/2, y + toothHeight * 0.7);
      vertex(x, y + toothHeight);
      vertex(x + toothWidth/2, y + toothHeight * 0.7);
      vertex(x + toothWidth/2, y);
      endShape(CLOSE);
    }
    
  } else {
    // NORMALER MODUS: Geschlossener Mund
    // Obere Zähne
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue; // Lücke in der Mitte
      let x = i * (skullSize * 0.08);
      let y = skullSize * 0.25;
      let toothWidth = 8 + random(-2, 2);
      let toothHeight = (i === -4 || i === 4) ? 12 : (abs(i) === 1 ? 22 : 18); // Schneidezähne länger
      toothHeight += sin(frameCount * 0.1 + i + bass * 5) * (2 + bass * 3) + (isBeat ? 3 : 0);
      
      beginShape();
      vertex(x - toothWidth/2, y);
      vertex(x - toothWidth/2, y + toothHeight * 0.7);
      vertex(x, y + toothHeight);
      vertex(x + toothWidth/2, y + toothHeight * 0.7);
      vertex(x + toothWidth/2, y);
      endShape(CLOSE);
    }
    
    // Untere Zähne
    for (let i = -3; i <= 3; i++) {
      let x = i * (skullSize * 0.09);
      let y = skullSize * 0.45;
      let toothWidth = 7;
      let toothHeight = 14 + sin(frameCount * 0.15 + i - bass * 4) * (2 + bass * 2);
      
      beginShape();
      vertex(x - toothWidth/2, y);
      vertex(x, y - toothHeight);
      vertex(x + toothWidth/2, y);
      endShape(CLOSE);
    }
  }
  
  pop();
}

// Glühende Skelett-Augen
function drawSkeletonEye(x, y, size, isLaughing) {
  push();
  translate(x, y);
  
  // Mehrere Glow-Ringe - LILA im Laugh Mode, sonst normal
  for (let i = 6; i > 0; i--) {
    let brightness = isBeat ? 140 : 80 + bass * 40;
    noStroke();
    
    if (isLaughing) {
      // LILA Glow beim Lachen
      let r = 180 + sin(skull.laughPhase) * 20;
      let g = 100 + sin(skull.laughPhase * 1.2) * 30;
      let b = 220 + sin(skull.laughPhase * 0.8) * 20;
      fill(r, g, b, map(i, 0, 6, 100 + bass * 50, 5));
    } else {
      // Normaler weißer Glow
      fill(brightness, brightness - 20, brightness - 40, map(i, 0, 6, 80 + bass * 50 + (isBeat ? 40 : 0), 5));
    }
    ellipse(0, 0, size + i * 10 + bass * 8 + (isBeat ? 8 : 0));
  }
  
  // Kern - LILA im Laugh Mode, sonst weißglühend
  if (isLaughing) {
    // INTENSIV LILA
    let r = 200 + sin(skull.laughPhase * 2) * 30;
    let g = 80 + sin(skull.laughPhase * 1.5) * 40;
    let b = 240 + sin(skull.laughPhase) * 15;
    fill(r, g, b);
  } else {
    fill(isBeat ? 180 : 120 + bass * 40, isBeat ? 170 : 110 + bass * 35, isBeat ? 150 : 100 + bass * 30);
  }
  ellipse(0, 0, size * 0.6);
  
  // Highlight
  if (isLaughing) {
    fill(240, 180, 255, 180 + sin(skull.laughPhase * 3) * 50);
  } else {
    fill(200, 190, 170, 150 + bass * 50 + (isBeat ? 50 : 0));
  }
  ellipse(-size * 0.08, -size * 0.08, size * 0.2);
  
  pop();
}

// DÄMON / TEUFEL - REALISTISCH & SCHWARZ-WEISS
function drawDemon() {
  push();
  translate(demon.x, demon.y);
  
  // SCREAM MODE: Stoppe Bewegung komplett
  if (!demon.screamMode) {
    demon.distortPhase += 0.04 + bass * 0.1;
    demon.hornAngle += 0.02 + mid * 0.05;
    rotate(sin(demon.distortPhase) * 0.08 + bass * 0.2);
  } else {
    // Im Scream Mode: Keine Rotation, leichtes Zittern
    rotate(random(-0.03, 0.03));
  }
  
  if (demon.kickPulse > 0.1 && !demon.screamMode) {
    scale(1 + demon.kickPulse * 0.18, 1 + demon.kickPulse * 0.12);
  }
  
  let demonSize = demon.size + sin(frameCount * 0.06) * 6 + bass * 25 + demon.kickPulse * 30;
  
  // Glow - Schwarz-Weiß
  for (let i = 5; i > 0; i--) {
    let brightness = 60 + bass * 25 + demon.kickPulse * 50;
    noStroke();
    fill(brightness, brightness, brightness, 12 + bass * 18 + demon.kickPulse * 12);
    ellipse(0, 0, demonSize + i * 45 + bass * 20 + demon.kickPulse * 25, demonSize + i * 45);
  }
  
  // KOPF - heller grau, muskulös
  fill(120, 120, 120);
  stroke(80, 80, 80);
  strokeWeight(2 + bass * 1);
  
  // Gesicht - kantig, dämonisch
  beginShape();
  vertex(0, -demonSize * 0.55); // Stirn
  vertex(-demonSize * 0.35, -demonSize * 0.4); // Schläfe links
  vertex(-demonSize * 0.45, -demonSize * 0.1); // Wange links oben
  vertex(-demonSize * 0.42, demonSize * 0.15); // Wange links unten
  vertex(-demonSize * 0.25, demonSize * 0.35); // Kiefer links
  vertex(0, demonSize * 0.45); // Kinn
  vertex(demonSize * 0.25, demonSize * 0.35); // Kiefer rechts
  vertex(demonSize * 0.42, demonSize * 0.15); // Wange rechts unten
  vertex(demonSize * 0.45, -demonSize * 0.1); // Wange rechts oben
  vertex(demonSize * 0.35, -demonSize * 0.4); // Schläfe rechts
  endShape(CLOSE);
  
  // Schattierungen für Muskulatur
  noStroke();
  fill(90, 90, 90, 100);
  // Wangenknochen
  ellipse(-demonSize * 0.3, -demonSize * 0.05, demonSize * 0.25, demonSize * 0.3);
  ellipse(demonSize * 0.3, -demonSize * 0.05, demonSize * 0.25, demonSize * 0.3);
  // Kiefermuskel
  ellipse(-demonSize * 0.28, demonSize * 0.2, demonSize * 0.22, demonSize * 0.28);
  ellipse(demonSize * 0.28, demonSize * 0.2, demonSize * 0.22, demonSize * 0.28);
  
  // HÖRNER - realistisch, wie Ziegenhörner/Widderhörner
  fill(130, 130, 130);
  stroke(90, 90, 90);
  strokeWeight(2);
  
  // Linkes Horn - spiralförmig
  push();
  translate(-demonSize * 0.38, -demonSize * 0.5);
  rotate(-0.5 + sin(demon.hornAngle) * 0.15);
  for (let segment = 0; segment < 12; segment++) {
    let t = segment / 11;
    push();
    translate(-t * 35 * (1 + bass * 0.2), -t * t * 70 * (1 + bass * 0.3));
    rotate(-t * 0.8);
    
    let segmentWidth = (12 - segment) * (2.5 + bass * 1.2);
    fill(130 - segment * 5, 130 - segment * 5, 130 - segment * 5);
    ellipse(0, 0, segmentWidth, segmentWidth * 1.5);
    
    // Rillen/Ringe am Horn
    if (segment % 2 === 0) {
      stroke(100, 100, 100);
      strokeWeight(1);
      noFill();
      arc(0, 0, segmentWidth * 0.8, segmentWidth * 1.2, -PI, 0);
    }
    pop();
  }
  // Horn-Spitze
  fill(80, 80, 80);
  noStroke();
  triangle(-35, -70, -38, -78, -32, -78);
  pop();
  
  // Rechtes Horn - spiralförmig
  push();
  translate(demonSize * 0.38, -demonSize * 0.5);
  rotate(0.5 - sin(demon.hornAngle) * 0.15);
  for (let segment = 0; segment < 12; segment++) {
    let t = segment / 11;
    push();
    translate(t * 35 * (1 + bass * 0.2), -t * t * 70 * (1 + bass * 0.3));
    rotate(t * 0.8);
    
    let segmentWidth = (12 - segment) * (2.5 + bass * 1.2);
    fill(130 - segment * 5, 130 - segment * 5, 130 - segment * 5);
    ellipse(0, 0, segmentWidth, segmentWidth * 1.5);
    
    // Rillen/Ringe am Horn
    if (segment % 2 === 0) {
      stroke(100, 100, 100);
      strokeWeight(1);
      noFill();
      arc(0, 0, segmentWidth * 0.8, segmentWidth * 1.2, 0, PI);
    }
    pop();
  }
  // Horn-Spitze
  fill(80, 80, 80);
  noStroke();
  triangle(35, -70, 38, -78, 32, -78);
  pop();
  
  // AUGEN - tiefliegend, bedrohlich (Schwarz-Weiß)
  let demonEyeSize = 35 + bass * 18 + demon.kickPulse * 15;
  
  // Augenhöhlen
  fill(20, 20, 20);
  noStroke();
  ellipse(-demonSize * 0.25, -demonSize * 0.1, demonSize * 0.28, demonSize * 0.35);
  ellipse(demonSize * 0.25, -demonSize * 0.1, demonSize * 0.28, demonSize * 0.35);
  
  drawDemonEye(-demonSize * 0.25, -demonSize * 0.1, demonEyeSize);
  drawDemonEye(demonSize * 0.25, -demonSize * 0.1, demonEyeSize);
  
  // NASE - breit, flach (wie Fledermaus)
  fill(100, 100, 100);
  stroke(70, 70, 70);
  strokeWeight(1.5);
  // Nasenlöcher
  ellipse(-8, demonSize * 0.08, 12, 18);
  ellipse(8, demonSize * 0.08, 12, 18);
  // Nasenrücken
  noFill();
  strokeWeight(2);
  stroke(90, 90, 90);
  line(0, -demonSize * 0.05, -6, demonSize * 0.05);
  line(0, -demonSize * 0.05, 6, demonSize * 0.05);
  
  // MUND - realistisch grinsend, bedrohlich ODER SCREAM MODE
  if (demon.screamMode) {
    // SCREAM MODE: Mund WEIT aufgerissen
    fill(95, 95, 95);
    stroke(70, 70, 70);
    strokeWeight(2);
    // Viel größerer Mund-Bogen
    arc(0, demonSize * 0.28, demonSize * 0.75, demonSize * 0.65, 0, PI);
    
    // Inneres Maul - sehr dunkel, tiefer
    fill(10, 10, 10);
    arc(0, demonSize * 0.28, demonSize * 0.68, demonSize * 0.55, 0, PI);
    
    // Zähne sichtbar, aber weiter offen
    fill(240, 240, 235);
    stroke(120, 120, 115);
    strokeWeight(1);
    
    // Obere Fangzähne
    for (let i = -2; i <= 2; i++) {
      let x = i * (demonSize * 0.14);
      let y = demonSize * 0.28;
      
      if (abs(i) === 2) {
        let fangHeight = 35 + bass * 12;
        beginShape();
        vertex(x - 5, y);
        vertex(x - 4, y + fangHeight * 0.6);
        vertex(x, y + fangHeight);
        vertex(x + 4, y + fangHeight * 0.6);
        vertex(x + 5, y);
        endShape(CLOSE);
      } else if (i !== 0) {
        rect(x - 4, y, 8, 18 + bass * 5);
      }
    }
    
    // Untere Zähne - sichtbar im offenen Mund
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      let x = i * (demonSize * 0.11);
      let y = demonSize * 0.58; // Weiter unten
      let toothHeight = 16 + random(-2, 2);
      triangle(x - 3, y, x, y - toothHeight, x + 3, y);
    }
    
    // Zeichne lila Rauch-Partikel
    for (let p of demon.smokeParticles) {
      push();
      noStroke();
      // Lila Farbe mit Transparenz
      fill(180, 100, 220, p.alpha * 0.6);
      ellipse(p.x, p.y, p.size);
      // Äußerer Glow
      fill(200, 150, 240, p.alpha * 0.3);
      ellipse(p.x, p.y, p.size * 1.4);
      pop();
    }
    
  } else {
    // NORMALER MUND - grinsend
    fill(95, 95, 95);
    stroke(70, 70, 70);
    strokeWeight(2);
    arc(0, demonSize * 0.28, demonSize * 0.65, demonSize * 0.45, 0, PI);
    
    // Inneres Maul - dunkel
    fill(15, 15, 15);
    arc(0, demonSize * 0.28, demonSize * 0.58, demonSize * 0.35, 0, PI);
    
    // Realistische Zähne - variierte Formen
    fill(240, 240, 235);
    stroke(120, 120, 115);
    strokeWeight(1);
    
    // Obere Fangzähne (prominent)
    for (let i = -2; i <= 2; i++) {
      let x = i * (demonSize * 0.12);
      let y = demonSize * 0.28;
      
      if (abs(i) === 2) {
        // Große Eckzähne/Fangzähne
        let fangHeight = 28 + bass * 10 + demon.kickPulse * 8;
        beginShape();
        vertex(x - 5, y);
        vertex(x - 4, y + fangHeight * 0.6);
        vertex(x, y + fangHeight);
        vertex(x + 4, y + fangHeight * 0.6);
        vertex(x + 5, y);
        endShape(CLOSE);
      } else if (i !== 0) {
        // Kleinere Schneidezähne
        rect(x - 4, y, 8, 15 + bass * 4);
      }
    }
    
    // Untere Zähne - kleiner, unregelmäßig
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      let x = i * (demonSize * 0.09);
      let y = demonSize * 0.48;
      let toothHeight = 12 + random(-2, 2) + bass * 3;
      triangle(x - 3, y, x, y - toothHeight, x + 3, y);
    }
  }
  
  // Barthaare/Ziegenbart (optional)
  stroke(80, 80, 80);
  strokeWeight(2);
  for (let i = 0; i < 5; i++) {
    let offsetX = (i - 2) * 8;
    let wobble = sin(frameCount * 0.05 + i + bass * 3) * 3;
    line(offsetX, demonSize * 0.45, offsetX + wobble, demonSize * 0.58 + bass * 5);
  }
  
  pop();
}

// Dämon-Augen (Schwarz-Weiß, intensiv)
function drawDemonEye(x, y, size) {
  push();
  translate(x, y);
  
  // Grau-Glow
  for (let i = 6; i > 0; i--) {
    let brightness = isBeat ? 140 : 90 + bass * 40;
    noStroke();
    fill(brightness, brightness, brightness, map(i, 0, 6, 90 + bass * 60 + (isBeat ? 50 : 0), 8));
    ellipse(0, 0, size + i * 12 + bass * 10 + (isBeat ? 10 : 0));
  }
  
  // Augapfel - hellgrau
  fill(isBeat ? 200 : 160 + bass * 40);
  ellipse(0, 0, size * 0.7);
  
  // Schlitzpupille (vertikal, wie Ziege/Drache)
  fill(10, 10, 10);
  ellipse(0, 0, size * 0.12, size * 0.55 + sin(frameCount * 0.1 + bass * 8) * (size * 0.1));
  
  // Highlight
  fill(255, 255, 255, 180 + bass * 60 + (isBeat ? 60 : 0));
  ellipse(-size * 0.12, -size * 0.15, size * 0.18);
  
  pop();
}

// WENDIGO - ALBTRAUMGESTALT (Nordamerikanische Legende)
function drawWendigo() {
  push();
  translate(wendigo.x, wendigo.y);
  
  // Update Phasen nur wenn nicht im Shake Mode
  if (!wendigo.shakeMode) {
    wendigo.distortPhase += 0.03 + bass * 0.08;
    wendigo.breathPhase += 0.04 + bass * 0.12;
    wendigo.antlerPhase += 0.02 + mid * 0.03;
  }
  
  // SHAKE MODE: Intensives Schütteln wie ein Elch
  if (wendigo.shakeMode) {
    let shakeProgress = (millis() - wendigo.shakeStartTime) / wendigo.shakeDuration;
    let shakeFreq = 0.8; // Langsamer (war 35)
    
    // Hin-und-Her-Schütteln mit REDUZIERTEM Radius (horizontal dominiert)
    let shakeX = sin(frameCount * shakeFreq) * wendigo.shakeIntensity * 50; // Kleinerer Radius (war 80)
    let shakeY = sin(frameCount * shakeFreq * 1.3) * wendigo.shakeIntensity * 18; // Kleinerer Radius (war 30)
    
    // Rotation schütteln - intensiver
    let shakeRot = sin(frameCount * shakeFreq * 0.8) * wendigo.shakeIntensity * 2.5; // Intensiver (war *1)
    
    // Fade out am Ende
    let intensity = 1.0;
    if (shakeProgress > 0.7) {
      intensity = map(shakeProgress, 0.7, 1.0, 1.0, 0.0);
    }
    
    translate(shakeX * intensity, shakeY * intensity);
    rotate(shakeRot * intensity);
  } else {
    // Normales leichtes Schwanken
    rotate(sin(wendigo.distortPhase * 0.5) * 0.06 + bass * 0.12);
  }
  
  if (wendigo.kickPulse > 0.1 && !wendigo.shakeMode) {
    // SEHR AGGRESSIVES Pulsieren - erschreckend
    scale(1 + wendigo.kickPulse * 0.38, 1 + wendigo.kickPulse * 0.32); // Stärker
  } else {
    // BEDROHLICHES Atmen - tiefer, intensiver
    let breathe = 1 + sin(wendigo.breathPhase) * 0.06; // Doppelt so viel
    scale(breathe, breathe * 1.04);
  }
  
  let wendigoSize = wendigo.size + sin(frameCount * 0.05) * 6 + bass * 32 + wendigo.kickPulse * 30;
  
  // Eisige Aura - kalter Nebel
  for (let i = 7; i > 0; i--) {
    let brightness = 55 + bass * 35 + wendigo.kickPulse * 50;
    noStroke();
    fill(brightness, brightness, brightness + 5, 5 + bass * 12 + wendigo.kickPulse * 10);
    ellipse(0, 0, 
            wendigoSize + i * 48 + bass * 25 + wendigo.kickPulse * 30, 
            wendigoSize + i * 52 + bass * 28);
  }
  
  // === MASSIVE GEWEIH ===
  drawWendigoAntlers(wendigoSize);
  
  // === WENDIGO SCHÄDEL - Hirsch/Elch-artig ===
  fill(110, 110, 110); // Heller
  stroke(75, 75, 75); // Heller
  strokeWeight(2.5 + bass * 1);
  
  // Langgestreckter Schädel (Hirsch-Form)
  beginShape();
  vertex(0, -wendigoSize * 0.65); // Spitze oben
  bezierVertex(-wendigoSize * 0.22, -wendigoSize * 0.6, -wendigoSize * 0.38, -wendigoSize * 0.5, -wendigoSize * 0.42, -wendigoSize * 0.3);
  bezierVertex(-wendigoSize * 0.42, -wendigoSize * 0.1, -wendigoSize * 0.38, wendigoSize * 0.05, -wendigoSize * 0.3, wendigoSize * 0.15);
  // Schnauze beginnt
  bezierVertex(-wendigoSize * 0.25, wendigoSize * 0.25, -wendigoSize * 0.18, wendigoSize * 0.35, -wendigoSize * 0.12, wendigoSize * 0.42);
  vertex(-wendigoSize * 0.05, wendigoSize * 0.45);
  vertex(wendigoSize * 0.05, wendigoSize * 0.45);
  vertex(wendigoSize * 0.12, wendigoSize * 0.42);
  bezierVertex(wendigoSize * 0.18, wendigoSize * 0.35, wendigoSize * 0.25, wendigoSize * 0.25, wendigoSize * 0.3, wendigoSize * 0.15);
  bezierVertex(wendigoSize * 0.38, wendigoSize * 0.05, wendigoSize * 0.42, -wendigoSize * 0.1, wendigoSize * 0.42, -wendigoSize * 0.3);
  bezierVertex(wendigoSize * 0.38, -wendigoSize * 0.5, wendigoSize * 0.22, -wendigoSize * 0.6, 0, -wendigoSize * 0.65);
  endShape(CLOSE);
  
  // Schädelstruktur - Knochenkanten
  noFill();
  stroke(78, 78, 78);
  strokeWeight(2);
  // Mittelnaht
  line(0, -wendigoSize * 0.6, 0, wendigoSize * 0.2);
  
  // Jochbein-Struktur
  for (let side of [-1, 1]) {
    arc(side * wendigoSize * 0.25, -wendigoSize * 0.15, wendigoSize * 0.3, wendigoSize * 0.25, 0, PI);
  }
  
  // Schnauzen-Kanten
  stroke(100, 100, 100);
  strokeWeight(1.5);
  for (let side of [-1, 1]) {
    line(side * wendigoSize * 0.3, wendigoSize * 0.15, side * wendigoSize * 0.12, wendigoSize * 0.42);
  }
  
  // Knöcherne Rippen auf Schnauze
  stroke(95, 95, 95);
  strokeWeight(1.2);
  for (let i = 0; i < 5; i++) {
    let y = map(i, 0, 4, wendigoSize * 0.2, wendigoSize * 0.4);
    let width = map(i, 0, 4, wendigoSize * 0.2, wendigoSize * 0.1);
    line(-width, y, width, y);
  }
  
  // Knochentextur - Risse und Verwitterung
  stroke(102, 102, 102, 130);
  strokeWeight(0.8);
  for (let i = 0; i < 40; i++) {
    let angle = random(TWO_PI);
    let dist = random(wendigoSize * 0.15, wendigoSize * 0.4);
    let x = cos(angle) * dist;
    let y = sin(angle) * dist - wendigoSize * 0.2;
    let crackLength = random(5, 12);
    let crackAngle = random(TWO_PI);
    
    line(x, y, x + cos(crackAngle) * crackLength, y + sin(crackAngle) * crackLength);
  }
  
  // === AUGEN - EXTREM INTENSIV, WAHNSINNIGER HUNGER ===
  let eyeSize = 42 + bass * 24 + wendigo.kickPulse * 20; // GRÖßER
  
  // Sehr tiefe, schwarze Augenhöhlen
  fill(3, 3, 3); // Fast schwarz
  noStroke();
  ellipse(-wendigoSize * 0.28, -wendigoSize * 0.35, wendigoSize * 0.28, wendigoSize * 0.36);
  ellipse(wendigoSize * 0.28, -wendigoSize * 0.35, wendigoSize * 0.28, wendigoSize * 0.36);
  
  // BEDROHLICHE Knöcherne Augenhöhlen-Ränder - dicker, prominenter
  noFill();
  stroke(85, 85, 85);
  strokeWeight(3.5);
  ellipse(-wendigoSize * 0.28, -wendigoSize * 0.35, wendigoSize * 0.32, wendigoSize * 0.4);
  ellipse(wendigoSize * 0.28, -wendigoSize * 0.35, wendigoSize * 0.32, wendigoSize * 0.4);
  
  // Zusätzliche Risse um Augen (Wahnsinn)
  stroke(90, 90, 90, 150);
  strokeWeight(1.5);
  for (let side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      let angle = random(TWO_PI);
      let dist = wendigoSize * random(0.32, 0.42);
      let x = side * wendigoSize * 0.28 + cos(angle) * dist;
      let y = -wendigoSize * 0.35 + sin(angle) * dist;
      let len = random(8, 16);
      line(x, y, x + cos(angle) * len, y + sin(angle) * len);
    }
  }
  
  drawWendigoEye(-wendigoSize * 0.28, -wendigoSize * 0.35, eyeSize);
  drawWendigoEye(wendigoSize * 0.28, -wendigoSize * 0.35, eyeSize);
  
  // === NASENHÖHLEN (Hirsch-Schädel) ===
  fill(18, 18, 18);
  stroke(12, 12, 12);
  strokeWeight(1.5);
  // Große Nasenlöcher
  ellipse(-wendigoSize * 0.1, wendigoSize * 0.25, 14, 20);
  ellipse(wendigoSize * 0.1, wendigoSize * 0.25, 14, 20);
  
  // Innere Dunkelheit
  fill(8, 8, 8);
  noStroke();
  ellipse(-wendigoSize * 0.1, wendigoSize * 0.25, 10, 16);
  ellipse(wendigoSize * 0.1, wendigoSize * 0.25, 10, 16);
  
  // === KIEFER & ZÄHNE - Raubtier-Gebiss ===
  // Unterkiefer
  fill(80, 80, 80);
  stroke(60, 60, 60);
  strokeWeight(2.5);
  
  beginShape();
  vertex(-wendigoSize * 0.12, wendigoSize * 0.42);
  bezierVertex(-wendigoSize * 0.08, wendigoSize * 0.48, -wendigoSize * 0.04, wendigoSize * 0.5, 0, wendigoSize * 0.51);
  bezierVertex(wendigoSize * 0.04, wendigoSize * 0.5, wendigoSize * 0.08, wendigoSize * 0.48, wendigoSize * 0.12, wendigoSize * 0.42);
  vertex(wendigoSize * 0.1, wendigoSize * 0.38);
  vertex(-wendigoSize * 0.1, wendigoSize * 0.38);
  endShape(CLOSE);
  
  // SCHARFE ZÄHNE - BRUTALES RAUBTIERGEBISS
  fill(110, 110, 110); // Heller für mehr Sichtbarkeit
  stroke(80, 80, 80);
  strokeWeight(1.5);
  
  // MASSIVE Obere Fangzähne - VIEL GRÖßER
  let mainFangs = [-wendigoSize * 0.16, -wendigoSize * 0.06, wendigoSize * 0.06, wendigoSize * 0.16];
  for (let pos of mainFangs) {
    let fangHeight = 32 + bass * 14 + (isBeat ? 12 : 0); // DOPPELT so groß
    let fangWidth = 6 + bass * 2; // Breiter
    triangle(pos - fangWidth, wendigoSize * 0.38, pos, wendigoSize * 0.38 + fangHeight, pos + fangWidth, wendigoSize * 0.38);
  }
  
  // Sekundäre lange Fangzähne
  fill(105, 105, 105);
  let secondaryFangs = [-wendigoSize * 0.22, -wendigoSize * 0.11, wendigoSize * 0.11, wendigoSize * 0.22];
  for (let pos of secondaryFangs) {
    let fangHeight = 24 + bass * 10 + (isBeat ? 8 : 0);
    triangle(pos - 4, wendigoSize * 0.39, pos, wendigoSize * 0.39 + fangHeight, pos + 4, wendigoSize * 0.39);
  }
  
  // Weitere mittlere Zähne (spitzer, unregelmäßig)
  fill(100, 100, 100);
  for (let i = -6; i <= 6; i++) {
    if (i !== 0 && abs(i) !== 1 && abs(i) !== 2 && abs(i) !== 3 && abs(i) !== 4) {
      let x = i * wendigoSize * 0.03;
      let toothHeight = random(14, 22) + bass * 6 + (isBeat ? 4 : 0); // Länger
      let wobble = random(-2, 2); // Unregelmäßig
      triangle(x - 2.5 + wobble, wendigoSize * 0.4, x + wobble, wendigoSize * 0.4 + toothHeight, x + 2.5 + wobble, wendigoSize * 0.4);
    }
  }
  
  // Untere Zähne - auch größer und bedrohlicher
  fill(58, 58, 58);
  for (let i = -4; i <= 4; i++) {
    let x = i * wendigoSize * 0.04;
    let toothHeight = random(12, 18) + bass * 5 + (isBeat ? 4 : 0); // Größer
    let wobble = random(-1.5, 1.5);
    triangle(x - 2 + wobble, wendigoSize * 0.48, x + wobble, wendigoSize * 0.48 - toothHeight, x + 2 + wobble, wendigoSize * 0.48);
  }
  
  // Blutige/dunkle Flecken auf Zähnen (Jäger-Motiv)
  fill(25, 25, 25, 180);
  noStroke();
  for (let i = 0; i < 8; i++) {
    let x = random(-wendigoSize * 0.2, wendigoSize * 0.2);
    let y = random(wendigoSize * 0.42, wendigoSize * 0.52);
    ellipse(x, y, random(3, 6), random(2, 4));
  }
  
  // === DÜRRER KÖRPER & RIPPEN ===
  drawWendigoRibs(wendigoSize);
  
  // === ZUSÄTZLICHE WENDIGO-DETAILS ===
  drawWendigoDetails(wendigoSize);
  
  pop();
}

// Massive, bedrohliche Flügel
function drawNightmareWings(size) {
  push();
  
  fill(45, 45, 45, 200);
  stroke(22, 22, 22);
  strokeWeight(2);
  
  let wingSpread = 0.6 + sin(cthulhu.wingPhase) * 0.35 + bass * 0.5;
  let wingBeat = sin(cthulhu.wingPhase * 2) * 0.15;
  
  // Linker Flügel - zerissen, urzeitlich
  push();
  translate(-size * 0.42, -size * 0.35);
  rotate(-0.4 - wingSpread + wingBeat);
  
  // Hauptflügel
  beginShape();
  vertex(0, 0);
  bezierVertex(-25, -15, -50, -25, -85 - bass * 18, -30);
  bezierVertex(-100, -20, -110, 5, -105, 35);
  bezierVertex(-95, 50, -70, 55, -45, 50);
  bezierVertex(-20, 42, -8, 30, 0, 20);
  // Zerrissener Rand
  vertex(-5, 25);
  vertex(-10, 30);
  vertex(-15, 28);
  vertex(-25, 35);
  vertex(-35, 33);
  vertex(-50, 40);
  endShape(CLOSE);
  
  // Flügelknochen/Adern - prominent
  stroke(30, 30, 30);
  strokeWeight(2.5);
  line(0, 0, -85 - bass * 18, -30);
  strokeWeight(1.8);
  line(0, 8, -75, -15);
  line(0, 15, -65, 5);
  strokeWeight(1.2);
  line(-30, -10, -70, 25);
  line(-50, -5, -85, 20);
  
  // Krallen an Flügelspitzen
  fill(35, 35, 35);
  triangle(-85 - bass * 18, -30, -90 - bass * 18, -35, -88 - bass * 18, -28);
  
  pop();
  
  // Rechter Flügel
  push();
  translate(size * 0.42, -size * 0.35);
  rotate(0.4 + wingSpread - wingBeat);
  
  beginShape();
  vertex(0, 0);
  bezierVertex(25, -15, 50, -25, 85 + bass * 18, -30);
  bezierVertex(100, -20, 110, 5, 105, 35);
  bezierVertex(95, 50, 70, 55, 45, 50);
  bezierVertex(20, 42, 8, 30, 0, 20);
  vertex(5, 25);
  vertex(10, 30);
  vertex(15, 28);
  vertex(25, 35);
  vertex(35, 33);
  vertex(50, 40);
  endShape(CLOSE);
  
  stroke(30, 30, 30);
  strokeWeight(2.5);
  line(0, 0, 85 + bass * 18, -30);
  strokeWeight(1.8);
  line(0, 8, 75, -15);
  line(0, 15, 65, 5);
  strokeWeight(1.2);
  line(30, -10, 70, 25);
  line(50, -5, 85, 20);
  
  fill(35, 35, 35);
  triangle(85 + bass * 18, -30, 90 + bass * 18, -35, 88 + bass * 18, -28);
  
  pop();
  
  pop();
}

// MASSIVE KRALLEN - statt Tentakel
function drawMassiveClaws(size) {
  // 6 riesige Krallen - 3 pro Seite
  let clawPositions = [
    // Linke Seite
    {x: -size * 0.5, y: -size * 0.2, angle: -2.8, length: 90, width: 25},
    {x: -size * 0.52, y: size * 0.1, angle: -2.5, length: 110, width: 30},
    {x: -size * 0.48, y: size * 0.35, angle: -2.2, length: 85, width: 22},
    // Rechte Seite
    {x: size * 0.5, y: -size * 0.2, angle: 2.8, length: 90, width: 25},
    {x: size * 0.52, y: size * 0.1, angle: 2.5, length: 110, width: 30},
    {x: size * 0.48, y: size * 0.35, angle: 2.2, length: 85, width: 22}
  ];
  
  for (let i = 0; i < clawPositions.length; i++) {
    let claw = clawPositions[i];
    
    push();
    translate(claw.x, claw.y);
    
    // Bedrohliche Bewegung
    let wobble = sin(frameCount * 0.04 + i) * 0.15 + bass * 0.2;
    let beatExtend = isBeat ? bass * 0.3 : 0;
    rotate(claw.angle + wobble + beatExtend);
    
    let clawLength = claw.length + bass * 20 + (isBeat ? 15 : 0);
    let clawWidth = claw.width + bass * 5 + (isBeat ? 4 : 0);
    
    // KLAUEN-ARM (massiv, muskulös)
    fill(42, 42, 42);
    stroke(28, 28, 28);
    strokeWeight(2.5);
    
    // Unterarm
    beginShape();
    vertex(0, 0);
    vertex(clawWidth * 0.8, 0);
    vertex(clawWidth * 0.6, clawLength * 0.5);
    vertex(clawWidth * 0.3, clawLength * 0.5);
    endShape(CLOSE);
    
    // Gelenk
    fill(38, 38, 38);
    ellipse(clawWidth * 0.45, clawLength * 0.5, clawWidth * 0.7, clawWidth * 0.5);
    
    // Oberarm (zur Kralle)
    fill(40, 40, 40);
    beginShape();
    vertex(clawWidth * 0.3, clawLength * 0.5);
    vertex(clawWidth * 0.6, clawLength * 0.5);
    vertex(clawWidth * 0.5, clawLength * 0.85);
    vertex(clawWidth * 0.2, clawLength * 0.85);
    endShape(CLOSE);
    
    // Muskel-Details
    noFill();
    stroke(52, 52, 52);
    strokeWeight(1.2);
    line(clawWidth * 0.4, clawLength * 0.15, clawWidth * 0.5, clawLength * 0.35);
    line(clawWidth * 0.35, clawLength * 0.55, clawWidth * 0.45, clawLength * 0.75);
    
    // HAUPT-KRALLE (drei Klauen pro Hand)
    let clawTips = [
      {offsetX: 0, offsetY: 0, length: 1.0, curve: 0},
      {offsetX: -clawWidth * 0.3, offsetY: -5, length: 0.85, curve: -0.15},
      {offsetX: clawWidth * 0.3, offsetY: -5, length: 0.85, curve: 0.15}
    ];
    
    for (let j = 0; j < clawTips.length; j++) {
      let tip = clawTips[j];
      
      push();
      translate(clawWidth * 0.35 + tip.offsetX, clawLength * 0.85 + tip.offsetY);
      rotate(tip.curve);
      
      let tipLength = clawLength * 0.35 * tip.length + bass * 8;
      
      // Krallen-Form (gebogen, scharf)
      fill(48, 48, 48);
      stroke(30, 30, 30);
      strokeWeight(2);
      
      beginShape();
      vertex(0, 0);
      bezierVertex(
        -clawWidth * 0.12, tipLength * 0.3,
        -clawWidth * 0.15, tipLength * 0.6,
        -clawWidth * 0.08, tipLength
      );
      vertex(0, tipLength + 5); // Scharfe Spitze
      bezierVertex(
        clawWidth * 0.08, tipLength,
        clawWidth * 0.15, tipLength * 0.6,
        clawWidth * 0.12, tipLength * 0.3
      );
      vertex(0, 0);
      endShape(CLOSE);
      
      // Krallen-Glanz
      fill(65, 65, 65, 180);
      noStroke();
      ellipse(-clawWidth * 0.05, tipLength * 0.3, clawWidth * 0.08, tipLength * 0.15);
      
      // Krallen-Schatten (Tiefe)
      fill(20, 20, 20, 120);
      beginShape();
      vertex(clawWidth * 0.02, tipLength * 0.4);
      vertex(clawWidth * 0.08, tipLength * 0.7);
      vertex(clawWidth * 0.04, tipLength);
      vertex(0, tipLength + 5);
      endShape(CLOSE);
      
      pop();
    }
    
    pop();
  }
}

// ELDRITCH DETAILS - MASSIV ERWEITERT für maximale Bedrohlichkeit
function drawEldritchDetails(size) {
  // === MASSIVE HÖRNER/AUSWÜCHSE am Kopf ===
  fill(45, 45, 45);
  stroke(28, 28, 28);
  strokeWeight(2);
  
  // 8 knochige Auswüchse/Hörner
  for (let i = 0; i < 8; i++) {
    let angle = (i / 8) * PI + PI;
    let dist = size * 0.42;
    let x = cos(angle) * dist;
    let y = sin(angle) * dist - size * 0.15;
    
    push();
    translate(x, y);
    rotate(angle);
    
    // Variierende Horngrößen
    let hornLength = (i % 2 === 0) ? 22 + bass * 8 : 15 + bass * 5;
    let hornWidth = (i % 2 === 0) ? 10 : 7;
    
    // Horn/Auswuchs mit Textur
    beginShape();
    vertex(-hornWidth/2, 0);
    vertex(-hornWidth/3, -hornLength * 0.6);
    vertex(0, -hornLength);
    vertex(hornWidth/3, -hornLength * 0.6);
    vertex(hornWidth/2, 0);
    endShape(CLOSE);
    
    // Horn-Rillen
    noFill();
    stroke(35, 35, 35);
    strokeWeight(0.8);
    for (let r = 0; r < 3; r++) {
      let ringY = -hornLength * (0.3 + r * 0.2);
      let ringWidth = hornWidth * (1 - r * 0.15);
      line(-ringWidth/2, ringY, ringWidth/2, ringY);
    }
    
    pop();
  }
  
  // === STACHELN auf dem Rücken/Nacken ===
  fill(38, 38, 38);
  stroke(25, 25, 25);
  strokeWeight(1.5);
  
  for (let i = 0; i < 6; i++) {
    let x = map(i, 0, 5, -size * 0.25, size * 0.25);
    let y = -size * 0.55 + abs(i - 2.5) * 5;
    let spikeHeight = 18 + bass * 6;
    
    triangle(x - 4, y, x, y - spikeHeight, x + 4, y);
  }
  
  // === KNOCHIGE WÜLSTE & PLATTEN ===
  noFill();
  stroke(55, 55, 55, 180);
  strokeWeight(2.5);
  
  // Schulterpanzer links
  push();
  translate(-size * 0.45, -size * 0.25);
  beginShape();
  vertex(0, 0);
  bezierVertex(-15, -10, -25, -15, -30, -10);
  bezierVertex(-28, 0, -20, 10, 0, 8);
  endShape();
  pop();
  
  // Schulterpanzer rechts
  push();
  translate(size * 0.45, -size * 0.25);
  beginShape();
  vertex(0, 0);
  bezierVertex(15, -10, 25, -15, 30, -10);
  bezierVertex(28, 0, 20, 10, 0, 8);
  endShape();
  pop();
  
  // === PULSIERENDES ORGANISCHES MATERIAL ===
  fill(40, 40, 40, 200);
  noStroke();
  for (let i = 0; i < 12; i++) {
    let angle = random(TWO_PI);
    let dist = random(size * 0.32, size * 0.5);
    let x = cos(angle) * dist;
    let y = sin(angle) * dist - size * 0.12;
    let wobble = sin(frameCount * 0.05 + i) * 4;
    let pulse = 1 + sin(frameCount * 0.08 + i * 0.5) * 0.2;
    
    ellipse(x + wobble, y, random(8, 15) * pulse, random(10, 18) * pulse);
  }
  
  // === ADERN & BIOMECHANISCHE STRUKTUREN ===
  stroke(48, 48, 48, 160);
  strokeWeight(1.8);
  
  // Pulsierende Adern vom Kopf zum Körper
  for (let i = 0; i < 6; i++) {
    let startAngle = (i / 6) * TWO_PI;
    let x1 = cos(startAngle) * size * 0.3;
    let y1 = sin(startAngle) * size * 0.3 - size * 0.2;
    let x2 = cos(startAngle) * size * 0.48;
    let y2 = sin(startAngle) * size * 0.48 - size * 0.05;
    
    // Pulsierende Dicke
    let veinPulse = 1 + sin(frameCount * 0.1 + i) * 0.3 + bass * 0.4;
    strokeWeight(1.5 * veinPulse);
    
    bezier(x1, y1, 
           x1 + random(-12, 12), y1 + 25,
           x2 + random(-12, 12), y2 - 25,
           x2, y2);
  }
  
  // === SCHLEIMTROPFEN & ALBTRAUM-EFFEKTE ===
  if (isBeat || bass > 0.6) {
    fill(58, 58, 58, 220);
    noStroke();
    
    // Mehrere Schleimtropfen
    for (let d = 0; d < 3; d++) {
      let dropX = random(-size * 0.35, size * 0.35);
      let dropY = size * 0.32 + d * 12;
      ellipse(dropX, dropY, 5, 10);
      ellipse(dropX, dropY + 12, 4, 7);
      ellipse(dropX + 1, dropY + 18, 3, 5);
    }
  }
  
  // === GLÜHENDE RISSE (bei Beat) ===
  if (isBeat) {
    stroke(85 + bass * 40, 85 + bass * 40, 85 + bass * 40, 180);
    strokeWeight(2 + bass * 2);
    
    // Risse im Kopf
    for (let i = 0; i < 5; i++) {
      let startX = random(-size * 0.35, size * 0.35);
      let startY = random(-size * 0.4, size * 0.1);
      let crackLength = random(15, 30);
      let crackAngle = random(TWO_PI);
      
      line(startX, startY, 
           startX + cos(crackAngle) * crackLength, 
           startY + sin(crackAngle) * crackLength);
    }
  }
  
  // === SCHWELENDE PARTIKEL um Cthulhu ===
  if (random() > 0.92) {
    fill(70 + bass * 30, 70 + bass * 30, 70 + bass * 30, 200);
    noStroke();
    let px = random(-size * 0.6, size * 0.6);
    let py = random(-size * 0.6, size * 0.6);
    ellipse(px, py, random(2, 5), random(2, 5));
  }
}

// CTHULHU AUGE - ALBTRAUM-WAHNSINN einflößend
function drawCthulhuEye(x, y, size) {
  push();
  translate(x, y);
  
  // Unnatürlicher Glanz - hypnotisch
  if (isBeat) {
    for (let i = 3; i > 0; i--) {
      fill(95, 95, 95, 60 - i * 15);
      noStroke();
      ellipse(0, 0, size * (1.2 + i * 0.15), size * (1.25 + i * 0.15));
    }
  }
  
  // Augapfel - gelblich-grau (kränklich)
  fill(82, 82, 82);
  stroke(58, 58, 58);
  strokeWeight(1.8);
  ellipse(0, 0, size * 0.98, size * 1.08);
  
  // MASSIVE Bloodshot Adern - stark pulsierend
  let veinBrightness = 42 + bass * 18 + (isBeat ? 15 : 0);
  stroke(veinBrightness, veinBrightness, veinBrightness, 220);
  
  // Hauptadern
  strokeWeight(2.2 + bass * 0.8);
  for (let i = 0; i < 12; i++) {
    let angle = (i / 12) * TWO_PI + sin(frameCount * 0.02 + i) * 0.2;
    let len = size * 0.42;
    let x1 = cos(angle) * (size * 0.08);
    let y1 = sin(angle) * (size * 0.08);
    let x2 = cos(angle) * len;
    let y2 = sin(angle) * len;
    
    // Unregelmäßige Adern
    bezier(x1, y1, 
           x1 + random(-3, 3), y1 + random(-3, 3),
           x2 + random(-5, 5), y2 + random(-5, 5),
           x2, y2);
  }
  
  // Feinere Adern
  strokeWeight(1.2);
  stroke(veinBrightness + 8, veinBrightness + 8, veinBrightness + 8, 160);
  for (let i = 0; i < 20; i++) {
    let angle = random(TWO_PI);
    let len = random(size * 0.25, size * 0.45);
    let x1 = random(-size * 0.1, size * 0.1);
    let y1 = random(-size * 0.1, size * 0.1);
    line(x1, y1, cos(angle) * len + x1, sin(angle) * len + y1);
  }
  
  // Iris - hypnotisch rotierend, mehrschichtig
  let irisSize = size * 0.58 + bass * 10 + (isBeat ? 8 : 0);
  
  // Äußerer Irisring
  fill(48, 48, 48);
  noStroke();
  ellipse(0, 0, irisSize, irisSize);
  
  // Radiales Muster - NON-EUKLIDISCH
  stroke(62, 62, 62);
  strokeWeight(1.5);
  let rotationSpeed = frameCount * 0.015;
  for (let i = 0; i < 18; i++) {
    let angle = (i / 18) * TWO_PI + rotationSpeed;
    let r1 = irisSize * 0.15;
    let r2 = irisSize * 0.48;
    
    // Spiralförmige Linien
    let spiralOffset = sin(i * 0.5 + frameCount * 0.03) * 0.3;
    let endAngle = angle + spiralOffset;
    line(cos(angle) * r1, sin(angle) * r1, 
         cos(endAngle) * r2, sin(endAngle) * r2);
  }
  
  // Innere Iris - dunkler
  fill(35, 35, 35);
  noStroke();
  ellipse(0, 0, irisSize * 0.7, irisSize * 0.7);
  
  // Ringstrukturen
  noFill();
  stroke(50, 50, 50);
  strokeWeight(1);
  for (let r = 0.2; r < 0.65; r += 0.15) {
    ellipse(0, 0, irisSize * r, irisSize * r);
  }
  
  // Pupille - horizontal geschlitzt, REPTILIENARTIG
  fill(8, 8, 8);
  noStroke();
  let pupilWidth = size * 0.5 + bass * 9 + (isBeat ? 10 : 0);
  let pupilHeight = size * 0.1 + bass * 3 + (isBeat ? 3 : 0);
  ellipse(0, 0, pupilWidth, pupilHeight);
  
  // Pupille - Innerer Schatten
  fill(18, 18, 18, 180);
  ellipse(0, 0, pupilWidth * 0.8, pupilHeight * 0.7);
  
  // Eldritch Glanz - mehrere unnatürliche Lichtpunkte
  fill(105 + bass * 35, 105 + bass * 35, 105 + bass * 35, 240);
  ellipse(-size * 0.12, -size * 0.06, size * 0.16, size * 0.14);
  fill(90 + bass * 25, 90 + bass * 25, 90 + bass * 25, 180);
  ellipse(size * 0.08, size * 0.04, size * 0.1, size * 0.08);
  
  // Dritter, sehr kleiner Lichtpunkt (unheimlich)
  fill(110 + bass * 30, 110 + bass * 30, 110 + bass * 30, 200);
  ellipse(size * 0.15, -size * 0.1, size * 0.06, size * 0.06);
  
  pop();
}

// =================== WENDIGO FUNKTIONEN ===================

// WENDIGO GEWEIH - Massiv und verzweigt
function drawWendigoAntlers(size) {
  fill(100, 100, 100); // Heller
  stroke(78, 78, 78); // Heller
  strokeWeight(3);
  
  // Haupt-Geweihstangen
  for (let side of [-1, 1]) {
    push();
    translate(side * size * 0.35, -size * 0.5);
    
    let wobble = sin(wendigo.antlerPhase + side) * 0.08;
    rotate(side * (0.3 + wobble + bass * 0.15));
    
    // Hauptstange - MASSIVER
    let mainLength = 110 + bass * 22; // Viel länger
    strokeWeight(10 + bass * 4); // Dicker
    line(0, 0, 0, -mainLength);
    
    // Verzweigungen (8 pro Seite statt 6) - MEHR und GRÖßER
    strokeWeight(6 + bass * 3);
    for (let i = 0; i < 8; i++) {
      let branchY = -mainLength * (0.25 + i * 0.1);
      let branchAngle = side * (0.35 + i * 0.13);
      let branchLength = 40 + i * 7 + bass * 12; // Länger
      
      push();
      translate(0, branchY);
      rotate(branchAngle);
      line(0, 0, 0, -branchLength);
      
      // Sub-Verzweigungen
      if (i > 1) {
        strokeWeight(3);
        let subAngle = side * 0.5;
        let subLength = branchLength * 0.6;
        push();
        translate(0, -branchLength * 0.6);
        rotate(subAngle);
        line(0, 0, 0, -subLength);
        pop();
      }
      
      pop();
    }
    
    // Geweih-Spitzen
    strokeWeight(4);
    fill(95, 95, 95); // Heller
    triangle(-4, -mainLength, 0, -mainLength - 12, 4, -mainLength);
    
    pop();
  }
}

// WENDIGO AUGEN - Glühend und hungrig
function drawWendigoEye(x, y, size) {
  push();
  translate(x, y);
  
  // TÜRKISE AUGEN während Warnung UND während Shake
  let isTurquoise = wendigo.eyesWarning; // Bleibt türkis während Warnung UND Shake
  
  // Intensiver Glanz
  if (wendigo.kickPulse > 0.1 || bass > 0.6 || isTurquoise) {
    for (let i = 3; i > 0; i--) {
      if (isTurquoise) {
        // TÜRKIS Glow
        let pulsate = sin(frameCount * 0.3) * 20;
        fill(80 + pulsate, 200 + pulsate, 220 + pulsate, 100 - i * 20);
      } else {
        fill(120 + bass * 40, 120 + bass * 40, 120 + bass * 40, 80 - i * 18); // Heller
      }
      noStroke();
      ellipse(0, 0, size * (1.3 + i * 0.2), size * (1.4 + i * 0.2));
    }
  }
  
  // Augapfel (klein, zurückgesetzt)
  fill(130, 130, 130); // Heller
  stroke(105, 105, 105); // Heller
  strokeWeight(1.5);
  ellipse(0, 0, size * 0.7, size * 0.8);
  
  // Iris - wild, wahnsinnig - TÜRKIS bei Warnung
  let irisSize = size * 0.55 + bass * 8 + wendigo.kickPulse * 7;
  if (isTurquoise) {
    // INTENSIV TÜRKIS
    let pulsate = sin(frameCount * 0.25) * 30;
    fill(60 + pulsate, 190 + pulsate, 210 + pulsate);
  } else {
    fill(90, 90, 90); // Heller
  }
  noStroke();
  ellipse(0, 0, irisSize, irisSize);
  
  // Pupille - klein, fokussiert (Raubtier)
  fill(5, 5, 5);
  let pupilSize = size * 0.18 + bass * 4 + wendigo.kickPulse * 5;
  ellipse(0, 0, pupilSize, pupilSize);
  
  // GLÜHENDER Punkt (Hunger, Wahnsinn) - TÜRKIS bei Warnung
  if (isTurquoise) {
    let pulsate = sin(frameCount * 0.4) * 40;
    fill(100 + pulsate, 220 + pulsate, 240 + pulsate, 250);
  } else {
    fill(110 + bass * 45, 110 + bass * 45, 110 + bass * 45, 250);
  }
  ellipse(-size * 0.08, -size * 0.06, size * 0.22, size * 0.18);
  
  // Sekundärer Glanz
  if (isTurquoise) {
    fill(120, 210, 230, 200);
  } else {
    fill(95 + bass * 30, 95 + bass * 30, 95 + bass * 30, 180);
  }
  ellipse(size * 0.06, size * 0.04, size * 0.12, size * 0.1);
  
  pop();
}

// WENDIGO RIPPEN - Ausgehungert
function drawWendigoRibs(size) {
  stroke(60, 60, 60); // Heller
  strokeWeight(3);
  noFill();
  
  // 8 Rippenpaare
  for (let i = 0; i < 8; i++) {
    let y = size * (-0.1 + i * 0.08);
    let ribWidth = size * (0.35 - i * 0.02);
    let ribHeight = size * 0.12;
    
    for (let side of [-1, 1]) {
      push();
      translate(side * size * 0.05, y);
      
      // Gebogene Rippe
      beginShape();
      vertex(0, 0);
      bezierVertex(
        side * ribWidth * 0.3, -ribHeight * 0.3,
        side * ribWidth * 0.7, -ribHeight * 0.1,
        side * ribWidth, 0
      );
      bezierVertex(
        side * ribWidth * 0.8, ribHeight * 0.2,
        side * ribWidth * 0.5, ribHeight * 0.3,
        side * size * 0.1, ribHeight * 0.15
      );
      endShape();
      
      pop();
    }
  }
  
  // Wirbelsäule (sichtbar)
  stroke(65, 65, 65); // Heller
  strokeWeight(4);
  line(0, -size * 0.1, 0, size * 0.5);
  
  // Wirbel-Details
  fill(60, 60, 60); // Heller
  stroke(42, 42, 42); // Heller
  strokeWeight(1.5);
  for (let i = 0; i < 7; i++) {
    let y = size * (-0.08 + i * 0.085);
    ellipse(0, y, 12, 8);
  }
}

// WENDIGO KRALLEN - Lang und scharf
function drawWendigoClaws(size) {
  // 4 Krallen - 2 pro Seite
  let clawPositions = [
    {x: -size * 0.55, y: size * 0.05, angle: -2.6, length: 95, width: 20},
    {x: -size * 0.52, y: size * 0.35, angle: -2.3, length: 85, width: 18},
    {x: size * 0.55, y: size * 0.05, angle: 2.6, length: 95, width: 20},
    {x: size * 0.52, y: size * 0.35, angle: 2.3, length: 85, width: 18}
  ];
  
  for (let i = 0; i < clawPositions.length; i++) {
    let claw = clawPositions[i];
    
    push();
    translate(claw.x, claw.y);
    
    let wobble = sin(frameCount * 0.05 + i) * 0.18 + bass * 0.25;
    let beatExtend = isBeat ? bass * 0.35 : 0;
    rotate(claw.angle + wobble + beatExtend);
    
    let clawLength = claw.length + bass * 22 + (isBeat ? 18 : 0);
    let clawWidth = claw.width + bass * 4 + (isBeat ? 3 : 0);
    
    // Dürrer Arm
    fill(58, 58, 58); // Heller
    stroke(38, 38, 38); // Heller
    strokeWeight(2);
    
    beginShape();
    vertex(0, 0);
    vertex(clawWidth * 0.6, 0);
    vertex(clawWidth * 0.4, clawLength * 0.5);
    vertex(clawWidth * 0.2, clawLength * 0.5);
    endShape(CLOSE);
    
    // Knochenstruktur sichtbar
    noFill();
    stroke(68, 68, 68); // Heller
    strokeWeight(1.5);
    line(clawWidth * 0.3, clawLength * 0.15, clawWidth * 0.4, clawLength * 0.35);
    
    // Gelenk
    fill(52, 52, 52); // Heller
    stroke(38, 38, 38); // Heller
    strokeWeight(2);
    ellipse(clawWidth * 0.3, clawLength * 0.5, clawWidth * 0.6, clawWidth * 0.4);
    
    // Unterarm
    fill(55, 55, 55); // Heller
    beginShape();
    vertex(clawWidth * 0.2, clawLength * 0.5);
    vertex(clawWidth * 0.4, clawLength * 0.5);
    vertex(clawWidth * 0.35, clawLength * 0.85);
    vertex(clawWidth * 0.15, clawLength * 0.85);
    endShape(CLOSE);
    
    // 4 Lange Krallen pro Hand
    let clawTips = [
      {offsetX: -clawWidth * 0.25, offsetY: 0, length: 1.0, curve: -0.2},
      {offsetX: -clawWidth * 0.08, offsetY: -3, length: 1.15, curve: -0.1},
      {offsetX: clawWidth * 0.08, offsetY: -3, length: 1.15, curve: 0.1},
      {offsetX: clawWidth * 0.25, offsetY: 0, length: 1.0, curve: 0.2}
    ];
    
    for (let j = 0; j < clawTips.length; j++) {
      let tip = clawTips[j];
      
      push();
      translate(clawWidth * 0.25 + tip.offsetX, clawLength * 0.85 + tip.offsetY);
      rotate(tip.curve);
      
      let tipLength = clawLength * 0.4 * tip.length + bass * 10;
      
      // Lange, gebogene Kralle
      fill(68, 68, 68); // Heller
      stroke(45, 45, 45); // Heller
      strokeWeight(2);
      
      beginShape();
      vertex(0, 0);
      bezierVertex(
        -clawWidth * 0.08, tipLength * 0.25,
        -clawWidth * 0.12, tipLength * 0.55,
        -clawWidth * 0.06, tipLength
      );
      vertex(0, tipLength + 6); // Sehr scharfe Spitze
      bezierVertex(
        clawWidth * 0.06, tipLength,
        clawWidth * 0.12, tipLength * 0.55,
        clawWidth * 0.08, tipLength * 0.25
      );
      vertex(0, 0);
      endShape(CLOSE);
      
      // Krallen-Glanz
      fill(90, 90, 90, 200); // Heller
      noStroke();
      ellipse(-clawWidth * 0.04, tipLength * 0.25, clawWidth * 0.06, tipLength * 0.12);
      
      pop();
    }
    
    pop();
  }
}

// WENDIGO DETAILS - Minimale Details
function drawWendigoDetails(size) {
  // Keine Partikel mehr - cleaner Look
}

// =================== ENDE WENDIGO FUNKTIONEN ===================

function drawPsychedelicEffects() {
  // Kaleidoskop-Effekt - STRAHLEN MIT WELLUNG UND VERBREITERUNG in BLAU/TÜRKIS/LILA/VIOLETT
  if (bass > 0.4) {
    push();
    blendMode(ADD);
    translate(blackHole.x, blackHole.y);
    let numRays = floor(6 + bass * 6); // Max 12 Strahlen statt mehr
    
    // Farbpalette: Blau, Türkis, Lila, Violett
    let colorPalette = [
      {r: 40, g: 60, b: 120},   // Dunkelblau
      {r: 50, g: 80, b: 140},   // Blau
      {r: 30, g: 100, b: 120},  // Türkis
      {r: 40, g: 120, b: 140},  // Helles Türkis
      {r: 80, g: 50, b: 120},   // Lila
      {r: 100, g: 60, b: 140},  // Violett
      {r: 110, g: 40, b: 130},  // Dunkelviolett
      {r: 90, g: 70, b: 150}    // Hell-Violett
    ];
    
    for (let i = 0; i < numRays; i++) {
      rotate(TWO_PI / numRays);
      
      // Farbe abwechselnd aus Palette wählen
      let colorIndex = i % colorPalette.length;
      let col = colorPalette[colorIndex];
      
      // Beat-Intensität
      let intensity = 1 + bass * 0.5 + (isBeat ? 0.3 : 0);
      
      // Wellung zum Beat
      let waveOffset = sin(frameCount * 0.08 + i * 0.5) * 15 + (isBeat ? bass * 25 : 0);
      
      // Strahl als Dreieck (VON AUßEN NACH INNEN - umgedreht)
      fill(
        col.r * intensity,
        col.g * intensity,
        col.b * intensity,
        bass * 70 + mid * 35 // Transparenz
      );
      noStroke();
      
      let rayLength = width / 2;
      let outerWidth = 40 + bass * 30; // BREIT am äußeren Rand
      let innerWidth = 2 + bass * 2; // SCHMAL am inneren Rand (Zentrum)
      
      beginShape();
      // Start von außen (breit) nach innen (schmal)
      vertex(rayLength, -outerWidth / 2 + waveOffset); // Außen oben mit Wellung
      vertex(rayLength, outerWidth / 2 + waveOffset); // Außen unten mit Wellung
      vertex(0, innerWidth / 2); // Innen unten (Zentrum)
      vertex(0, -innerWidth / 2); // Innen oben (Zentrum)
      endShape(CLOSE);
    }
    pop();
  }
  
  // Chromatische Aberration - REDUZIERT
  if (mid > 0.6) { // Höherer Threshold
    push();
    blendMode(SCREEN);
    let shift = mid * 4; // HALBER SHIFT
    tint(255, 0, 100, mid * 50); // WENIGER TRANSPARENT
    translate(shift, 0);
    pop();
    
    push();
    blendMode(SCREEN);
    tint(0, 255, 255, mid * 50);
    translate(-shift, 0);
    pop();
  }
  
  // Partikel-Regen - REDUZIERT
  let rainChance = isBeat ? 0.5 : 0.85; // WENIGER PARTIKEL
  if (frameCount % 5 === 0 && random(1) > rainChance) { // SELTENER
    particles.push({
      x: random(width),
      y: -20,
      vx: random(-0.3, 0.3) + bass * random(-0.5, 0.5), // LANGSAMER
      vy: random(0.8, 2) + bass * 1, // LANGSAMER
      life: 1.0,
      size: random(2, 6) + bass * 4, // KLEINER
      hueOffset: random(360),
      rotation: 0,
      rotSpeed: random(-0.03, 0.03) + bass * 0.05
    });
  }
  
  // Screen Flash bei sehr starkem Beat - GEDIMMT
  if (isBeat && bass > 0.85) { // HÖHERER THRESHOLD
    push();
    blendMode(ADD);
    let flashHue = colorShift % 360;
    fill(
      sin(flashHue) * 50 + 70, // GEDIMMT
      cos(flashHue * 1.3) * 50 + 70,
      sin(flashHue * 0.8) * 50 + 70,
      bass * 40 // WENIGER INTENSIV
    );
    rect(0, 0, width, height);
    pop();
  }
}

function drawDebugInfo() {
  fill(200);
  textAlign(LEFT, TOP);
  textSize(14);
  let songNames = ["LanaTechno", "test", "test2", "Gonzi_BASSKILLER", "katyperry"];
  let currentSongName = currentSoundIndex >= 0 ? songNames[currentSoundIndex] : 'None';
  
  text(`Song: ${currentSongName} | Bass: ${(bass * 100).toFixed(0)}% | Beat: ${isBeat}`, 10, 10);
  text(`Particles: ${particles.length} | Spirals: ${spirals.length} | Click/Space for new song`, 10, 30);
}

function mousePressed() {
  playRandomSound();
}

function keyPressed() {
  if (key === ' ' || key === 'n' || key === 'N') {
    playRandomSound();
  }
}
