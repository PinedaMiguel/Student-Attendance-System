import React, { useState, useEffect } from 'react';
// Import the CDN version instead of the local version
import { loadModels } from './services/faceDetectionServiceCDN';
import { 
  loadStudentsFromDB, 
  loadAttendanceFromDB,
  getClassNames,
  deleteStudentFromDB,
  clearAttendanceLogs,
  clearClassAttendanceLogs 
} from './services/databaseService';
import RegisterTab from './components/RegisterTab';
import AttendanceTab from './components/AttendanceTab';
import DebugModels from './components/DebugModels';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showManagement, setShowManagement] = useState(false);

  // Load face detection models and database data on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Load face-api.js models
        const modelsSuccess = await loadModels();
        setModelsLoaded(modelsSuccess);
        
        // Load students from database
        const loadedStudents = await loadStudentsFromDB();
        setStudents(loadedStudents || []);
        
        // Load attendance records
        const loadedAttendance = await loadAttendanceFromDB();
        setAttendanceLog(loadedAttendance || []);
        
        // Load available classes
        const classNames = await getClassNames();
        setClasses(classNames || []);
        
        // Set default class if available
        if (classNames.length > 0) {
          setSelectedClass(classNames[0]);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Load attendance records when switching to attendance tab or changing class
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendanceFromDB(selectedClass).then(logs => setAttendanceLog(logs || []));
    }
  }, [activeTab, selectedClass]);
  
  // Add a new class
  const handleAddClass = (newClassName) => {
    if (newClassName && !classes.includes(newClassName)) {
      setClasses([...classes, newClassName]);
      setSelectedClass(newClassName);
    }
  };
  
  // Delete a student
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudentFromDB(studentId);
        setStudents(students.filter(s => s.id !== studentId));
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };
  
  // Clear attendance logs for a class
  const handleClearAttendance = async (className = null) => {
    const confirmMessage = className 
      ? `Are you sure you want to clear all attendance records for ${className}?`
      : 'Are you sure you want to clear ALL attendance records?';
      
    if (window.confirm(confirmMessage)) {
      try {
        if (className) {
          await clearClassAttendanceLogs(className);
        } else {
          await clearAttendanceLogs();
        }
        setAttendanceLog([]);
      } catch (error) {
        console.error('Error clearing attendance logs:', error);
      }
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Student Attendance System</h1>
        
        <div className="class-selector">
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={classes.length === 0}
          >
            {classes.length === 0 && (
              <option value="">No classes available</option>
            )}
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          
          <button 
            onClick={() => {
              const newClass = prompt('Enter new class name:');
              if (newClass) handleAddClass(newClass);
            }}
            className="btn btn-sm"
          >
            Add Class
          </button>
        </div>
        
        <div className="tabs">
          <button 
            className={activeTab === 'register' ? 'active' : ''}
            onClick={() => setActiveTab('register')}
          >
            Register &amp; Check-In
          </button>
          <button 
            className={activeTab === 'attendance' ? 'active' : ''}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance Log
          </button>
          <button 
            className={showManagement ? 'active' : ''}
            onClick={() => setShowManagement(!showManagement)}
          >
            Manage Data
          </button>
        </div>
        
        {showManagement && (
          <div className="management-panel">
            <div className="management-section">
              <h3>Student Management</h3>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete ALL students?')) {
                    students.forEach(s => deleteStudentFromDB(s.id));
                    setStudents([]);
                  }
                }}
                className="btn btn-danger"
                disabled={students.length === 0}
              >
                Delete All Students
              </button>
            </div>
            
            <div className="management-section">
              <h3>Attendance Management</h3>
              <button 
                onClick={() => handleClearAttendance(selectedClass)}
                className="btn btn-warning"
                disabled={!selectedClass}
              >
                Clear Attendance for {selectedClass || 'Current Class'}
              </button>
              
              <button 
                onClick={() => handleClearAttendance()}
                className="btn btn-danger"
              >
                Clear ALL Attendance Records
              </button>
            </div>
          </div>
        )}
      </header>
      
      <main>
        {loading ? (
          <div className="loading">
            <p>Loading application...</p>
          </div>
        ) : !modelsLoaded ? (
          <div className="loading">
            <p>Failed to load face detection models. Please check your internet connection and reload the page.</p>
            <ErrorBoundary>
              <DebugModels />
            </ErrorBoundary>
          </div>
        ) : activeTab === 'register' ? (
          <ErrorBoundary>
            <RegisterTab 
              students={students} 
              setStudents={setStudents} 
              setAttendanceLog={setAttendanceLog}
              selectedClass={selectedClass}
              onDeleteStudent={handleDeleteStudent} 
            />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <AttendanceTab 
              attendanceLog={attendanceLog}
              selectedClass={selectedClass} 
            />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default App;