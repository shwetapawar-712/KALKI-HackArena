/* ===================================================
   Blind Navigation Guide — Object Detection
   Uses COCO-SSD (TensorFlow.js) for offline detection
   =================================================== */

let blindStream = null;
let blindAnimFrame = null;
let objectDetector = null;
let lastBlindSpeakTime = 0;

async function startBlindNav() {
  document.getElementById('blindStart').style.display = 'none';
  document.getElementById('blindActive').style.display = 'flex';

  try {
    blindStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'environment' },
      audio: false
    });
    const video = document.getElementById('blindVideo');
    video.srcObject = blindStream;
    await video.play();

    // Load object detection model
    await loadObjectDetector();
    runBlindDetection();

  } catch (err) {
    console.error('Camera error:', err);
    showNotification('error', '📷', 'Camera Error', 'Could not access camera.');
    stopBlindNav();
  }
}

async function loadObjectDetector() {
  // Load TensorFlow.js and COCO-SSD
  if (typeof tf === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js');
  }
  if (typeof cocoSsd === 'undefined') {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  }

  if (typeof cocoSsd !== 'undefined') {
    try {
      showNotification('info', '🔄', 'Loading Model', 'Loading object detection model...');
      objectDetector = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      showNotification('success', '✅', 'Model Ready', 'Object detection model loaded successfully.');
    } catch (e) {
      console.warn('Could not load COCO-SSD:', e);
      showNotification('error', '⚠️', 'Model Error', 'Could not load detection model. Using fallback mode.');
    }
  }
}

async function runBlindDetection() {
  const video = document.getElementById('blindVideo');
  const canvas = document.getElementById('blindCanvas');
  const ctx = canvas.getContext('2d');
  const objectsEl = document.getElementById('detectedObjects');

  async function detect() {
    if (!blindStream) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (objectDetector && video.readyState >= 2) {
      try {
        const predictions = await objectDetector.detect(video);
        
        // Draw detections
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        const detectedItems = [];

        predictions.forEach(pred => {
          if (pred.score < 0.5) return;

          const [x, y, w, h] = pred.bbox;
          const sx = x * scaleX;
          const sy = y * scaleY;
          const sw = w * scaleX;
          const sh = h * scaleY;

          // Draw bounding box
          ctx.strokeStyle = '#FF9933';
          ctx.lineWidth = 3;
          ctx.strokeRect(sx, sy, sw, sh);

          // Draw label background
          const label = `${getLocalizedObjectName(pred.class)} (${Math.round(pred.score * 100)}%)`;
          ctx.font = '14px Outfit';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(255,153,51,0.85)';
          ctx.fillRect(sx, sy - 24, textWidth + 16, 24);
          
          // Draw label text
          ctx.fillStyle = '#fff';
          ctx.fillText(label, sx + 8, sy - 7);

          // Estimate distance based on bounding box size
          const distance = estimateDistance(w, h, video.videoWidth, pred.class);
          detectedItems.push({ name: pred.class, distance });
        });

        // Update detected objects UI
        if (detectedItems.length > 0) {
          objectsEl.innerHTML = detectedItems.map(item => {
            const localName = getLocalizedObjectName(item.name);
            return `<span class="object-tag">${localName} — ~${item.distance}m</span>`;
          }).join('');

          // Voice feedback (throttled)
          const now = Date.now();
          if (now - lastBlindSpeakTime > 4000 && detectedItems.length > 0) {
            const nearest = detectedItems.sort((a, b) => a.distance - b.distance)[0];
            const objText = SanskritiAssistant.getTranslation('object_detected');
            const localName = getLocalizedObjectName(nearest.name);
            const meterText = SanskritiAssistant.getTranslation('meters');
            SanskritiAssistant.speak(`${objText} ${localName}, ${nearest.distance} ${meterText}`);
            lastBlindSpeakTime = now;
          }
        } else {
          objectsEl.innerHTML = '<p class="detecting-text">Scanning...</p>';
        }

      } catch (e) {
        // Ignore individual frame errors
      }
    } else {
      // Fallback mode without model
      objectsEl.innerHTML = '<p class="detecting-text">Loading detection model...</p>';
    }

    blindAnimFrame = requestAnimationFrame(detect);
  }

  detect();
}

function getLocalizedObjectName(className) {
  const key = className.toLowerCase().replace(/\s+/g, '');
  return SanskritiAssistant.getObjectName(key) || className;
}

function estimateDistance(bboxWidth, bboxHeight, frameWidth, className) {
  // Very rough distance estimation based on relative bbox size
  const relativeSizeW = bboxWidth / frameWidth;
  
  // Different reference sizes for different objects
  const refSizes = {
    person: 0.35, chair: 0.25, bottle: 0.1, cup: 0.08,
    laptop: 0.2, book: 0.12, car: 0.4, dog: 0.2,
    cat: 0.15, bicycle: 0.3
  };

  const refSize = refSizes[className.toLowerCase()] || 0.2;
  
  // Rough inverse proportion: larger bbox = closer
  let distance = Math.max(0.5, Math.round((refSize / Math.max(relativeSizeW, 0.01)) * 1.5 * 10) / 10);
  distance = Math.min(distance, 10);
  
  return distance;
}

function stopBlindNav() {
  if (blindStream) {
    blindStream.getTracks().forEach(t => t.stop());
    blindStream = null;
  }
  if (blindAnimFrame) {
    cancelAnimationFrame(blindAnimFrame);
    blindAnimFrame = null;
  }

  const video = document.getElementById('blindVideo');
  if (video) video.srcObject = null;

  document.getElementById('blindStart').style.display = 'block';
  document.getElementById('blindActive').style.display = 'none';
  document.getElementById('detectedObjects').innerHTML = '<p class="detecting-text">Detecting objects...</p>';
}
