import React from 'react';

const AttendanceTab = ({ attendanceLog, selectedClass }) => {
  // Group attendance logs by date
  const groupedByDate = {};
  attendanceLog.forEach(log => {
    if (!groupedByDate[log.date]) {
      groupedByDate[log.date] = [];
    }
    groupedByDate[log.date].push(log);
  });

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b) - new Date(a)
  );

  return (
    <div className="attendance-tab">
      <h2>
        <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '10px' }}>
          fact_check
        </span>
        {selectedClass ? `Attendance Log: ${selectedClass}` : 'All Attendance Logs'}
      </h2>
      
      {attendanceLog.length === 0 ? (
        <div className="no-attendance">
          <span className="material-icons" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}>
            event_busy
          </span>
          <p>No attendance records {selectedClass ? `for ${selectedClass}` : ''} yet.</p>
          <p>Attendance will appear here once students are checked in.</p>
        </div>
      ) : (
        <div className="attendance-by-date">
          {sortedDates.map(date => (
            <div key={date} className="attendance-day">
              <h3 className="date-header">
                <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: '10px' }}>
                  calendar_today
                </span>
                {date}
                <span className="attendance-count">{groupedByDate[date].length} students</span>
              </h3>
              <div className="attendance-list">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>
                        <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '5px' }}>
                          person
                        </span>
                        Student
                      </th>
                      <th>
                        <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '5px' }}>
                          school
                        </span>
                        Class
                      </th>
                      <th>
                        <span className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '5px' }}>
                          schedule
                        </span>
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByDate[date].map(log => (
                      <tr key={log.id}>
                        <td>{log.studentName}</td>
                        <td>{log.className || 'N/A'}</td>
                        <td>{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceTab;