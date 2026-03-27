/* ===================================================
   Exercise Guide Module — MediaPipe Pose
   =================================================== */

let exerciseStream = null;
let exerciseAnimFrame = null;
let poseDetector = null;
let currentExercise = null;
let repCounter = 0;
let exercisePhase = 'up'; // for tracking rep phases
let lastFeedbackTime = 0;

// Angle calculation helper
function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

async function startExercise(type) {
  currentExercise = type;
  repCounter = 0;
  exercisePhase = 'up';

  // Update UI
  document.getElementById('exerciseSelect').style.display = 'none';
  document.getElementById('exerciseActive').style.display = 'flex';
  document.getElementById('repCount').textContent = '0';
  document.getElementById('exerciseName').textContent = type.charAt(0).toUpperCase() + type.slice(1);
  document.getElementById('formStatus').textContent = '—';
  document.getElementById('exerciseFeedback').innerHTML = '';

  // Get camera
  try {
    exerciseStream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' }, 
      audio: false 
    });
    const video = document.getElementById('exerciseVideo');
    video.srcObject = exerciseStream;
    await video.play();

    // Load MediaPipe Pose
    await loadPoseDetector();
    detectPose();

    // Speak instruction
    const t = SanskritiAssistant.getTranslation(`exercise_${type}`);
    SanskritiAssistant.speak(t);
  } catch (err) {
    console.error('Camera error:', err);
    showNotification('error', '📷', 'Camera Error', 'Could not access camera. Please allow camera permissions.');
    stopExercise();
  }
}

async function loadPoseDetector() {
  // Using MediaPipe Pose via CDN (loaded dynamically)
  if (typeof Pose === 'undefined') {
    // Load MediaPipe scripts dynamically
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
  }

  if (typeof Pose !== 'undefined') {
    poseDetector = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    poseDetector.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    poseDetector.onResults(onPoseResults);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      console.warn('Failed to load:', src);
      resolve(); // Don't block on failure
    };
    document.head.appendChild(script);
  });
}

async function detectPose() {
  const video = document.getElementById('exerciseVideo');
  if (!video || !exerciseStream) return;

  if (poseDetector) {
    // Use MediaPipe
    async function processFrame() {
      if (!exerciseStream) return;
      try {
        await poseDetector.send({ image: video });
      } catch (e) { /* ignore */ }
      exerciseAnimFrame = requestAnimationFrame(processFrame);
    }
    processFrame();
  } else {
    // Fallback: Simple motion-based feedback without MediaPipe
    runFallbackExercise();
  }
}

function onPoseResults(results) {
  const canvas = document.getElementById('exerciseCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.poseLandmarks) {
    // Draw skeleton
    drawSkeleton(ctx, results.poseLandmarks, canvas.width, canvas.height);

    // Analyze pose based on exercise type
    analyzePose(results.poseLandmarks);
  }
}

function drawSkeleton(ctx, landmarks, w, h) {
  // Draw connections
  const connections = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
    [24, 26], [26, 28]
  ];

  ctx.strokeStyle = '#FF9933';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  connections.forEach(([i, j]) => {
    const a = landmarks[i];
    const b = landmarks[j];
    if (a.visibility > 0.5 && b.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
  });

  // Draw joints
  landmarks.forEach((lm, i) => {
    if (lm.visibility > 0.5 && i >= 11) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#138808';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function analyzePose(landmarks) {
  const now = Date.now();
  
  switch (currentExercise) {
    case 'squats':
      analyzeSquat(landmarks, now);
      break;
    case 'pushups':
      analyzePushup(landmarks, now);
      break;
    case 'yoga':
      analyzeYoga(landmarks, now);
      break;
  }
}

function analyzeSquat(landmarks, now) {
  // Key points: hip (23/24), knee (25/26), ankle (27/28)
  const hip = landmarks[23];
  const knee = landmarks[25];
  const ankle = landmarks[27];
  const shoulder = landmarks[11];

  if (hip.visibility < 0.5 || knee.visibility < 0.5 || ankle.visibility < 0.5) return;

  const kneeAngle = calculateAngle(hip, knee, ankle);

  // Check form
  if (shoulder.visibility > 0.5) {
    const backAngle = calculateAngle(
      { x: shoulder.x, y: shoulder.y },
      hip,
      { x: hip.x, y: hip.y + 0.3 }
    );
    
    if (backAngle > 30 && now - lastFeedbackTime > 3000) {
      giveFeedback('keep_back_straight');
      document.getElementById('formStatus').textContent = '⚠️ Fix';
      lastFeedbackTime = now;
    }
  }

  // Count reps
  if (kneeAngle < 100 && exercisePhase === 'up') {
    exercisePhase = 'down';
    document.getElementById('formStatus').textContent = '✅ Good';
  }
  if (kneeAngle > 160 && exercisePhase === 'down') {
    exercisePhase = 'up';
    repCounter++;
    document.getElementById('repCount').textContent = repCounter;
    if (now - lastFeedbackTime > 2000) {
      giveFeedback('good_form');
      lastFeedbackTime = now;
    }
  }
}

function analyzePushup(landmarks, now) {
  const shoulder = landmarks[11];
  const elbow = landmarks[13];
  const wrist = landmarks[15];

  if (shoulder.visibility < 0.5 || elbow.visibility < 0.5 || wrist.visibility < 0.5) return;

  const elbowAngle = calculateAngle(shoulder, elbow, wrist);

  if (elbowAngle < 90 && exercisePhase === 'up') {
    exercisePhase = 'down';
  }
  if (elbowAngle > 150 && exercisePhase === 'down') {
    exercisePhase = 'up';
    repCounter++;
    document.getElementById('repCount').textContent = repCounter;
    if (now - lastFeedbackTime > 2000) {
      giveFeedback('good_form');
      lastFeedbackTime = now;
    }
  }
}

function analyzeYoga(landmarks, now) {
  // Simple balance check — tree pose
  const hip = landmarks[23];
  const shoulder = landmarks[11];
  
  if (hip.visibility < 0.5 || shoulder.visibility < 0.5) return;

  const balance = Math.abs(hip.x - shoulder.x);
  
  if (balance < 0.05) {
    document.getElementById('formStatus').textContent = '✅ Balanced';
    if (now - lastFeedbackTime > 4000) {
      giveFeedback('good_form');
      lastFeedbackTime = now;
    }
  } else {
    document.getElementById('formStatus').textContent = '⚠️ Adjust';
    if (now - lastFeedbackTime > 4000) {
      giveFeedback('keep_back_straight');
      lastFeedbackTime = now;
    }
  }
}

function giveFeedback(key) {
  const text = SanskritiAssistant.getTranslation(key);
  const feedbackEl = document.getElementById('exerciseFeedback');
  if (feedbackEl) {
    feedbackEl.innerHTML = `<p>${text}</p>`;
  }
  SanskritiAssistant.speak(text);
}

function runFallbackExercise() {
  // Simple fallback without MediaPipe — just shows camera feed
  const canvas = document.getElementById('exerciseCanvas');
  const ctx = canvas.getContext('2d');
  const video = document.getElementById('exerciseVideo');

  function draw() {
    if (!exerciseStream) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw simple overlay text
    ctx.fillStyle = 'rgba(255,153,51,0.8)';
    ctx.font = '16px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('Pose detection loading...', canvas.width / 2, canvas.height - 30);

    exerciseAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}

function stopExercise() {
  if (exerciseStream) {
    exerciseStream.getTracks().forEach(t => t.stop());
    exerciseStream = null;
  }
  if (exerciseAnimFrame) {
    cancelAnimationFrame(exerciseAnimFrame);
    exerciseAnimFrame = null;
  }
  currentExercise = null;
  repCounter = 0;
  exercisePhase = 'up';

  const video = document.getElementById('exerciseVideo');
  if (video) video.srcObject = null;

  document.getElementById('exerciseSelect').style.display = 'block';
  document.getElementById('exerciseActive').style.display = 'none';
}
