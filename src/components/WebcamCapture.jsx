import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const WebcamCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Start the camera when component mounts
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user" 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please ensure you have granted camera permissions.');
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Run face detection when camera is ready
  useEffect(() => {
    let detectionInterval = null;
    
    if (isCameraReady) {
      // Start face detection loop
      detectionInterval = setInterval(async () => {
        try {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          
          const detections = await faceapi.detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );
          
          setIsFaceDetected(!!detections);
          
          // Draw rectangle around face if detected
          if (detections && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            // Match canvas size to video
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            
            // Clear previous drawings
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw rectangle around face
            const { box } = detections;
            
            // Save current transform
            context.save();
            
            // Apply mirroring to match the mirrored video
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            
            // Draw face rectangle
            context.strokeStyle = '#00FF00';
            context.lineWidth = 3;
            context.strokeRect(box.x, box.y, box.width, box.height);
            
            // Restore transform
            context.restore();
            
            // Add "Ready to capture" text on top of the detection box
            const textX = canvas.width - box.x - box.width;
            const textY = box.y;
            
            // Draw text background
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(textX, textY - 25, 180, 25);
            
            // Draw text
            context.fillStyle = '#FFFFFF';
            context.font = '16px Arial';
            context.fillText('Ready to capture', textX + 5, textY - 7);
            
          } else if (canvasRef.current) {
            // Clear canvas if no face detected
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
          }
        } catch (error) {
          console.error('Face detection error:', error);
        }
      }, 200);
    }
    
    return () => {
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [isCameraReady]);

  // Handle capture button click
  const handleCapture = async () => {
    if (!videoRef.current || !isFaceDetected) return;

    try {
      setIsCapturing(true);
      
      // Detect face to get descriptor data
      const detections = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();
      
      if (!detections) {
        alert("No face detected. Please position your face in the camera view.");
        setIsCapturing(false);
        return;
      }
      
      // Create a canvas to take the snapshot
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = videoRef.current.videoWidth;
      captureCanvas.height = videoRef.current.videoHeight;
      
      const ctx = captureCanvas.getContext('2d');
      
      // Handle mirroring
      ctx.translate(captureCanvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Get the image data
      const imageData = captureCanvas.toDataURL('image/jpeg');
      
      // Call the onCapture callback with image and face data
      onCapture({
        imageData,
        descriptor: Array.from(detections.descriptor)
      });
      
    } catch (error) {
      console.error('Error capturing face:', error);
      alert('Error capturing face. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="webcam-capture">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        />
        
        {!isCameraReady && (
          <div className="loading-overlay">
            <p>Initializing camera...</p>
          </div>
        )}
      </div>
      
      <div className="capture-controls">
        <div className="face-status">
          {isFaceDetected ? (
            <span className="face-detected">Face detected ✓</span>
          ) : (
            <span className="no-face">No face detected ⨯</span>
          )}
        </div>
        
        <button
          className="btn-capture"
          onClick={handleCapture}
          disabled={!isFaceDetected || isCapturing || !isCameraReady}
        >
          {isCapturing ? 'Capturing...' : 'Take Photo'}
        </button>
        
        <button
          className="btn-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WebcamCapture;