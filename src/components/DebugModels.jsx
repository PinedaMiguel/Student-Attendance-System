import React, { useState } from 'react';
import * as faceapi from 'face-api.js';

const DebugModels = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testModelLoading = async () => {
    setLoading(true);
    setLogs([]);
    
    try {
      // Log the current base URL for reference
      addLog(`Base URL: ${window.location.origin}`);
      addLog('Starting model tests...');
      
      // Use the CDN URL for models
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      addLog(`Using CDN URL: ${MODEL_URL}`);
      
      // Test loading individual models
      const models = [
        { name: 'Tiny Face Detector', loader: faceapi.nets.tinyFaceDetector },
        { name: 'Face Landmark 68', loader: faceapi.nets.faceLandmark68Net },
        { name: 'Face Recognition', loader: faceapi.nets.faceRecognitionNet }
      ];
      
      for (const model of models) {
        try {
          addLog(`Loading ${model.name}...`);
          await model.loader.loadFromUri(MODEL_URL);
          addLog(`✅ ${model.name} loaded successfully`);
        } catch (error) {
          addLog(`❌ Failed to load ${model.name}: ${error.message}`);
        }
      }
      
      addLog('Model tests completed');
    } catch (error) {
      addLog(`❌ Error during tests: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="debug-container" style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <h2>Model Loading Debug Tool</h2>
      
      <button 
        onClick={testModelLoading} 
        disabled={loading}
        style={{
          padding: '10px 15px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '15px'
        }}
      >
        {loading ? 'Testing...' : 'Test Model Loading'}
      </button>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        maxHeight: '400px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '8px',
              color: log.includes('❌') ? '#e74c3c' : log.includes('✅') ? '#2ecc71' : '#333'
            }}>
              {log}
            </div>
          ))
        ) : (
          <div style={{ color: '#777', fontStyle: 'italic' }}>
            Click "Test Model Loading" to begin debugging
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugModels;