import * as faceapi from 'face-api.js';

// Load the face detection models
export const loadModels = async () => {
  try {
    console.log('Starting to load face detection models...');
    
    // Check if models directory is accessible
    try {
      const testResponse = await fetch('/models/tiny_face_detector_model-weights_manifest.json');
      if (!testResponse.ok) {
        console.error(`Models directory check failed: ${testResponse.status} ${testResponse.statusText}`);
        return false;
      }
      console.log('Models directory is accessible');
    } catch (error) {
      console.error('Cannot access models directory:', error);
      return false;
    }
    
    // Load models one by one with detailed logging
    console.log('Loading Tiny Face Detector model...');
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    console.log('Tiny Face Detector model loaded');
    
    console.log('Loading Face Landmark model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    console.log('Face Landmark model loaded');
    
    console.log('Loading Face Recognition model...');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    console.log('Face Recognition model loaded');
    
    console.log('All face detection models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face detection models:', error);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mirrored) {
    // Flip the canvas horizontally to match the mirrored video
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  detections.forEach(detection => {
    const box = detection.detection.box;
    
    // Draw rectangle around face
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 2;
    
    if (mirrored) {
      ctx.strokeRect(canvas.width - box.x - box.width, box.y, box.width, box.height);
    } else {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  });

  // Reset transformation
  if (mirrored) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
};

// Capture a face image from the canvas
export const captureFaceImage = (videoElement, canvas, detection) => {
  if (!videoElement || !canvas || !detection) {
    return null;
  }

  try {
    const box = detection.detection.box;
    
    // Set canvas dimensions
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the video frame to the canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Return the image data and descriptor
    return {
      descriptor: Array.from(detection.descriptor),
      imageData: canvas.toDataURL('image/jpeg')
    };
  } catch (error) {
    console.error('Error capturing face image:', error);
    return null;
  }
};