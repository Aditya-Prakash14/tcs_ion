const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Kafka } = require('kafkajs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/proctor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Connect to Kafka
const kafka = new Kafka({
  clientId: 'proctor-service',
  brokers: [process.env.KAFKA_URI || 'localhost:9092']
});

const producer = kafka.producer();
producer.connect()
  .then(() => console.log('Connected to Kafka'))
  .catch(err => console.error('Could not connect to Kafka', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Proctor Event Schema
const proctorEventSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: String,
    enum: ['tab-switch', 'full-screen-exit', 'face-not-detected', 'multiple-faces', 'audio-detected', 'suspicious-activity'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  details: mongoose.Schema.Types.Mixed,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  snapshot: {
    image: String, // base64 encoded
    screenCapture: String // base64 encoded
  }
});

// Proctor Session Schema
const proctorSessionSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated'],
    default: 'active'
  },
  settings: {
    webcam: {
      required: {
        type: Boolean,
        default: true
      },
      enabled: {
        type: Boolean,
        default: false
      }
    },
    screenSharing: {
      required: {
        type: Boolean,
        default: false
      },
      enabled: {
        type: Boolean,
        default: false
      }
    },
    audio: {
      required: {
        type: Boolean,
        default: false
      },
      enabled: {
        type: Boolean,
        default: false
      }
    },
    fullScreenRequired: {
      type: Boolean,
      default: true
    },
    browserLockdown: {
      type: Boolean,
      default: false
    }
  },
  events: [proctorEventSchema],
  anomalyScore: {
    type: Number,
    default: 0
  }
});

// Models
const ProctorEvent = mongoose.model('ProctorEvent', proctorEventSchema);
const ProctorSession = mongoose.model('ProctorSession', proctorSessionSchema);

// Routes

// Start proctoring session
app.post('/api/proctor/sessions', authenticate, async (req, res) => {
  try {
    const { attemptId, assessmentId, settings } = req.body;

    // Check if session already exists
    const existingSession = await ProctorSession.findOne({
      attemptId,
      userId: req.user.userId,
      status: 'active'
    });

    if (existingSession) {
      return res.status(400).json({ message: 'Active session already exists' });
    }

    // Create new session
    const session = new ProctorSession({
      attemptId,
      userId: req.user.userId,
      assessmentId,
      settings
    });

    await session.save();

    // Publish event to Kafka
    await producer.send({
      topic: 'proctor-sessions',
      messages: [
        { 
          key: attemptId, 
          value: JSON.stringify({
            action: 'session_started',
            sessionId: session._id,
            userId: req.user.userId,
            attemptId,
            assessmentId,
            timestamp: new Date()
          })
        }
      ]
    });

    res.status(201).json({
      message: 'Proctoring session started',
      sessionId: session._id,
      settings: session.settings
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End proctoring session
app.post('/api/proctor/sessions/:id/end', authenticate, async (req, res) => {
  try {
    const session = await ProctorSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if the session belongs to the user
    if (session.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if the session is active
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not active' });
    }

    // End session
    session.status = 'completed';
    session.endTime = new Date();
    await session.save();

    // Publish event to Kafka
    await producer.send({
      topic: 'proctor-sessions',
      messages: [
        { 
          key: session.attemptId.toString(), 
          value: JSON.stringify({
            action: 'session_ended',
            sessionId: session._id,
            userId: req.user.userId,
            attemptId: session.attemptId,
            timestamp: new Date()
          })
        }
      ]
    });

    res.json({
      message: 'Proctoring session ended',
      sessionId: session._id
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record proctoring event
app.post('/api/proctor/events', authenticate, async (req, res) => {
  try {
    const { 
      sessionId, 
      type, 
      details,
      severity = 'medium',
      snapshot 
    } = req.body;

    // Find the session
    const session = await ProctorSession.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if the session belongs to the user
    if (session.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if the session is active
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not active' });
    }

    // Create event
    const event = new ProctorEvent({
      attemptId: session.attemptId,
      userId: req.user.userId,
      assessmentId: session.assessmentId,
      type,
      details,
      severity,
      snapshot
    });

    await event.save();

    // Add to session events
    session.events.push(event);
    
    // Update anomaly score based on severity
    let severityValue = 0;
    switch (severity) {
      case 'low': 
        severityValue = 0.2; 
        break;
      case 'medium': 
        severityValue = 0.5; 
        break;
      case 'high': 
        severityValue = 1.0; 
        break;
    }
    
    session.anomalyScore += severityValue;
    await session.save();

    // Publish event to Kafka
    await producer.send({
      topic: 'proctor-events',
      messages: [
        { 
          key: session.attemptId.toString(), 
          value: JSON.stringify({
            action: 'event_recorded',
            eventId: event._id,
            sessionId: session._id,
            userId: req.user.userId,
            attemptId: session.attemptId,
            type,
            severity,
            timestamp: new Date()
          })
        }
      ]
    });

    res.status(201).json({
      message: 'Proctoring event recorded',
      eventId: event._id
    });
  } catch (error) {
    console.error('Record event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session events (for review)
app.get('/api/proctor/sessions/:id/events', authenticate, async (req, res) => {
  try {
    const session = await ProctorSession.findById(req.params.id)
      .populate('events');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if the user is authorized (either the test taker or an admin/instructor)
    const isAuthorized = 
      session.userId.toString() === req.user.userId ||
      ['admin', 'instructor'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json({
      sessionId: session._id,
      attemptId: session.attemptId,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      anomalyScore: session.anomalyScore,
      events: session.events
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// WebRTC signaling for webcam/screen sharing (simplified)
app.post('/api/proctor/signal', authenticate, async (req, res) => {
  try {
    const { sessionId, signal, targetUserId } = req.body;

    // Validate session
    const session = await ProctorSession.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(404).json({ message: 'Active session not found' });
    }

    // For simplicity, we're just returning the signal
    // In a real implementation, this would use WebSockets or another real-time protocol
    res.json({
      fromUserId: req.user.userId,
      sessionId,
      signal,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Signaling error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Configure lockdown browser
app.get('/api/proctor/lockdown/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await ProctorSession.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if the session belongs to the user
    if (session.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Return lockdown configuration
    res.json({
      fullScreenRequired: session.settings.fullScreenRequired,
      browserLockdown: session.settings.browserLockdown,
      allowedDomains: ['assessment.domain.com', 'proctor.domain.com'],
      blockedKeys: ['PrintScreen', 'ContextMenu'],
      preventCopyPaste: true,
      preventTabSwitching: true
    });
  } catch (error) {
    console.error('Lockdown config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/proctor/health', (req, res) => {
  res.json({ status: 'ok', service: 'proctor-service' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Proctor service running on port ${PORT}`);
});
