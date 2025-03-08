import React from 'react';

const StudentCard = ({ student }) => {
  return (
    <div className="student-card">
      <img src={student.faceImage} alt={student.name} />
      <h4>{student.name}</h4>
      <p>ID: {student.id}</p>
      <p>Registered: {new Date(student.registeredAt).toLocaleDateString()}</p>
    </div>
  );
};

export default StudentCard;