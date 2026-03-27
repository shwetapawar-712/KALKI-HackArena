/* ===================================================
   Sanskriti 2.0 — Hand Gesture Control (MediaPipe Hands)
   Tracks number of fingers to navigate between apps.
   =================================================== */

const GestureControl = (() => {
  let isGestureActive = false;
  let gestureStream = null;
  let handsDetector = null;
  let camera = null;
  let lastActionTime = 0;
  let currentDetectedFingers = 0;

  // Load MediaPipe Hands dynamically
  async function loadHandsDetector() {
    if (typeof Hands === 'undefined') {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    }

    if (typeof Hands !== 'undefined' && !handsDetector) {
      handsDetector = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      handsDetector.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });
      handsDetector.onResults(onHandsResults);
    }
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        setTimeout(resolve, 100);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = resolve; // Ignore errors, fallback gracefully
      document.head.appendChild(script);
    });
  }

  async function startGestureControl() {
    if (isGestureActive) return;
    isGestureActive = true;

    document.getElementById('gesturePanel').classList.add('open');
    document.getElementById('gestureToggleBtn').classList.add('active');
    document.querySelector('#gestureToggleBtn .btn-text').textContent = "Gestures On";

    const video = document.getElementById('gestureVideo');

    try {
      gestureStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: 'user' }, 
        audio: false 
      });
      video.srcObject = gestureStream;
      await video.play();

      await loadHandsDetector();

      if (handsDetector && typeof Camera !== 'undefined') {
        camera = new Camera(video, {
          onFrame: async () => {
            if (isGestureActive) {
              await handsDetector.send({ image: video });
            }
          },
          width: 320,
          height: 240
        });
        camera.start();
      }

      showNotification('info', '✋', 'Gesture Control', 'Gesture control active. Show fingers to navigate.');

    } catch (err) {
      console.error('Gesture Camera Error:', err);
      showNotification('error', '📷', 'Camera Error', 'Could not access camera for gestures.');
      stopGestureControl();
    }
  }

  function stopGestureControl() {
    isGestureActive = false;

    document.getElementById('gesturePanel').classList.remove('open');
    document.getElementById('gestureToggleBtn').classList.remove('active');
    document.querySelector('#gestureToggleBtn .btn-text').textContent = "Gestures Off";
    document.getElementById('gestureIndicator').style.display = 'none';

    if (camera) {
      camera.stop();
      camera = null;
    }

    if (gestureStream) {
      gestureStream.getTracks().forEach(t => t.stop());
      gestureStream = null;
    }

    const video = document.getElementById('gestureVideo');
    if (video) video.srcObject = null;
  }

  function onHandsResults(results) {
    if (!isGestureActive) return;

    const canvas = document.getElementById('gestureCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness[0].label; // "Left" or "Right" (mirrored)

      // Only draw basic joints for performance since it's a small panel
      drawHand(ctx, landmarks, canvas.width, canvas.height);

      // Count fingers
      const numFingers = countFingers(landmarks, handedness);
      currentDetectedFingers = numFingers;

      // Draw text on canvas
      ctx.fillStyle = '#FF9933';
      ctx.font = '24px Outfit';
      ctx.fillText(`${numFingers} Fingers`, 10, 30);

      handleGestureAction(numFingers);
    } else {
      currentDetectedFingers = 0;
      document.getElementById('gestureIndicator').style.display = 'none';
    }
  }

  function drawHand(ctx, landmarks, w, h) {
    ctx.fillStyle = '#138808';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    // Draw joints
    landmarks.forEach((lm) => {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  }

  function countFingers(landmarks, handedness) {
    let count = 0;
    
    // Finger tip indices: Thumb=4, Index=8, Middle=12, Ring=16, Pinky=20
    // Finger pip (middle joint) indices: Thumb=3, Index=6, Middle=10, Ring=14, Pinky=18

    // Thumb check (x coordinate instead of y)
    // Adjust based on handedness because of mirror effect
    if (handedness === 'Right') {
      if (landmarks[4].x < landmarks[3].x) count++;
    } else {
      if (landmarks[4].x > landmarks[3].x) count++;
    }

    // Other fingers check (y coordinate)
    if (landmarks[8].y < landmarks[6].y) count++;
    if (landmarks[12].y < landmarks[10].y) count++;
    if (landmarks[16].y < landmarks[14].y) count++;
    if (landmarks[20].y < landmarks[18].y) count++;

    return count;
  }

  function handleGestureAction(numFingers) {
    const now = Date.now();
    // Prevent multiple triggers within 2 seconds
    if (now - lastActionTime < 2000) return;

    if (numFingers >= 1 && numFingers <= 4) {
      const indicator = document.getElementById('gestureIndicator');
      indicator.style.display = 'flex';
      document.getElementById('gestureDetectedNumber').textContent = `Detected: ${numFingers}`;

      lastActionTime = now;
      let targetPage = '';
      let speakText = '';

      switch (numFingers) {
        case 1:
          targetPage = 'calculator';
          speakText = SanskritiAssistant.getTranslation('opening_calculator');
          break;
        case 2:
          targetPage = 'exercise';
          speakText = SanskritiAssistant.getTranslation('opening_exercise');
          break;
        case 3:
          targetPage = 'notes';
          speakText = SanskritiAssistant.getTranslation('opening_notes');
          break;
        case 4:
          targetPage = 'blind';
          speakText = SanskritiAssistant.getTranslation('opening_blind');
          break;
      }

      if (targetPage) {
        showNotification('info', '✋', `Gesture: ${numFingers}`, speakText);
        SanskritiAssistant.speak(speakText);
        setTimeout(() => {
          navigateTo(targetPage);
          indicator.style.display = 'none';
        }, 1000);
      }
    }
  }

  return {
    start: startGestureControl,
    stop: stopGestureControl,
    toggle: () => {
      if (isGestureActive) stopGestureControl();
      else startGestureControl();
    },
    isActive: () => isGestureActive
  };
})();

// Bridge function for inline HTML onclick
function toggleGestureControl() {
  if (typeof GestureControl !== 'undefined') {
    GestureControl.toggle();
  }
}
