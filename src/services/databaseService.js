// Database service for handling IndexedDB operations

// Initialize the database
export const initDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StudentAttendanceDB', 1);
      
      request.onerror = (event) => {
        console.error('Error opening database:', event);
        reject(event);
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create students store
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
          studentStore.createIndex('name', 'name', { unique: false });
        }
        
        // Create attendance log store
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
          attendanceStore.createIndex('studentId', 'studentId', { unique: false });
          attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
          attendanceStore.createIndex('className', 'className', { unique: false });
        }
      };
    });
  };
  
  // Load all students from the database
  export const loadStudentsFromDB = async () => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (error) => {
          console.error('Error loading students:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Load attendance records from the database, optionally filtered by class
  export const loadAttendanceFromDB = async (className = null) => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['attendance'], 'readonly');
        const store = transaction.objectStore('attendance');
        const request = store.getAll();
        
        request.onsuccess = () => {
          // Sort by timestamp in descending order (newest first)
          const sortedAttendance = request.result.sort((a, b) => b.timestamp - a.timestamp);
          
          // Filter by class if a className is provided
          const filteredAttendance = className 
            ? sortedAttendance.filter(log => log.className === className)
            : sortedAttendance;
            
          resolve(filteredAttendance);
        };
        
        request.onerror = (error) => {
          console.error('Error loading attendance:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Save a student to the database
  export const saveStudentToDB = async (studentData) => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        const request = store.add(studentData);
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = (error) => {
          console.error('Error saving student:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Check if a student already has attendance for today for a specific class
  export const hasAttendanceForTodayInClass = async (studentId, className) => {
    try {
      const logs = await loadAttendanceFromDB();
      const today = new Date().toLocaleDateString();
      
      return logs.some(log => 
        log.studentId === studentId && 
        log.className === className &&
        new Date(log.timestamp).toLocaleDateString() === today
      );
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  };
  
  // Log attendance for a student in a specific class
  export const logAttendanceToDB = async (studentId, studentName, className) => {
    try {
      // Check if already logged today for this class
      const alreadyLoggedToday = await hasAttendanceForTodayInClass(studentId, className);
      if (alreadyLoggedToday) {
        console.log(`Student ${studentName} already has attendance for today in class ${className}`);
        return null;
      }
      
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['attendance'], 'readwrite');
        const store = transaction.objectStore('attendance');
        
        const now = new Date();
        const logEntry = {
          studentId,
          studentName,
          className,
          timestamp: now.getTime(),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          sessionDate: now.toDateString() // Use date string for class session identification
        };
        
        const request = store.add(logEntry);
        
        request.onsuccess = () => {
          resolve({
            id: request.result,
            ...logEntry
          });
        };
        
        request.onerror = (error) => {
          console.error('Error logging attendance:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Delete a student from the database
  export const deleteStudentFromDB = async (studentId) => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        
        const request = store.delete(studentId);
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (error) => {
          console.error('Error deleting student:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Clear all attendance logs
  export const clearAttendanceLogs = async () => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['attendance'], 'readwrite');
        const store = transaction.objectStore('attendance');
        
        const request = store.clear();
        
        request.onsuccess = () => {
          resolve(true);
        };
        
        request.onerror = (error) => {
          console.error('Error clearing attendance logs:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Clear attendance logs for a specific class
  export const clearClassAttendanceLogs = async (className) => {
    try {
      const db = await initDB();
      const allLogs = await loadAttendanceFromDB();
      const logsToKeep = allLogs.filter(log => log.className !== className);
      
      // Clear all logs
      await clearAttendanceLogs();
      
      // Re-add logs to keep
      const transaction = db.transaction(['attendance'], 'readwrite');
      const store = transaction.objectStore('attendance');
      
      for (const log of logsToKeep) {
        const logCopy = { ...log };
        delete logCopy.id; // Remove ID to let it auto-increment
        store.add(logCopy);
      }
      
      return true;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  };
  
  // Get all available class names from attendance logs
  export const getClassNames = async () => {
    try {
      const logs = await loadAttendanceFromDB();
      const classNames = new Set();
      
      logs.forEach(log => {
        if (log.className) {
          classNames.add(log.className);
        }
      });
      
      return Array.from(classNames);
    } catch (error) {
      console.error('Error getting class names:', error);
      return [];
    }
  };