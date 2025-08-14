import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Users, FileText, AlertCircle, CheckCircle, Timer, Coffee, Filter, ChevronDown } from 'lucide-react';

const ClockModal = ({ isOpen, onClose, clockType, onClockSuccess }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState('');
  const [confirmedDate, setConfirmedDate] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [stream, setStream] = useState(null);
  
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      getUserLocation();
      setLocationAddress('');
      setCapturedImage(null);
      setUploadedImage(null);
      setLocationError('');
      setIsCameraActive(false);
      setShowConfirmation(false);
      stopCamera();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const getUserLocation = () => {
    setIsLoadingLocation(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(location);
        setIsLoadingLocation(false);
        getAddressFromCoordinates(location.latitude, location.longitude);
      },
      (error) => {
        setLocationError(`Location access denied: ${error.message}`);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setLocationAddress(data.display_name);
      } else {
        setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setLocationAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsCameraActive(true);
          }).catch(error => {
            console.error('Error playing video:', error);
          });
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Could not access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else {
        errorMessage += 'Please check permissions and try again.';
      }
      
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0);
      context.scale(-1, 1); 
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      setUploadedImage(null);
      stopCamera();
    } else {
      alert('Camera not ready. Please wait a moment and try again.');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setCapturedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentImage = () => {
    return capturedImage || uploadedImage;
  };

  const handleSubmit = () => {
    if (!userLocation) {
      alert('Please allow location access to continue.');
      return;
    }
    
    if (!getCurrentImage()) {
      alert('Please take a photo or upload an image to continue.');
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    setConfirmedTime(timeString);
    setConfirmedDate(dateString);
    setShowConfirmation(true);
    
    if (onClockSuccess) {
      onClockSuccess({
        type: clockType,
        time: timeString,
        datetime: now,
        location: userLocation,
        address: locationAddress,
        image: getCurrentImage()
      });
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  if (showConfirmation) {
    return (
      <div className="modal-overlay">
        <div className="confirmation-modal">
          <div className="confirmation-icon">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="confirmation-title">
            {confirmedTime} clocked {clockType} successfully!
          </h2>
          
          <p className="confirmation-date">
            {confirmedDate}
          </p>
          
          <p className="confirmation-message">
            Thank You!
          </p>
          
          <button
            onClick={handleConfirmationClose}
            className="confirmation-button"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            Clock {clockType === 'in' ? 'In' : 'Out'}
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button"
          >
            <span>×</span>
          </button>
        </div>

        <div className="modal-body">
          <div className="datetime-grid">
            <div className="date-card">
              <div className="datetime-header">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="datetime-title">Date</h3>
              </div>
              <p className="datetime-value date-value">
                {currentDateTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            <div className="time-card">
              <div className="datetime-header">
                <Clock className="w-5 h-5 text-green-600" />
                <h3 className="datetime-title">Time</h3>
              </div>
              <p className="datetime-value time-value">
                {currentDateTime.toLocaleTimeString('en-US', { 
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div>
            <div className="section-title">
              <span></span>
              <h3>Location</h3>
              {(isLoadingLocation || isLoadingAddress) && (
                <div className="loading-spinner"></div>
              )}
            </div>
            
            {locationError ? (
              <div className="status-error">
                <p className="error-text">{locationError}</p>
                <button
                  onClick={getUserLocation}
                  className="retry-button"
                >
                  Try Again
                </button>
              </div>
            ) : userLocation ? (
              <div className="status-success">
                <div className="map-container">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.longitude-0.01}%2C${userLocation.latitude-0.01}%2C${userLocation.longitude+0.01}%2C${userLocation.latitude+0.01}&layer=mapnik&marker=${userLocation.latitude}%2C${userLocation.longitude}`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    className="map-iframe"
                  ></iframe>
                </div>
                <p className="success-text">✓ Location captured successfully</p>
                {isLoadingAddress ? (
                  <p className="loading-text">Getting address...</p>
                ) : (
                  <p className="address-text">
                     {locationAddress || `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`}
                  </p>
                )}
              </div>
            ) : (
              <div className="status-loading">
                <p className="loading-text">Accessing your location...</p>
              </div>
            )}
          </div>

          <div>
            <div className="section-title">
              <span></span>
              <h3>Photo</h3>
            </div>
            
            <div className="photo-container">
              {!isCameraActive && !getCurrentImage() && (
                <div className="photo-placeholder">
                  <div className="photo-preview">
                    <span></span>
                  </div>
                  <div className="photo-buttons">
                    <button
                      onClick={startCamera}
                      className="button-primary"
                    >
                      Take Photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="button-secondary"
                    >
                       Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
              
              {isCameraActive && !getCurrentImage() && (
                <div className="photo-placeholder">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-video"
                  />
                  <div className="photo-buttons">
                    <button
                      onClick={capturePhoto}
                      className="button-success"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {getCurrentImage() && (
                <div className="photo-placeholder">
                  <img
                    src={getCurrentImage()}
                    alt="Clock in/out photo"
                    className="photo-display"
                  />
                  <p className="photo-success-message">
                    ✓ Photo {capturedImage ? 'captured' : 'uploaded'} successfully
                  </p>
                  <div className="photo-buttons">
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setUploadedImage(null);
                        startCamera();
                      }}
                      className="button-primary button-small"
                    >
                      Take New Photo
                    </button>
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setUploadedImage(null);
                        fileInputRef.current?.click();
                      }}
                      className="button-secondary button-small"
                    >
                      Upload Different
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="submit-section">
            <button
              onClick={handleSubmit}
              disabled={!userLocation || !getCurrentImage()}
              className="submit-button"
            >
              Submit Clock {clockType === 'in' ? 'In' : 'Out'}
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState('This Week');
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockType, setClockType] = useState('in');
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('Clocked Out');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeForDisplay = (date) => {
    if (!date) return '--';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleClockIn = () => {
    setClockType('in');
    setShowClockModal(true);
  };

  const handleClockOut = () => {
    setClockType('out');
    setShowClockModal(true);
  };

  const handleCloseModal = () => {
    setShowClockModal(false);
  };

  const handleClockSuccess = (clockData) => {
    if (clockData.type === 'in') {
      setClockInTime(clockData.datetime);
      setClockOutTime(null);
      setCurrentStatus('Clocked In');
    } else {
      setClockOutTime(clockData.datetime);
      setCurrentStatus('Clocked Out');
    }
  };

  const calculateWorkedHours = () => {
    if (!clockInTime) return '0.00';
    if (!clockOutTime) {
      const now = new Date();
      const diff = now - clockInTime;
      return (diff / (1000 * 60 * 60)).toFixed(2);
    }
    const diff = clockOutTime - clockInTime;
    return (diff / (1000 * 60 * 60)).toFixed(2);
  };

  const attendanceData = [
    { date: '05-06-2024', clockIn: '--', clockOut: '--', status: 'ABSENT', totalHours: '0.00', regularHours: '0.00', overtime: '0.00' },
    { date: '04-06-2024', clockIn: '--', clockOut: '--', status: 'ABSENT', totalHours: '0.00', regularHours: '0.00', overtime: '0.00' },
    { date: '03-06-2024', clockIn: '--', clockOut: '--', status: 'ABSENT', totalHours: '0.00', regularHours: '0.00', overtime: '0.00' },
    { date: '31-05-2024', clockIn: '08:02', clockOut: '17:15', status: 'PRESENT', totalHours: '9.13', regularHours: '8.00', overtime: '1.13' },
    { date: '30-05-2024', clockIn: '08:15', clockOut: '17:00', status: 'PRESENT', totalHours: '8.45', regularHours: '8.45', overtime: '0.00' }
  ];

  const tasks = [
    { id: 1, title: 'Making work certificate John Doe', date: '30/06/2023', progress: 60, status: 'In progress' },
    { id: 2, title: 'Call Jack Russell', date: '3 June 2023 at 10:30 am', completed: true },
    { id: 3, title: 'Interview preparation', date: '5 June 2023', priority: 'high' }
  ];

  const schedule = [
    { time: '10:30 am', title: 'Meeting with Jemi', type: 'meeting' },
    { time: '10:30 am', title: 'Interview with John Duboscok', type: 'interview' },
    { time: '2:00 pm', title: 'Lunch Break', type: 'break' }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome to your Dashboard.</h1>
        </div>
        <div className="filter-container" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
          <div className={`week-selector ${showFilterDropdown ? 'active' : ''}`}>
            <Filter className="filter-icon w-4 h-4" />
            Filter by
            <ChevronDown className="filter-icon w-4 h-4" />
          </div>
          {showFilterDropdown && (
            <div className="filter-dropdown show">
              <div className="filter-section">
                <div className="filter-section-title">Timeframe</div>
                <div className="filter-option">This Week</div>
                <div className="filter-option">Last Week</div>
                <div className="filter-option">This Month</div>
              </div>
              <div className="filter-section">
                <div className="clear-filters">Clear</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="card-gradient">
          <div className="summary-card-header">
            <h3 className="summary-card-title">Today's Summary</h3>
            <p className="summary-card-subtitle">You have "Full time schedule" today</p>
          </div>
          <div>
            <div className="summary-hours">{calculateWorkedHours()} hrs</div>
            <div className="clock-buttons">
              <button 
                onClick={handleClockIn}
                disabled={clockInTime && !clockOutTime}
                className="clock-button"
              >
                Clock In
              </button>
              <button 
                onClick={handleClockOut}
                disabled={!clockInTime || clockOutTime}
                className="clock-button"
              >
                Clock Out
              </button>
            </div>
            <div className="clock-times">
              <div className="clock-time-item">
                <div>Clock-In Time</div>
                <div>{formatTimeForDisplay(clockInTime)}</div>
              </div>
              <div className="clock-time-item">
                <div>Clock-Out Time</div>
                <div>{formatTimeForDisplay(clockOutTime)}</div>
              </div>
            </div>
          </div>
          <div className="summary-badge">
            2
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <h3 className="stat-card-title">Total Hours Worked</h3>
            <div className="stat-number">{calculateWorkedHours()}</div>
          </div>
          <div className="stat-card-icon-container">
            <Clock className="stat-card-icon text-blue-500" />
            <div className="online-indicator"></div>
          </div>
        </div>

        <div className="stat-card stat-card-late">
          <div className="stat-card-content">
            <h3 className="stat-card-title">Number of Late Resumptions</h3>
            <div className="stat-number">0</div>
          </div>
          <div className="stat-card-icon-container">
            <Timer className="stat-card-icon text-orange-500" />
            <div className="online-indicator"></div>
          </div>
        </div>

        <div className="stat-card stat-card-absences">
          <div className="stat-card-content">
            <h3 className="stat-card-title">Number of Absences</h3>
            <div className="stat-number">3</div>
          </div>
          <div className="stat-card-icon-container">
            <Users className="stat-card-icon text-red-500" />
            <div className="online-indicator"></div>
          </div>
        </div>
      </div>

      <div className="lower-section-grid">
        <div className="card-white">
          <div className="attendance-header">
            <h3 className="attendance-title">Attendance Record</h3>
            <button className="view-all-link">View All</button>
          </div>
          
          <div className="table-header">
            <div>DATE</div>
            <div>CLOCK IN</div>
            <div>CLOCK OUT</div>
            <div>STATUS</div>
            <div>TOTAL HOURS</div>
            <div>REGULAR HOURS</div>
            <div>OVERTIME</div>
          </div>
        
          <div className="table-body">
            {attendanceData.map((record, index) => (
              <div key={index} className="table-row">
                <div>{record.date}</div>
                <div>{record.clockIn}</div>
                <div>{record.clockOut}</div>
                <div>{record.status}</div>
                <div>{record.totalHours}</div>
                <div>{record.regularHours}</div>
                <div>{record.overtime}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-white">
          <div>
            <h3 className="tasks-title">Tasks (4)</h3>
            <div className="tasks-list">
              {tasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-header">
                    <h4 className="task-title">{task.title}</h4>
                    {task.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  <div className="task-date">{task.date}</div>
                  {task.progress && (
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <span className="progress-status">{task.status}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="schedule-title">Schedule (3)</h3>
            <div className="schedule-list">
              {schedule.map((item, index) => (
                <div key={index} className="schedule-item">
                  <div className="schedule-dot"></div>
                  <div className="schedule-content">
                    <div className="schedule-item-title">{item.title}</div>
                    <div className="schedule-time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-cards-grid">
        <div className="card-white status-card">
          <div className="status-label">CURRENT TIME</div>
          <div>
            <Clock className="status-icon text-blue-500" />
          </div>
          <div className="status-value">{formatTime(currentTime)}</div>
          <div className="status-description">Live Time</div>
        </div>

        <div className="card-white status-card">
          <div className="status-label">BREAK TIME</div>
          <div>
            <Coffee className="status-icon text-orange-500" />
          </div>
          <div className="status-value">--</div>
          <div className="status-description">Not Started</div>
        </div>

        <div className="card-white status-card">
          <div className="status-label">OVERTIME</div>
          <div>
            <Timer className="status-icon text-green-500" />
          </div>
          <div className="status-value">00:00</div>
          <div className="status-description">Hours</div>
        </div>

        <div className="card-white status-card">
          <div className="status-label">STATUS</div>
          <div>
            <AlertCircle className={`status-icon ${currentStatus === 'Clocked In' ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div className="status-value">{currentStatus}</div>
          <div className="status-description">Current Status</div>
        </div>
      </div>

      <ClockModal 
        isOpen={showClockModal}
        onClose={handleCloseModal}
        clockType={clockType}
        onClockSuccess={handleClockSuccess}
      />
    </div>
  );
};

export default EmployeeDashboard;
