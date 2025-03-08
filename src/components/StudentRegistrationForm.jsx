import React, { useState } from 'react';
import WebcamCapture from './WebcamCapture';
import ErrorBoundary from './ErrorBoundary';

const StudentRegistrationForm = ({ onRegister, onCancel, selectedClass }) => {
  const [step, setStep] = useState('capture'); // 'capture' or 'details'
  const [studentName, setStudentName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // Handle photo capture from WebcamCapture component
  const handleCapture = (captureData) => {
    setCapturedImage(captureData.imageData);
    setFaceDescriptor(captureData.descriptor);
    setStep('details');
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!studentName.trim()) {
      alert('Please enter a student name');
      return;
    }
    
    // Call the onRegister callback with student data
    onRegister({
      name: studentName,
      faceImage: capturedImage,
      faceDescriptor: faceDescriptor,
      registeredAt: new Date().toISOString()
    });
  };

  return (
    <div className="student-registration-form">
      <h2>Register New Student</h2>
      
      {step === 'capture' ? (
        <ErrorBoundary>
          <WebcamCapture
            onCapture={handleCapture}
            onCancel={onCancel}
          />
        </ErrorBoundary>
      ) : (
        <div className="student-details">
          <div className="captured-photo">
            <img src={capturedImage} alt="Captured student" />
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="studentName">Student Name:</label>
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter student name"
                required
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="className">Class:</label>
              <input
                type="text"
                id="className"
                value={selectedClass || ''}
                disabled
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-register">
                Register Student
              </button>
              
              <button 
                type="button" 
                className="btn-retake"
                onClick={() => setStep('capture')}
              >
                Retake Photo
              </button>
              
              <button 
                type="button" 
                className="btn-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StudentRegistrationForm;