// let isStarted = false;
// let sound;
// let fft;
// let amplitude;

// // Text Eigenschaften
// let currentWord = 0;
// let words = ["DREAM", "NIGHTMARE"];
// let textToDisplay = words[0];
// let bars = [];
// let lastWordChange = 0;
// let wordChangeDuration = 10000; // 10 Sekunden pro Wort
// let transitionProgress = 0;
// let isTransitioning = false;
// let transitionDuration = 1500; // 1.5 Sekunden Übergang

// // Raster
// const barWidth = 3;
// const spacing = 3;
// const barStep = barWidth + spacing;
// const textBarWidthMultiplier = 4; // Text-Balken sind 4x breiter

// // Effekte
// let pulseValue = 0;
// let vibrateOffset = 0;
// let glitchActive = false;
// let glitchFrames = 0;

// function preload() {
//   sound = loadSound("./assets/LanaTechno.mp3");
// }

// function setup() {
//   createCanvas(1920, 450);
//   frameRate(60);
  
//   amplitude = new p5.Amplitude();
//   fft = new p5.FFT(0.8, 1024);
//   fft.setInput(sound);
  
//   // Initialisiere Balken-Raster
//   createBarGrid();
// }

// function createBarGrid() {
//   bars = [];
  
//   // Temporäres Graphics-Objekt für Text mit willReadFrequently
//   let pg = createGraphics(width, height);
//   pg.drawingContext.willReadFrequently = true; // Performance-Optimierung
//   pg.background(0);
//   pg.textAlign(CENTER, CENTER);
//   pg.textSize(250);
//   pg.textFont('Arial Black');
//   pg.fill(255);
//   pg.text(textToDisplay, width/2, height/2);
  
//   // Debug: Zeige was gerendert wurde
//   console.log(`Creating bars for: ${textToDisplay}`);
  
//   // Erstelle Balken-Raster
//   for (let x = 0; x < width; x += barStep) {
//     // Prüfe ob dieser Balken Teil der Schrift ist
//     let textSegments = [];
//     let inText = false;
//     let segmentStart = 0;
    
//     // Von oben nach unten scannen
//     for (let y = 0; y < height; y++) {
//       let pixelColor = pg.get(x, y);
//       let brightness = (pixelColor[0] + pixelColor[1] + pixelColor[2]) / 3;
      
//       if (brightness > 128 && !inText) {
//         // Text-Segment beginnt
//         segmentStart = y;
//         inText = true;
//       } else if (brightness <= 128 && inText) {
//         // Text-Segment endet
//         textSegments.push({
//           yStart: segmentStart,
//           yEnd: y,
//           height: y - segmentStart
//         });
//         inText = false;
//       }
//     }
    
//     // Falls Segment am Ende noch offen
//     if (inText) {
//       textSegments.push({
//         yStart: segmentStart,
//         yEnd: height,
//         height: height - segmentStart
//       });
//     }
    
//     bars.push({
//       x: x,
//       isText: textSegments.length > 0,
//       textSegments: textSegments,
//       phase: random(TWO_PI),
//       glitchOffsetX: 0,
//       glitchOffsetY: 0
//     });
//   }
  
//   // Debug: Zähle Text-Balken
//   let textBarCount = bars.filter(b => b.isText).length;
//   console.log(`Total bars: ${bars.length}, Text bars: ${textBarCount}`);
  
//   pg.remove();
// }

// function mousePressed() {
//   if (!isStarted) {
//     sound.loop();
//     isStarted = true;
//   } else {
//     if (sound.isPlaying()) {
//       sound.pause();
//     } else {
//       sound.loop();
//     }
//   }
// }

// function draw() {
//   // Schwarzer Hintergrund
//   background(0);
  
//   // Wörter abwechselnd ändern mit Übergang
//   if (isStarted && !isTransitioning && millis() - lastWordChange > wordChangeDuration) {
//     isTransitioning = true;
//     transitionProgress = 0;
//     lastWordChange = millis();
//   }
  
//   // Übergangs-Animation
//   if (isTransitioning) {
//     transitionProgress = (millis() - lastWordChange) / transitionDuration;
    
//     if (transitionProgress >= 1) {
//       transitionProgress = 1;
//       isTransitioning = false;
//       currentWord = (currentWord + 1) % words.length;
//       textToDisplay = words[currentWord];
//       createBarGrid(); // Neues Raster für nächstes Wort
//       lastWordChange = millis();
//     }
//   }
  
//   // Audio-Analyse - nur wenn Sound läuft
//   let bass = 0;
//   let lowMid = 0;
//   let lowFreq = 0;
//   let isBeat = false;
  
//   if (isStarted && sound.isPlaying()) {
//     let spectrum = fft.analyze();
//     let level = amplitude.getLevel();
//     bass = fft.getEnergy("bass");
//     lowMid = fft.getEnergy("lowMid");
//     let mid = fft.getEnergy("mid");
//     let treble = fft.getEnergy("treble");
    
//     // Normalisierte Werte - Focus auf tiefe Frequenzen
//     let bassNormalized = bass / 255;
//     let lowMidNormalized = lowMid / 255;
//     lowFreq = (bassNormalized + lowMidNormalized) / 2; // Kombinierte tiefe Frequenzen
    
//     // Beat Detection basierend auf Bass
//     isBeat = lowFreq > 0.6;
//   }
  
//   // Easing für Übergang
//   let easeProgress = easeInOutCubic(transitionProgress);
  
//   // Puls-Wert für smooth animation
//   pulseValue = lerp(pulseValue, isBeat ? 1 : 0, 0.15);
  
//   // Zeichne Balken-Raster mit Effekten
//   if (currentWord === 0) { // DREAM
//     drawDreamBars(lowFreq, isBeat, easeProgress);
//   } else { // NIGHTMARE
//     drawNightmareBars(lowFreq, isBeat, easeProgress);
//   }
  
//   // UI
//   if (!isStarted) {
//     fill(255);
//     textAlign(CENTER, CENTER);
//     textSize(24);
//     text("Click to Start", width/2, height - 30);
//   }
  
//   // Debug Info
//   fill(100);
//   textAlign(LEFT, TOP);
//   textSize(12);
//   text(`${textToDisplay} | Bass: ${bass} | LowFreq: ${(lowFreq * 100).toFixed(0)}% | Beat: ${isBeat}`, 10, 10);
//   text(`Next in: ${((wordChangeDuration - (millis() - lastWordChange)) / 1000).toFixed(1)}s`, 10, 25);
// }

// function drawDreamBars(lowFreq, isBeat, transitionEase) {
//   // DREAM: Pulsieren und Vibrieren auf tiefe Frequenzen
  
//   // Vibrations-Offset basierend auf Bass
//   vibrateOffset += 0.3;
//   let vibrateIntensity = lowFreq * 8;
  
//   for (let i = 0; i < bars.length; i++) {
//     let bar = bars[i];
    
//     if (bar.isText) {
//       // TEXT-BALKEN: Weiß, dick, pulsierend und vibrierend
      
//       for (let segment of bar.textSegments) {
//         push();
        
//         // Puls-Effekt: Breite ändert sich mit Bass
//         let pulseScale = 1 + lowFreq * 1.2;
//         if (isBeat) pulseScale *= 1.3;
//         let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
//         // Vibrations-Offset
//         let vibrateX = sin(vibrateOffset + bar.phase) * vibrateIntensity;
//         let vibrateY = cos(vibrateOffset * 1.3 + bar.phase) * vibrateIntensity * 0.5;
        
//         // Position mit Vibration
//         let x = bar.x + vibrateX;
//         let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
//         // Höhe pulsiert auch leicht
//         let heightScale = 1 + lowFreq * 0.3;
//         let textBarHeight = segment.height * heightScale;
//         let y = segmentCenter - textBarHeight/2 + vibrateY;
        
//         // Weiße Farbe - SEHR HELL
//         fill(255, 255, 255);
//         noStroke();
        
//         // Übergangseffekt
//         if (isTransitioning) {
//           let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
//           fill(255, 255, 255, alpha);
//         }
        
//         rect(x - textBarWidth/2, y, textBarWidth, textBarHeight);
        
//         // Glow bei Beat
//         if (isBeat && !isTransitioning) {
//           fill(255, 255, 255, 100);
//           rect(x - textBarWidth/2 - 4, y - 4, textBarWidth + 8, textBarHeight + 8);
//         }
        
//         pop();
//       }
      
//     } else {
//       // HINTERGRUND-BALKEN: Grau, dünn, statisch
//       push();
      
//       fill(40); // Noch dunkler für besseren Kontrast
//       noStroke();
      
//       // Übergangseffekt
//       if (isTransitioning) {
//         let alpha = 255 * (1 - transitionEase * 0.5);
//         fill(40, alpha);
//       }
      
//       rect(bar.x - barWidth/2, 0, barWidth, height);
      
//       pop();
//     }
//   }
// }

// function drawNightmareBars(lowFreq, isBeat, transitionEase) {
//   // NIGHTMARE: Horror-Glitch auf tiefe Frequenzen
  
//   // Glitch aktivieren bei starken Bass-Hits
//   if (isBeat && random(1) > 0.5) {
//     glitchActive = true;
//     glitchFrames = frameCount;
//   }
  
//   // Glitch dauert kurz an
//   if (glitchActive && frameCount - glitchFrames > 6) {
//     glitchActive = false;
//   }
  
//   // Bei Glitch: Zufällige Offsets für alle Balken
//   if (glitchActive) {
//     for (let bar of bars) {
//       bar.glitchOffsetX = random(-20, 20);
//       bar.glitchOffsetY = random(-10, 10);
//     }
//   } else {
//     // Sanft zurück zu 0
//     for (let bar of bars) {
//       bar.glitchOffsetX = lerp(bar.glitchOffsetX, 0, 0.4);
//       bar.glitchOffsetY = lerp(bar.glitchOffsetY, 0, 0.4);
//     }
//   }
  
//   // RGB-Split bei aktivem Glitch
//   if (glitchActive) {
//     // Zeichne Text-Balken mehrfach versetzt in Rot/Weiß/Grau
//     for (let layer = 0; layer < 3; layer++) {
//       let layerOffsetX = (layer - 1) * 8;
//       let layerOffsetY = (layer - 1) * 3;
      
//       for (let i = 0; i < bars.length; i++) {
//         let bar = bars[i];
        
//         if (bar.isText) {
//           for (let segment of bar.textSegments) {
//             push();
            
//             let textBarWidth = barWidth * textBarWidthMultiplier;
//             let x = bar.x + bar.glitchOffsetX + layerOffsetX;
//             let y = segment.yStart + bar.glitchOffsetY + layerOffsetY;
            
//             // Farbe je nach Layer
//             if (layer === 0) {
//               fill(255, 0, 0, 200); // ROT
//             } else if (layer === 1) {
//               fill(255, 255, 255, 180); // Weiß
//             } else {
//               fill(150, 150, 150, 140); // Grau
//             }
//             noStroke();
            
//             rect(x - textBarWidth/2, y, textBarWidth, segment.height);
            
//             pop();
//           }
//         }
//       }
//     }
//   } else {
//     // Normale Darstellung mit leichten Glitch-Resten
//     for (let i = 0; i < bars.length; i++) {
//       let bar = bars[i];
      
//       if (bar.isText) {
//         // TEXT-BALKEN: Weiß (oder rot bei Glitch-Resten)
        
//         for (let segment of bar.textSegments) {
//           push();
          
//           let textBarWidth = barWidth * textBarWidthMultiplier;
//           let x = bar.x + bar.glitchOffsetX;
//           let y = segment.yStart + bar.glitchOffsetY;
          
//           // Weiß, aber bei starkem Bass minimal rötlich
//           if (lowFreq > 0.7 && random(1) > 0.8) {
//             fill(255, 50, 50); // Leicht rötlich
//           } else {
//             fill(255, 255, 255); // Weiß
//           }
//           noStroke();
          
//           // Übergangseffekt
//           if (isTransitioning) {
//             let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
//             fill(255, 255, 255, alpha);
//           }
          
//           rect(x - textBarWidth/2, y, textBarWidth, segment.height);
          
//           pop();
//         }
        
//       } else {
//         // HINTERGRUND-BALKEN: Grau, dünn
//         push();
        
//         fill(40); // Noch dunkler
//         noStroke();
        
//         // Übergangseffekt
//         if (isTransitioning) {
//           let alpha = 255 * (1 - transitionEase * 0.5);
//           fill(40, alpha);
//         }
        
//         rect(bar.x - barWidth/2, 0, barWidth, height);
        
//         pop();
//       }
//     }
//   }
  
//   // Zusätzliche Glitch-Streifen über das ganze Bild
//   if (glitchActive) {
//     push();
//     for (let i = 0; i < 8; i++) {
//       let y = random(height);
//       let h = random(5, 40);
//       let offsetX = random(-30, 30);
      
//       if (random(1) > 0.6) {
//         fill(255, 0, 0, 100); // Rote Störung
//       } else {
//         fill(255, 255, 255, 80); // Weiße Störung
//       }
//       noStroke();
//       rect(offsetX, y, width, h);
//     }
//     pop();
//   }
  
//   // Scanlines bei hohem Bass
//   if (lowFreq > 0.5) {
//     push();
//     stroke(255, 0, 0, lowFreq * 60);
//     strokeWeight(1);
//     for (let y = 0; y < height; y += 3) {
//       line(0, y, width, y);
//     }
//     pop();
//   }
// }

// function easeInOutCubic(t) {
//   return t < 0.5 
//     ? 4 * t * t * t 
//     : 1 - pow(-2 * t + 2, 3) / 2;
// }

// function windowResized() {
//   // Canvas-Größe bleibt fix bei 1920x450
// }




//BackUp 2




// let isStarted = false;
// let sound;
// let fft;
// let amplitude;

// // Text Eigenschaften - dynamisch basierend auf Musik-Intensität
// let currentWord = 0;
// let words = ["DREAM", "NIGHTMARE"];
// let textToDisplay = words[0];
// let bars = [];
// let lastWordChange = 0;
// let wordChangeDuration = 3000; // 3 Sekunden Minimum bevor Wechsel möglich
// let transitionProgress = 0;
// let isTransitioning = false;
// let transitionDuration = 1500; // 1.5 Sekunden Übergang

// // Audio-Analyse für automatischen Zustandswechsel
// let energyHistory = [];
// let historyLength = 60; // 1 Sekunde bei 60fps
// let intensityThreshold = 0.4; // Schwellwert für NIGHTMARE

// // Raster
// const barWidth = 3;
// const spacing = 3;
// const barStep = barWidth + spacing;
// const textBarWidthMultiplier = 4; // Text-Balken sind 4x breiter

// // Effekte
// let pulseValue = 0;
// let vibrateOffset = 0;
// let glitchActive = false;
// let glitchFrames = 0;

// function preload() {
//   sound = loadSound("./assets/LanaTechno.mp3");
// }

// function setup() {
//   createCanvas(1920, 450);
//   frameRate(60);
  
//   amplitude = new p5.Amplitude();
//   fft = new p5.FFT(0.8, 1024);
//   fft.setInput(sound);
  
//   // Initialisiere Balken-Raster
//   createBarGrid();
  
//   // Starte automatisch
//   sound.loop();
//   isStarted = true;
// }

// function createBarGrid() {
//   bars = [];
  
//   // Temporäres Graphics-Objekt für Text mit willReadFrequently
//   let pg = createGraphics(width, height);
//   pg.drawingContext.willReadFrequently = true; // Performance-Optimierung
//   pg.background(0);
//   pg.textAlign(CENTER, CENTER);
//   pg.textSize(250);
//   pg.textFont('Arial Black');
//   pg.fill(255);
//   pg.text(textToDisplay, width/2, height/2);
  
//   // Debug: Zeige was gerendert wurde
//   console.log(`Creating bars for: ${textToDisplay}`);
  
//   // Erstelle Balken-Raster
//   for (let x = 0; x < width; x += barStep) {
//     // Prüfe ob dieser Balken Teil der Schrift ist
//     let textSegments = [];
//     let inText = false;
//     let segmentStart = 0;
    
//     // Von oben nach unten scannen
//     for (let y = 0; y < height; y++) {
//       let pixelColor = pg.get(x, y);
//       let brightness = (pixelColor[0] + pixelColor[1] + pixelColor[2]) / 3;
      
//       if (brightness > 128 && !inText) {
//         // Text-Segment beginnt
//         segmentStart = y;
//         inText = true;
//       } else if (brightness <= 128 && inText) {
//         // Text-Segment endet
//         textSegments.push({
//           yStart: segmentStart,
//           yEnd: y,
//           height: y - segmentStart
//         });
//         inText = false;
//       }
//     }
    
//     // Falls Segment am Ende noch offen
//     if (inText) {
//       textSegments.push({
//         yStart: segmentStart,
//         yEnd: height,
//         height: height - segmentStart
//       });
//     }
    
//     bars.push({
//       x: x,
//       isText: textSegments.length > 0,
//       textSegments: textSegments,
//       phase: random(TWO_PI),
//       glitchOffsetX: 0,
//       glitchOffsetY: 0
//     });
//   }
  
//   // Debug: Zähle Text-Balken
//   let textBarCount = bars.filter(b => b.isText).length;
//   console.log(`Total bars: ${bars.length}, Text bars: ${textBarCount}`);
  
//   pg.remove();
// }

// function mousePressed() {
//   // Pause/Play Toggle
//   if (sound.isPlaying()) {
//     sound.pause();
//   } else {
//     sound.loop();
//   }
// }

// function draw() {
//   // Schwarzer Hintergrund
//   background(0);
  
//   // Audio-Analyse - nur wenn Sound läuft
//   let bass = 0;
//   let lowMid = 0;
//   let mid = 0;
//   let treble = 0;
//   let lowFreq = 0;
//   let isBeat = false;
//   let musicIntensity = 0;
  
//   if (sound.isPlaying()) {
//     let spectrum = fft.analyze();
//     let level = amplitude.getLevel();
//     bass = fft.getEnergy("bass");
//     lowMid = fft.getEnergy("lowMid");
//     mid = fft.getEnergy("mid");
//     treble = fft.getEnergy("treble");
    
//     // Normalisierte Werte - Focus auf tiefe Frequenzen
//     let bassNormalized = bass / 255;
//     let lowMidNormalized = lowMid / 255;
//     let midNormalized = mid / 255;
//     let trebleNormalized = treble / 255;
    
//     lowFreq = (bassNormalized + lowMidNormalized) / 2;
    
//     // Musik-Intensität: Kombination aus Level und allen Frequenzen
//     musicIntensity = (level * 0.4) + (bassNormalized * 0.3) + (midNormalized * 0.2) + (trebleNormalized * 0.1);
    
//     // Beat Detection basierend auf Bass
//     isBeat = lowFreq > 0.6;
    
//     // Speichere Intensität in History
//     energyHistory.push(musicIntensity);
//     if (energyHistory.length > historyLength) {
//       energyHistory.shift();
//     }
    
//     // Berechne durchschnittliche Intensität
//     let avgIntensity = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
    
//     // Automatischer Zustandswechsel basierend auf Musik-Intensität
//     let shouldBeNightmare = avgIntensity > intensityThreshold;
//     let targetWord = shouldBeNightmare ? 1 : 0; // 0 = DREAM, 1 = NIGHTMARE
    
//     // Wechsel nur wenn genug Zeit vergangen und Zustand sich ändert
//     if (!isTransitioning && 
//         currentWord !== targetWord && 
//         millis() - lastWordChange > wordChangeDuration) {
//       isTransitioning = true;
//       transitionProgress = 0;
//       lastWordChange = millis();
//     }
//   }
  
//   // Übergangs-Animation
//   if (isTransitioning) {
//     transitionProgress = (millis() - lastWordChange) / transitionDuration;
    
//     if (transitionProgress >= 1) {
//       transitionProgress = 1;
//       isTransitioning = false;
      
//       // Wechsel zum anderen Zustand
//       let avgIntensity = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
//       currentWord = avgIntensity > intensityThreshold ? 1 : 0;
//       textToDisplay = words[currentWord];
//       createBarGrid(); // Neues Raster für nächstes Wort
//       lastWordChange = millis();
//     }
//   }
  
//   // Easing für Übergang
//   let easeProgress = easeInOutCubic(transitionProgress);
  
//   // Puls-Wert für smooth animation
//   pulseValue = lerp(pulseValue, isBeat ? 1 : 0, 0.15);
  
//   // Zeichne Balken-Raster mit Effekten
//   if (currentWord === 0) { // DREAM
//     drawDreamBars(lowFreq, isBeat, easeProgress);
//   } else { // NIGHTMARE
//     drawNightmareBars(lowFreq, isBeat, easeProgress);
//   }
  
//   // Debug Info
//   let avgIntensity = energyHistory.length > 0 
//     ? energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length 
//     : 0;
  
//   fill(100);
//   textAlign(LEFT, TOP);
//   textSize(12);
//   text(`${textToDisplay} | Bass: ${bass} | Intensity: ${(avgIntensity * 100).toFixed(0)}% | Beat: ${isBeat}`, 10, 10);
//   text(`Threshold: ${(intensityThreshold * 100).toFixed(0)}% | ${sound.isPlaying() ? 'Playing' : 'Paused'}`, 10, 25);
// }

// function drawDreamBars(lowFreq, isBeat, transitionEase) {
//   // DREAM: Pulsieren und Vibrieren auf tiefe Frequenzen
  
//   // Vibrations-Offset basierend auf Bass
//   vibrateOffset += 0.3;
//   let vibrateIntensity = lowFreq * 8;
  
//   for (let i = 0; i < bars.length; i++) {
//     let bar = bars[i];
    
//     // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich (durchgehend von oben bis unten)
//     push();
//     fill(40); // Dunkles Grau
//     noStroke();
    
//     if (isTransitioning) {
//       let alpha = 255 * (1 - transitionEase * 0.5);
//       fill(40, alpha);
//     }
    
//     rect(bar.x - barWidth/2, 0, barWidth, height);
//     pop();
    
//     // DANN: Wenn dieser Balken Teil des Texts ist, zeichne DICKERE Balken drüber
//     if (bar.isText) {
//       for (let segment of bar.textSegments) {
//         push();
        
//         // Puls-Effekt: Breite ändert sich mit Bass
//         let pulseScale = 1 + lowFreq * 1.2;
//         if (isBeat) pulseScale *= 1.3;
//         let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
//         // Vibrations-Offset
//         let vibrateX = sin(vibrateOffset + bar.phase) * vibrateIntensity;
//         let vibrateY = cos(vibrateOffset * 1.3 + bar.phase) * vibrateIntensity * 0.5;
        
//         // Position mit Vibration (zentriert auf dem dünnen Strich)
//         let x = bar.x + vibrateX;
//         let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
//         // Höhe pulsiert auch leicht
//         let heightScale = 1 + lowFreq * 0.3;
//         let textBarHeight = segment.height * heightScale;
//         let y = segmentCenter - textBarHeight/2 + vibrateY;
        
//         // Weiße Farbe - SEHR HELL
//         fill(255, 255, 255);
//         noStroke();
        
//         // Übergangseffekt
//         if (isTransitioning) {
//           let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
//           fill(255, 255, 255, alpha);
//         }
        
//         rect(x - textBarWidth/2, y, textBarWidth, textBarHeight);
        
//         // Glow bei Beat
//         if (isBeat && !isTransitioning) {
//           fill(255, 255, 255, 100);
//           rect(x - textBarWidth/2 - 4, y - 4, textBarWidth + 8, textBarHeight + 8);
//         }
        
//         pop();
//       }
//     }
//   }
// }

// function drawNightmareBars(lowFreq, isBeat, transitionEase) {
//   // NIGHTMARE: Horror-Glitch auf tiefe Frequenzen
  
//   // Glitch aktivieren bei starken Bass-Hits
//   if (isBeat && random(1) > 0.5) {
//     glitchActive = true;
//     glitchFrames = frameCount;
//   }
  
//   // Glitch dauert kurz an
//   if (glitchActive && frameCount - glitchFrames > 6) {
//     glitchActive = false;
//   }
  
//   // Bei Glitch: Zufällige Offsets für alle Balken
//   if (glitchActive) {
//     for (let bar of bars) {
//       bar.glitchOffsetX = random(-20, 20);
//       bar.glitchOffsetY = random(-10, 10);
//     }
//   } else {
//     // Sanft zurück zu 0
//     for (let bar of bars) {
//       bar.glitchOffsetX = lerp(bar.glitchOffsetX, 0, 0.4);
//       bar.glitchOffsetY = lerp(bar.glitchOffsetY, 0, 0.4);
//     }
//   }
  
//   // Zeichne alle Balken
//   for (let i = 0; i < bars.length; i++) {
//     let bar = bars[i];
    
//     // ZUERST: Zeichne IMMER den dünnen Hintergrund-Strich (durchgehend von oben bis unten)
//     push();
//     fill(40); // Dunkles Grau
//     noStroke();
    
//     if (isTransitioning) {
//       let alpha = 255 * (1 - transitionEase * 0.5);
//       fill(40, alpha);
//     }
    
//     rect(bar.x - barWidth/2, 0, barWidth, height);
//     pop();
//   }
  
//   // RGB-Split bei aktivem Glitch - ÜBER den dünnen Strichen
//   if (glitchActive) {
//     // Zeichne Text-Balken mehrfach versetzt in Rot/Weiß/Grau
//     for (let layer = 0; layer < 3; layer++) {
//       let layerOffsetX = (layer - 1) * 8;
//       let layerOffsetY = (layer - 1) * 3;
      
//       for (let i = 0; i < bars.length; i++) {
//         let bar = bars[i];
        
//         if (bar.isText) {
//           for (let segment of bar.textSegments) {
//             push();
            
//             let textBarWidth = barWidth * textBarWidthMultiplier;
//             let x = bar.x + bar.glitchOffsetX + layerOffsetX;
//             let y = segment.yStart + bar.glitchOffsetY + layerOffsetY;
            
//             // Farbe je nach Layer
//             if (layer === 0) {
//               fill(255, 0, 0, 200); // ROT
//             } else if (layer === 1) {
//               fill(255, 255, 255, 180); // Weiß
//             } else {
//               fill(150, 150, 150, 140); // Grau
//             }
//             noStroke();
            
//             rect(x - textBarWidth/2, y, textBarWidth, segment.height);
            
//             pop();
//           }
//         }
//       }
//     }
//   } else {
//     // Normale Darstellung - dicke Balken ÜBER den dünnen Strichen
//     for (let i = 0; i < bars.length; i++) {
//       let bar = bars[i];
      
//       if (bar.isText) {
//         // TEXT-BALKEN: Weiß, dick, über den dünnen Strichen
        
//         for (let segment of bar.textSegments) {
//           push();
          
//           let textBarWidth = barWidth * textBarWidthMultiplier;
//           let x = bar.x + bar.glitchOffsetX;
//           let y = segment.yStart + bar.glitchOffsetY;
          
//           // Weiß, aber bei starkem Bass minimal rötlich
//           if (lowFreq > 0.7 && random(1) > 0.8) {
//             fill(255, 50, 50); // Leicht rötlich
//           } else {
//             fill(255, 255, 255); // Weiß
//           }
//           noStroke();
          
//           // Übergangseffekt
//           if (isTransitioning) {
//             let alpha = 255 * (1 - abs(transitionEase - 0.5) * 2);
//             fill(255, 255, 255, alpha);
//           }
          
//           rect(x - textBarWidth/2, y, textBarWidth, segment.height);
          
//           pop();
//         }
//       }
//     }
//   }
  
//   // Zusätzliche Glitch-Streifen über das ganze Bild
//   if (glitchActive) {
//     push();
//     for (let i = 0; i < 8; i++) {
//       let y = random(height);
//       let h = random(5, 40);
//       let offsetX = random(-30, 30);
      
//       if (random(1) > 0.6) {
//         fill(255, 0, 0, 100); // Rote Störung
//       } else {
//         fill(255, 255, 255, 80); // Weiße Störung
//       }
//       noStroke();
//       rect(offsetX, y, width, h);
//     }
//     pop();
//   }
  
//   // Scanlines bei hohem Bass
//   if (lowFreq > 0.5) {
//     push();
//     stroke(255, 0, 0, lowFreq * 60);
//     strokeWeight(1);
//     for (let y = 0; y < height; y += 3) {
//       line(0, y, width, y);
//     }
//     pop();
//   }
// }

// function easeInOutCubic(t) {
//   return t < 0.5 
//     ? 4 * t * t * t 
//     : 1 - pow(-2 * t + 2, 3) / 2;
// }

// function windowResized() {
//   // Canvas-Größe bleibt fix bei 1920x450
// }



//back-Up 3

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
let wordChangeDuration = 2000; // 2 Sekunden Minimum bevor Wechsel möglich
let transitionProgress = 0;
let isTransitioning = false;
let transitionDuration = 1500; // 1.5 Sekunden Übergang

// Audio-Analyse für automatischen Zustandswechsel
let energyHistory = [];
let historyLength = 60; // 1 Sekunde bei 60fps

// Intensitäts-Schwellwerte für verschiedene Zustände
// 0: FLOATING (20-30%), 1: DREAM (30-45%), 2: FALLING (45-60%), 3: NIGHTMARE (60%+)
let intensityRanges = [
  { min: 0.20, max: 0.30, word: 0 },  // FLOATING
  { min: 0.30, max: 0.45, word: 1 },  // DREAM
  { min: 0.45, max: 0.60, word: 2 },  // FALLING
  { min: 0.60, max: 1.00, word: 3 }   // NIGHTMARE
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
  
  // Wähle zufälligen Song (0-2)
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
  
  waveOffset += 0.15 + lowFreq * 0.25; // Geschwindigkeit reagiert auf Bass
  let waveIntensity = 25 + lowFreq * 35; // Intensität reagiert auf Bass
  let waveFrequency = 0.008; // Wellenfrequenz über X-Achse
  
  // Vibrations-Offset wie bei DREAM
  vibrateOffset += 0.25 + lowFreq * 0.3;
  let vibrateIntensity = lowFreq * 12; // Vibration basierend auf Bass
  
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
        
        // Pulsieren bei Bass - stärker als vorher
        let pulseScale = 1 + lowFreq * 1.0;
        if (isBeat) pulseScale *= 1.3; // Extra bei Beat
        let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
        
        // Wellen-Effekt: Vertikale Bewegung basierend auf X-Position
        let waveY = sin(waveOffset + bar.x * waveFrequency) * waveIntensity;
        // Zusätzliche Welle mit anderer Frequenz für komplexeren Effekt
        waveY += cos(waveOffset * 1.3 + bar.x * waveFrequency * 0.7) * (waveIntensity * 0.6);
        
        // VIBRATION - Horizontale und vertikale Offsets
        let vibrateX = sin(vibrateOffset + bar.phase) * vibrateIntensity;
        let vibrateY = cos(vibrateOffset * 1.4 + bar.phase) * vibrateIntensity * 0.4;
        
        // Kombiniere Wellen und Vibration
        let x = bar.x + vibrateX;
        let segmentCenter = (segment.yStart + segment.yEnd) / 2;
        
        // Höhe pulsiert mit Bass
        let heightScale = 1 + lowFreq * 0.4;
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
          let glowAlpha = 80 + lowFreq * 100;
          fill(255, 255, 255, glowAlpha);
          rect(x - textBarWidth/2 - 4, y - 4, textBarWidth + 8, textBarHeight + 8);
        }
        
        pop();
      }
    }
  }
  
  // Wellen-Linien im Hintergrund - reagieren auf Bass
  push();
  noFill();
  let strokeAlpha = 100 + lowFreq * 100; // Sichtbarkeit reagiert auf Bass
  stroke(100, 100, 100, strokeAlpha);
  strokeWeight(1 + lowFreq * 2); // Dicke reagiert auf Bass
  for (let waveNum = 0; waveNum < 3; waveNum++) {
    beginShape();
    for (let x = 0; x < width; x += 10) {
      let y = height/2 + sin(waveOffset * (1 + waveNum * 0.3) + x * waveFrequency) * (waveIntensity * 2);
      vertex(x, y);
    }
    endShape();
  }
  pop();
  
  // Extra Effekt bei Beat: Kurze horizontale Störlinien
  if (isBeat && random(1) > 0.6) {
    push();
    for (let i = 0; i < 5; i++) {
      let y = random(height);
      let w = random(100, 300);
      let x = random(width);
      stroke(255, 255, 255, 150);
      strokeWeight(2);
      line(x, y, x + w, y);
    }
    pop();
  }
}

function drawNightmareBars(lowFreq, isBeat, transitionEase) {
  // NIGHTMARE: Horror-Glitch - SEHR reaktiv auf Beat
  
  // Glitch aktivieren bei Bass - häufiger und länger bei starkem Bass
  if (isBeat && random(1) > 0.3) { // Erhöhte Wahrscheinlichkeit
    glitchActive = true;
    glitchFrames = frameCount;
  }
  
  // Glitch dauert länger bei starkem Bass
  let glitchDuration = 6 + lowFreq * 8; // 6-14 Frames je nach Bass
  if (glitchActive && frameCount - glitchFrames > glitchDuration) {
    glitchActive = false;
  }
  
  // Bei Glitch: Zufällige Offsets für alle Balken - stärker bei hohem Bass
  if (glitchActive) {
    let glitchStrength = 20 + lowFreq * 40; // Bis zu 60px Offset bei starkem Bass
    for (let bar of bars) {
      bar.glitchOffsetX = random(-glitchStrength, glitchStrength);
      bar.glitchOffsetY = random(-glitchStrength/2, glitchStrength/2);
    }
  } else {
    // Sanft zurück zu 0
    for (let bar of bars) {
      bar.glitchOffsetX = lerp(bar.glitchOffsetX, 0, 0.4);
      bar.glitchOffsetY = lerp(bar.glitchOffsetY, 0, 0.4);
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
  
  // RGB-Split bei aktivem Glitch - ÜBER den dünnen Strichen
  if (glitchActive) {
    // Zeichne Text-Balken mehrfach versetzt in Rot/Weiß/Grau - Offset reagiert auf Bass
    let rgbSplitStrength = 8 + lowFreq * 12; // Stärkerer Split bei Bass
    for (let layer = 0; layer < 3; layer++) {
      let layerOffsetX = (layer - 1) * rgbSplitStrength;
      let layerOffsetY = (layer - 1) * (rgbSplitStrength * 0.4);
      
      for (let i = 0; i < bars.length; i++) {
        let bar = bars[i];
        
        if (bar.isText) {
          for (let segment of bar.textSegments) {
            push();
            
            // Breite pulsiert mit Bass auch im Glitch
            let pulseScale = 1 + lowFreq * 0.5;
            let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
            let x = bar.x + bar.glitchOffsetX + layerOffsetX;
            let y = segment.yStart + bar.glitchOffsetY + layerOffsetY;
            
            // Farbe je nach Layer - Alpha reagiert auf Bass
            let alphaBoost = lowFreq * 55;
            if (layer === 0) {
              fill(255, 0, 0, 200 + alphaBoost); // ROT - intensiver bei Bass
            } else if (layer === 1) {
              fill(255, 255, 255, 180 + alphaBoost); // Weiß
            } else {
              fill(150, 150, 150, 140 + alphaBoost); // Grau
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
          
          // Pulsieren mit Bass
          let pulseScale = 1 + lowFreq * 0.8;
          if (isBeat) pulseScale *= 1.2;
          let textBarWidth = barWidth * textBarWidthMultiplier * pulseScale;
          let x = bar.x + bar.glitchOffsetX;
          let y = segment.yStart + bar.glitchOffsetY;
          
          // Weiß, aber bei starkem Bass häufiger rötlich
          if (lowFreq > 0.5 && random(1) > 0.7) {
            let redIntensity = 50 + lowFreq * 100; // Mehr Rot bei mehr Bass
            fill(255, redIntensity, redIntensity); // Leicht bis stark rötlich
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
  
  // Zusätzliche Glitch-Streifen über das ganze Bild - mehr bei starkem Bass
  if (glitchActive) {
    push();
    let numStripes = 8 + lowFreq * 12; // Mehr Streifen bei Bass
    for (let i = 0; i < numStripes; i++) {
      let y = random(height);
      let h = random(5, 40 + lowFreq * 40); // Höhere Streifen bei Bass
      let offsetX = random(-30 - lowFreq * 50, 30 + lowFreq * 50);
      
      if (random(1) > 0.6) {
        fill(255, 0, 0, 100 + lowFreq * 100); // Rote Störung - intensiver bei Bass
      } else {
        fill(255, 255, 255, 80 + lowFreq * 80); // Weiße Störung
      }
      noStroke();
      rect(offsetX, y, width, h);
    }
    pop();
  }
  
  // Scanlines - stärker bei hohem Bass
  if (lowFreq > 0.3) {
    push();
    stroke(255, 0, 0, lowFreq * 120); // Intensivere Scanlines
    strokeWeight(isBeat ? 2 : 1); // Dicker bei Beat
    let lineSpacing = isBeat ? 2 : 3; // Dichter bei Beat
    for (let y = 0; y < height; y += lineSpacing) {
      line(0, y, width, y);
    }
    pop();
  }
  
  // Extra Effekt bei Beat: Screen Shake Simulation
  if (isBeat && lowFreq > 0.7) {
    push();
    // Dunkle Flash-Overlays
    fill(0, 0, 0, 30);
    rect(0, 0, width, height);
    pop();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 
    ? 4 * t * t * t 
    : 1 - pow(-2 * t + 2, 3) / 2;
}

function windowResized() {
  // Canvas-Größe bleibt fix bei 1920x450
}
