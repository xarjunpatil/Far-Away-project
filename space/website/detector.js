/* ═══════════════════════════════════════════════════════
   SpaceClean — Real-Time Detection Engine
   TensorFlow.js COCO-SSD + Space Junk Classification
   ═══════════════════════════════════════════════════════ */

// ── Space Junk Label Mapping ──
// Maps COCO-SSD detected objects to space debris categories for hackathon demo
const SPACE_JUNK_MAP = {
    'cell phone':      { label: 'Defunct Satellite Module', threat: 'CRITICAL', icon: '🛰️' },
    'laptop':          { label: 'Solar Panel Fragment', threat: 'CRITICAL', icon: '⚡' },
    'remote':          { label: 'Satellite Antenna Debris', threat: 'HIGH', icon: '📡' },
    'tv':              { label: 'Large Orbital Debris', threat: 'CRITICAL', icon: '🔴' },
    'monitor':         { label: 'Large Orbital Debris', threat: 'CRITICAL', icon: '🔴' },
    'mouse':           { label: 'Small Metallic Fragment', threat: 'MEDIUM', icon: '🔩' },
    'keyboard':        { label: 'Thermal Blanket Debris', threat: 'HIGH', icon: '🧊' },
    'bottle':          { label: 'Fuel Tank Fragment', threat: 'HIGH', icon: '🛢️' },
    'cup':             { label: 'Rocket Fairing Piece', threat: 'MEDIUM', icon: '🚀' },
    'bowl':            { label: 'Payload Adapter Ring', threat: 'MEDIUM', icon: '⭕' },
    'book':            { label: 'Solar Array Section', threat: 'HIGH', icon: '📐' },
    'clock':           { label: 'Reaction Wheel Unit', threat: 'HIGH', icon: '⚙️' },
    'scissors':        { label: 'Boom Antenna Fragment', threat: 'MEDIUM', icon: '✂️' },
    'toothbrush':      { label: 'Micro Debris Cluster', threat: 'LOW', icon: '🔬' },
    'pen':             { label: 'Thermal Rod Fragment', threat: 'LOW', icon: '🖊️' },
    'backpack':        { label: 'EVA Equipment Lost', threat: 'HIGH', icon: '🎒' },
    'handbag':         { label: 'Tool Bag Lost in EVA', threat: 'MEDIUM', icon: '🧰' },
    'umbrella':        { label: 'Deployed Solar Sail', threat: 'MEDIUM', icon: '☂️' },
    'suitcase':        { label: 'Cargo Container Debris', threat: 'HIGH', icon: '📦' },
    'sports ball':     { label: 'Spherical Tank Fragment', threat: 'MEDIUM', icon: '⚽' },
    'frisbee':         { label: 'Circular Debris Object', threat: 'MEDIUM', icon: '🥏' },
    'kite':            { label: 'Reflective Panel Fragment', threat: 'LOW', icon: '🪁' },
    'person':          { label: 'Astronaut (EVA Activity)', threat: 'LOW', icon: '👨‍🚀' },
    'bicycle':         { label: 'Structural Framework', threat: 'HIGH', icon: '🏗️' },
    'car':             { label: 'Upper Stage Rocket Body', threat: 'CRITICAL', icon: '🚗' },
    'airplane':        { label: 'Large Booster Stage', threat: 'CRITICAL', icon: '✈️' },
    'bird':            { label: 'Small Debris Object', threat: 'LOW', icon: '🐦' },
    'cat':             { label: 'Thermal Insulation Debris', threat: 'LOW', icon: '🧶' },
    'dog':             { label: 'Organic Contamination', threat: 'LOW', icon: '🦠' },
    'chair':           { label: 'Docking Mechanism Fragment', threat: 'HIGH', icon: '🪑' },
    'couch':           { label: 'Station Module Debris', threat: 'CRITICAL', icon: '🛋️' },
    'potted plant':    { label: 'Bio-experiment Container', threat: 'LOW', icon: '🌱' },
    'bed':             { label: 'Habitat Module Section', threat: 'CRITICAL', icon: '🛏️' },
    'dining table':    { label: 'Truss Segment Debris', threat: 'CRITICAL', icon: '📏' },
    'knife':           { label: 'Sharp Metallic Fragment', threat: 'HIGH', icon: '🗡️' },
    'fork':            { label: 'Antenna Prong Debris', threat: 'MEDIUM', icon: '🔱' },
    'spoon':           { label: 'Curved Panel Fragment', threat: 'LOW', icon: '🥄' },
};

// Default for unmapped objects
const DEFAULT_DEBRIS = { label: 'Unidentified Orbital Debris', threat: 'MEDIUM', icon: '❓' };

// Threat colors
const THREAT_COLORS = {
    'CRITICAL': { color: '#ff1744', glow: 'rgba(255, 23, 68, 0.4)', bg: 'rgba(255, 23, 68, 0.15)' },
    'HIGH':     { color: '#ff9100', glow: 'rgba(255, 145, 0, 0.4)', bg: 'rgba(255, 145, 0, 0.15)' },
    'MEDIUM':   { color: '#ffea00', glow: 'rgba(255, 234, 0, 0.4)', bg: 'rgba(255, 234, 0, 0.15)' },
    'LOW':      { color: '#00e676', glow: 'rgba(0, 230, 118, 0.4)', bg: 'rgba(0, 230, 118, 0.15)' },
};

// ── State ──
let model = null;
let video = null;
let canvas = null;
let ctx = null;
let detectionActive = false;
let mediaStream = null;
let totalDetections = 0;
let facingMode = 'environment';
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;
let lastSyncTime = 0;

// ── DOM Elements ──
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');
const switchBtn = document.getElementById('switchBtn');
const cameraFeed = document.getElementById('cameraFeed');
const detectionCanvas = document.getElementById('detectionCanvas');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const scanLine = document.getElementById('scanLine');
const cameraStatus = document.getElementById('cameraStatus');
const statusText = document.getElementById('statusText');
const fpsCounter = document.getElementById('fpsCounter');
const objectCount = document.getElementById('objectCount');
const confidence = document.getElementById('confidence');
const totalDetectionsEl = document.getElementById('totalDetections');
const detectionList = document.getElementById('detectionList');
const threatBar = document.getElementById('threatBar');
const threatText = document.getElementById('threatText');
const sensitivityInput = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const showBoxes = document.getElementById('showBoxes');

// ── Initialize ──
document.addEventListener('DOMContentLoaded', async () => {
    canvas = detectionCanvas;
    ctx = canvas.getContext('2d');

    // Event listeners
    startBtn.addEventListener('click', startDetection);
    stopBtn.addEventListener('click', stopDetection);
    captureBtn.addEventListener('click', captureFrame);
    switchBtn.addEventListener('click', switchCamera);
    sensitivityInput.addEventListener('input', () => {
        sensitivityValue.textContent = sensitivityInput.value;
    });

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('show');
        });
    }

    // Load model and camera
    await loadModel();
    await initCamera();
});

// ── Load TensorFlow.js COCO-SSD Model ──
async function loadModel() {
    try {
        loadingText.textContent = 'Loading TensorFlow.js AI Model...';
        model = await cocoSsd.load({
            base: 'lite_mobilenet_v2'  // Lighter model for faster detection
        });
        console.log('✅ COCO-SSD model loaded');
        loadingText.textContent = 'AI Model Ready! Initializing camera...';
    } catch (error) {
        console.error('❌ Model loading failed:', error);
        loadingText.textContent = '❌ Failed to load AI model. Check internet connection.';
    }
}

// ── Initialize Camera ──
async function initCamera() {
    try {
        loadingText.textContent = 'Requesting camera access...';
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        cameraFeed.srcObject = mediaStream;
        video = cameraFeed;

        await new Promise(resolve => {
            cameraFeed.onloadedmetadata = () => {
                cameraFeed.play();
                resolve();
            };
        });

        // Set canvas dimensions
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;

        // Update UI
        loadingOverlay.classList.add('hidden');
        startBtn.disabled = false;
        cameraStatus.classList.remove('live');
        statusText.textContent = 'Camera Ready';

        console.log(`📷 Camera initialized: ${cameraFeed.videoWidth}x${cameraFeed.videoHeight}`);
    } catch (error) {
        console.error('❌ Camera access denied:', error);
        loadingText.innerHTML = '<span style="color: var(--danger);">❌ Camera access denied. Please allow camera permission and reload.</span>';
    }
}

// ── Start Detection ──
function startDetection() {
    if (!model) {
        alert('AI model is still loading. Please wait...');
        return;
    }

    detectionActive = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    captureBtn.disabled = false;

    // Activate scanning overlay
    scanLine.classList.add('active');
    cameraStatus.classList.add('live');
    statusText.textContent = 'DETECTING';

    // Start FPS counter
    frameCount = 0;
    lastFpsTime = performance.now();

    // Begin detection loop
    detectFrame();
}

// ── Stop Detection ──
function stopDetection() {
    detectionActive = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    captureBtn.disabled = true;

    scanLine.classList.remove('active');
    cameraStatus.classList.remove('live');
    statusText.textContent = 'Camera Ready';
    fpsCounter.textContent = '0 FPS';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ── Main Detection Loop ──
async function detectFrame() {
    if (!detectionActive || !model) return;

    try {
        const threshold = parseInt(sensitivityInput.value) / 100;

        // Run COCO-SSD detection
        const predictions = await model.detect(cameraFeed, undefined, threshold);

        // Update canvas size if needed
        if (canvas.width !== cameraFeed.videoWidth || canvas.height !== cameraFeed.videoHeight) {
            canvas.width = cameraFeed.videoWidth;
            canvas.height = cameraFeed.videoHeight;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Process and draw detections
        if (predictions.length > 0 && showBoxes.checked) {
            drawDetections(predictions);
        }

        // Update UI stats
        updateStats(predictions);

        // Sync with Python Backend every 5 seconds if objects are found
        const nowSync = performance.now();
        if (predictions.length > 0 && nowSync - lastSyncTime > 5000) {
            syncWithBackend(predictions.length);
            lastSyncTime = nowSync;
        }

        // FPS counter
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            currentFps = frameCount;
            frameCount = 0;
            lastFpsTime = now;
            fpsCounter.textContent = `${currentFps} FPS`;
        }

    } catch (error) {
        console.error('Detection error:', error);
    }

    // Continue loop
    if (detectionActive) {
        requestAnimationFrame(detectFrame);
    }
}

// ── Draw Bounding Boxes ──
function drawDetections(predictions) {
    predictions.forEach(pred => {
        const [x, y, width, height] = pred.bbox;
        const debris = SPACE_JUNK_MAP[pred.class] || DEFAULT_DEBRIS;
        const colors = THREAT_COLORS[debris.threat];
        const conf = Math.round(pred.score * 100);

        // Outer glow
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;

        // Bounding box
        ctx.strokeStyle = colors.color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, width, height);

        // Reset shadow
        ctx.shadowBlur = 0;

        // Corner accents (thicker corner lines)
        const cornerLen = Math.min(width, height) * 0.2;
        ctx.lineWidth = 4;
        ctx.strokeStyle = colors.color;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + cornerLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + height - cornerLen);
        ctx.lineTo(x, y + height);
        ctx.lineTo(x + cornerLen, y + height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + width - cornerLen, y + height);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x + width, y + height - cornerLen);
        ctx.stroke();

        // Label background
        const label = `${debris.icon} ${debris.label}`;
        const confLabel = `${conf}% | ${debris.threat}`;
        ctx.font = 'bold 13px Inter, sans-serif';
        const labelWidth = Math.max(ctx.measureText(label).width, ctx.measureText(confLabel).width) + 16;
        const labelHeight = 42;
        const labelY = y > labelHeight + 5 ? y - labelHeight - 5 : y + height + 5;

        // Label box
        ctx.fillStyle = colors.bg;
        ctx.fillRect(x, labelY, labelWidth, labelHeight);
        ctx.strokeStyle = colors.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, labelY, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = colors.color;
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(label, x + 8, labelY + 16);
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(confLabel, x + 8, labelY + 34);
    });
}

// ── Update Stats Panel ──
function updateStats(predictions) {
    const debrisObjects = predictions.map(pred => ({
        ...pred,
        debris: SPACE_JUNK_MAP[pred.class] || DEFAULT_DEBRIS
    }));

    // Object count
    objectCount.textContent = debrisObjects.length;

    // Average confidence
    if (debrisObjects.length > 0) {
        const avgConf = debrisObjects.reduce((sum, obj) => sum + obj.score, 0) / debrisObjects.length;
        confidence.textContent = Math.round(avgConf * 100) + '%';
        totalDetections += debrisObjects.length;
        totalDetectionsEl.textContent = totalDetections.toLocaleString();
    } else {
        confidence.textContent = '0%';
    }

    // Threat level
    updateThreatLevel(debrisObjects);

    // Detection list
    updateDetectionList(debrisObjects);
}

// ── Update Threat Gauge ──
function updateThreatLevel(objects) {
    if (objects.length === 0) {
        threatBar.style.width = '0%';
        threatText.textContent = '🟢 SAFE';
        threatText.style.color = 'var(--success)';
        return;
    }

    const threatScores = { 'CRITICAL': 100, 'HIGH': 70, 'MEDIUM': 40, 'LOW': 15 };
    let maxThreat = 0;
    let maxThreatLevel = 'LOW';

    objects.forEach(obj => {
        const score = threatScores[obj.debris.threat] || 0;
        if (score > maxThreat) {
            maxThreat = score;
            maxThreatLevel = obj.debris.threat;
        }
    });

    threatBar.style.width = maxThreat + '%';

    const threatDisplay = {
        'CRITICAL': { text: '🔴 CRITICAL', color: 'var(--danger)' },
        'HIGH':     { text: '🟠 HIGH', color: 'var(--warning)' },
        'MEDIUM':   { text: '🟡 MEDIUM', color: '#ffea00' },
        'LOW':      { text: '🟢 LOW', color: 'var(--success)' },
    };

    const display = threatDisplay[maxThreatLevel] || threatDisplay['LOW'];
    threatText.textContent = display.text;
    threatText.style.color = display.color;
}

async function syncWithBackend(count) {
    try {
        await fetch('/log_detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: count })
        });
    } catch (err) {
        console.warn('Backend sync unavailable');
    }
}

// ── Update Detection List ──
function updateDetectionList(objects) {
    if (objects.length === 0) {
        detectionList.innerHTML = '<p class="empty-state">No objects detected</p>';
        return;
    }

    detectionList.innerHTML = objects.map((obj, i) => {
        const debris = obj.debris;
        const conf = Math.round(obj.score * 100);
        const threatClass = debris.threat === 'CRITICAL' ? 'critical' : debris.threat === 'HIGH' ? 'warning' : '';

        return `
            <div class="detection-item ${threatClass}">
                <strong>${debris.icon} ${debris.label}</strong><br>
                <small>Confidence: ${conf}% &nbsp;|&nbsp; Threat: ${debris.threat}</small>
            </div>
        `;
    }).join('');
}

// ── Capture Screenshot ──
function captureFrame() {
    // Create a composite canvas with video + detections
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = cameraFeed.videoWidth;
    captureCanvas.height = cameraFeed.videoHeight;
    const captureCtx = captureCanvas.getContext('2d');

    // Draw video frame
    captureCtx.drawImage(cameraFeed, 0, 0);

    // Draw detection overlays
    captureCtx.drawImage(canvas, 0, 0);

    // Add timestamp watermark
    captureCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    captureCtx.fillRect(0, captureCanvas.height - 40, captureCanvas.width, 40);
    captureCtx.fillStyle = '#00d9ff';
    captureCtx.font = 'bold 14px Orbitron, monospace';
    captureCtx.fillText(`🛰️ SpaceClean Detection — ${new Date().toLocaleString()}`, 10, captureCanvas.height - 15);

    // Download
    captureCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spaceclean_detection_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// ── Switch Camera ──
async function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';

    // Stop current stream
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    const wasActive = detectionActive;
    if (wasActive) stopDetection();

    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = 'Switching camera...';

    await initCamera();

    if (wasActive) startDetection();
}
