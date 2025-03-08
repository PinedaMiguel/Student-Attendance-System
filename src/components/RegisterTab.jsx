import React, { useState, useEffect, useRef } from 'react';
import { detectFaces, drawFaceDetections, compareFaces } from '../services/faceDetectionServiceCDN';
import { 
  saveStudentToDB, 
  logAttendanceToDB, 
  hasAttendanceForTodayInClass 
} from '../services/databaseService';
import StudentRegistrationForm from './StudentRegistrationForm';
import ErrorBoundary from './ErrorBoundary';

const RegisterTab = ({ 
  students, 
  setStudents, 
  setAttendanceLog, 
  selectedClass,
  onDeleteStudent 
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedStudent, setRecognizedStudent] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Start the camera stream
  const startCamera = async () => {
    try {
      if (streamRef.current) return; // Camera already running
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        // Start face detection when camera is active
        startFaceDetection();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Cannot access camera. Please ensure you have granted camera permissions.');
    }
  };

  // Stop the camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsCameraActive(false);
    setDetectedFaces([]);
  };

  // Start face detection loop
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) return;
    
    // Use a simple interval for better performance 
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4 || !canvasRef.current) {
        return;
      }
      
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Set canvas dimensions to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        
        // Don't detect faces when registering a new student
        if (isRegistering) {
          // Clear canvas
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        
        // Detect faces
        const faces = await detectFaces(video);
        setDetectedFaces(faces);
        
        // Draw detections on canvas with recognized person info if available
        drawFaceDetections(canvas, faces, true, recognizedStudent);
        
        // Process detected faces for recognition (not during registration)
        if (faces.length > 0 && !isProcessing && !isRegistering) {
          recognizeFace(faces[0]);
        }
      } catch (error) {
        console.error('Error in face detection cycle:', error);
      }
    }, 300);
  };

  // Recognize a detected face
  const recognizeFace = async (detectedFace) => {
    if (students.length === 0 || !detectedFace || isProcessing || !selectedClass) return;
    
    setIsProcessing(true);
    
    try {
      // Find matching student
      const match = compareFaces(detectedFace.descriptor, students);
      
      // If face recognized
      if (match) {
        console.log('Student recognized:', match.student.name, 'with distance:', match.distance);
        
        // Check if already logged in today for this class
        const alreadyLoggedToday = await hasAttendanceForTodayInClass(match.student.id, selectedClass);
        
        if (!alreadyLoggedToday) {
          // Log attendance for the class session
          const newLog = await logAttendanceToDB(match.student.id, match.student.name, selectedClass);
          if (newLog) {
            setAttendanceLog(prev => [newLog, ...prev]);
            
            // Show attendance logged notification ONLY for new attendances
            setRecognizedStudent({
              name: match.student.name,
              timestamp: new Date().toLocaleTimeString(),
              className: selectedClass,
              newAttendance: true
            });
            
            // Clear notification after 5 seconds
            setTimeout(() => {
              setRecognizedStudent(null);
            }, 5000);
          }
        } else {
          // Just update the recognized student for the face label without showing notification
          setRecognizedStudent({
            name: match.student.name,
            className: selectedClass,
            newAttendance: false
          });
        }
      }
    } catch (error) {
      console.error('Error during face recognition:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Register a new student
  const handleRegisterStudent = async (studentData) => {
    try {
      const newStudentId = await saveStudentToDB(studentData);
      const newStudent = { ...studentData, id: newStudentId };
      setStudents(prev => [...prev, newStudent]);
      
      // If a class is selected, log attendance for the newly registered student
      if (selectedClass) {
        const newLog = await logAttendanceToDB(newStudentId, studentData.name, selectedClass);
        if (newLog) {
          setAttendanceLog(prev => [newLog, ...prev]);
        }
      }
      
      // Exit registration mode
      setIsRegistering(false);
      
      alert(`Student "${studentData.name}" registered successfully!`);
    } catch (error) {
      console.error('Error registering student:', error);
      alert('Failed to register student. Please try again.');
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="register-tab">
      {isRegistering ? (
        <ErrorBoundary>
          <StudentRegistrationForm
            onRegister={handleRegisterStudent}
            onCancel={() => setIsRegistering(false)}
            selectedClass={selectedClass}
          />
        </ErrorBoundary>
      ) : (
        <>
          <div className="camera-container">
            {!selectedClass && (
              <div className="class-warning">
                <p>Please select or add a class to begin taking attendance</p>
              </div>
            )}
            <div className="video-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  transform: 'scaleX(-1)',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isCameraActive ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  display: isCameraActive ? 'block' : 'none'
                }}
              />
              
              {!isCameraActive && (
                <div className="camera-placeholder">
                  <p>Camera is turned off</p>
                  <p>Click "Start Camera" to begin</p>
                </div>
              )}
            </div>
            
            {recognizedStudent && recognizedStudent.newAttendance && (
              <div className="recognition-alert" style={{ backgroundColor: 'rgba(46, 204, 113, 0.9)' }}>
                <p>✅ Attendance logged for: <strong>{recognizedStudent.name}</strong></p>
                <p>Class: {recognizedStudent.className}</p>
                <p>Time: {recognizedStudent.timestamp}</p>
              </div>
            )}
            
            <div className="camera-controls">
              {isCameraActive ? (
                <>
                  <button onClick={stopCamera} className="btn btn-danger">
                    Stop Camera
                  </button>
                  
                  <button 
                    onClick={() => setIsRegistering(true)}
                    className="btn btn-success"
                    disabled={!selectedClass}
                  >
                    Register New Student
                  </button>
                </>
              ) : (
                <button onClick={startCamera} className="btn btn-primary">
                  Start Camera
                </button>
              )}
            </div>
          </div>
          
          <div className="students-list">
            <h3>Registered Students ({students.length})</h3>
            
            {students.length === 0 ? (
              <p>No students registered yet.</p>
            ) : (
              <div className="students-grid">
                {students.map(student => (
                  <div key={student.id} className="student-card">
                    <img src={student.faceImage} alt={student.name} />
                    <h4>{student.name}</h4>
                    <p>ID: {student.id}</p>
                    <p>Registered: {new Date(student.registeredAt).toLocaleDateString()}</p>
                    <button
                      onClick={() => onDeleteStudent(student.id)}
                      className="btn-delete"
                      title="Delete student"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RegisterTab;