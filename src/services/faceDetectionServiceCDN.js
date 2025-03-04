import * as faceapi from 'face-api.js';

// Use CDN for models instead of local files
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Load the face detection models from CDN
export const loadModels = async () => {
  try {
    console.log('Starting to load face detection models from CDN...');
    
    console.log('Loading Tiny Face Detector model...');
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    console.log('Tiny Face Detector model loaded');
    
    console.log('Loading Face Landmark model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    console.log('Face Landmark model loaded');
    
    console.log('Loading Face Recognition model...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('Face Recognition model loaded');
    
    console.log('All face detection models loaded successfully from CDN');
    return true;
  } catch (error) {
    console.error('Error loading face detection models from CDN:', error);
    return false;
  }
};

// Detect faces in the video stream
export const detectFaces = async (videoElement) => {
  if (!videoElement || videoElement.readyState !== 4) {
    return [];
  }

  try {
    const detectedFaces = await faceapi.detectAllFaces(
      videoElement, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptors();
    
    return detectedFaces;
  } catch (error) {
    console.error('Error detecting faces:', error);
    return [];
  }
};

// Compare face descriptors to find matches
export const compareFaces = (faceDescriptor, registeredStudents, threshold = 0.6) => {
  if (!faceDescriptor || registeredStudents.length === 0) {
    return null;
  }

  try {
    // Convert to Float32Array if it's a regular array
    const descriptor = Array.isArray(faceDescriptor) 
      ? new Float32Array(faceDescriptor) 
      : faceDescriptor;

    let minDistance = Infinity;
    let matchedStudent = null;
    
    for (const student of registeredStudents) {
      if (student.faceDescriptor) {
        const studentDescriptor = Array.isArray(student.faceDescriptor)
          ? new Float32Array(student.faceDescriptor)
          : student.faceDescriptor;
        
        const distance = faceapi.euclideanDistance(descriptor, studentDescriptor);
        
        if (distance < minDistance && distance < threshold) {
          minDistance = distance;
          matchedStudent = student;
        }
      }
    }
    
    return matchedStudent ? { student: matchedStudent, distance: minDistance } : null;
  } catch (error) {
    console.error('Error comparing faces:', error);
    return null;
  }
};

// Draw face detections on canvas
export const drawFaceDetections = (canvas, detections, mirrored = true) => {
  if (!canvas || !detections || detections.length === 0) {
    return;
  }

  const ctx = canvas.getContext('2d');
  
  // Clear the entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Save the current transform
  ctx.save();
  
  // Apply mirroring if needed
  if (mirrored) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  
  // Draw each detection
  detections.forEach(detection => {
    const box = detection.detection.box;
    
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    
    // Draw the box at the appropriate position
    if (mirrored) {
      // Already flipped the context, so draw normally
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    } else {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  });
  
  // Restore the original transform (this is safer than setTransform)
  ctx.restore();
};

// Capture a face image from the canvas
export const captureFaceImage = (videoElement, canvas, detection) => {
  if (!videoElement || !canvas || !detection) {
    console.error("Missing required elements for face capture");
    return null;
  }

  try {
    console.log("Starting face capture...");
    
    // Create a separate canvas for the capture (to avoid flipping issues)
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = videoElement.videoWidth || 640;
    captureCanvas.height = videoElement.videoHeight || 480;
    
    const ctx = captureCanvas.getContext('2d');
    
    // Clear the canvas first
    ctx.clearRect(0, 0, captureCanvas.width, captureCanvas.height);
    
    // The video is mirrored, so we need to flip it back for the capture
    ctx.save();
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    
    // Draw the video frame to the canvas
    ctx.drawImage(
      videoElement, 
      0, 0, 
      captureCanvas.width, captureCanvas.height
    );
    
    // Reset the transformation
    ctx.restore();
    
    // Draw a rectangle around the face to indicate it was captured
    const box = detection.detection.box;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      captureCanvas.width - box.x - box.width,
      box.y, 
      box.width, 
      box.height
    );
    
    console.log("Face captured successfully");
    
    // Return the image data and descriptor
    return {
      descriptor: Array.from(detection.descriptor),
      imageData: captureCanvas.toDataURL('image/jpeg')
    };
  } catch (error) {
    console.error('Error capturing face image:', error);
    return null;
  }
};