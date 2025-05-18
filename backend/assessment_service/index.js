const express = require('express');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/assessment', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI || 'postgres://postgres:postgres@localhost:5432/assessment'
});
pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Could not connect to PostgreSQL', err));

// Connect to Redis
const redis = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if token is in Redis blacklist
    const isBlacklisted = await redis.get(`bl_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been invalidated' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Question Schema
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'single-choice', 'true-false', 'fill-in-the-blank', 'essay', 'coding'],
    required: true
  },
  content: {
    text: String,
    image: String,
    code: String
  },
  options: [{
    id: String,
    text: String,
    isCorrect: Boolean
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [String],
  points: {
    type: Number,
    default: 1
  },
  timeEstimate: Number, // time in seconds
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Assessment Schema
const assessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  instructions: String,
  duration: {
    type: Number,
    required: true
  }, // duration in minutes
  totalPoints: {
    type: Number,
    default: 0
  },
  passingScore: {
    type: Number,
    default: 0
  },
  questions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    points: Number
  }],
  randomizeQuestions: {
    type: Boolean,
    default: false
  },
  allowedAttempts: {
    type: Number,
    default: 1
  },
  proctoring: {
    enabled: {
      type: Boolean,
      default: false
    },
    webcamRequired: {
      type: Boolean,
      default: false
    },
    screensharingRequired: {
      type: Boolean,
      default: false
    },
    lockdownBrowserRequired: {
      type: Boolean,
      default: false
    }
  },
  startTime: Date,
  endTime: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Attempt Schema
const attemptSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  completionTime: Number, // in seconds
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    points: Number,
    timeSpent: Number // in seconds
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  maxPossibleScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'timed-out'],
    default: 'in-progress'
  },
  proctorEvents: [{
    type: {
      type: String,
      enum: ['tab-switch', 'full-screen-exit', 'face-not-detected', 'multiple-faces', 'audio-detected', 'suspicious-activity']
    },
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }]
});

// Models
const Question = mongoose.model('Question', questionSchema);
const Assessment = mongoose.model('Assessment', assessmentSchema);
const Attempt = mongoose.model('Attempt', attemptSchema);

// Routes

// Question Bank Management

// Create a new question
app.post('/api/questions', authenticate, async (req, res) => {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const {
      type,
      content,
      options,
      correctAnswer,
      difficulty,
      tags,
      points,
      timeEstimate,
      organization
    } = req.body;

    const question = new Question({
      type,
      content,
      options,
      correctAnswer,
      difficulty,
      tags,
      points,
      timeEstimate,
      createdBy: req.user.userId,
      organization
    });

    await question.save();

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Question creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get questions (with filters)
app.get('/api/questions', authenticate, async (req, res) => {
  try {
    const {
      type,
      difficulty,
      tags,
      organization,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (organization) filter.organization = organization;

    // If not admin, restrict to questions created by user or organization
    if (req.user.role !== 'admin') {
      if (req.user.organization) {
        filter.$or = [
          { createdBy: req.user.userId },
          { organization: req.user.organization }
        ];
      } else {
        filter.createdBy = req.user.userId;
      }
    }

    const skip = (page - 1) * limit;

    const questions = await Question.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Question.countDocuments(filter);

    res.json({
      questions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get question by ID
app.get('/api/questions/:id', authenticate, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check permission
    const isAuthorized = 
      req.user.role === 'admin' || 
      question.createdBy.toString() === req.user.userId ||
      (question.organization && question.organization.toString() === req.user.organization);

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json(question);
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update question
app.put('/api/questions/:id', authenticate, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check permission
    const isAuthorized = 
      req.user.role === 'admin' || 
      question.createdBy.toString() === req.user.userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Update fields
    const {
      type,
      content,
      options,
      correctAnswer,
      difficulty,
      tags,
      points,
      timeEstimate
    } = req.body;

    if (type) question.type = type;
    if (content) question.content = content;
    if (options) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (difficulty) question.difficulty = difficulty;
    if (tags) question.tags = tags;
    if (points) question.points = points;
    if (timeEstimate) question.timeEstimate = timeEstimate;
    
    question.updatedAt = Date.now();

    await question.save();

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete question
app.delete('/api/questions/:id', authenticate, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check permission
    const isAuthorized = 
      req.user.role === 'admin' || 
      question.createdBy.toString() === req.user.userId;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await Question.deleteOne({ _id: req.params.id });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assessment Management

// Create assessment
app.post('/api/assessments', authenticate, async (req, res) => {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const {
      title,
      description,
      instructions,
      duration,
      passingScore,
      questions,
      randomizeQuestions,
      allowedAttempts,
      proctoring,
      startTime,
      endTime,
      organization,
      status
    } = req.body;

    // Calculate total points
    let totalPoints = 0;
    if (questions && questions.length) {
      for (const q of questions) {
        totalPoints += q.points || 0;
      }
    }

    const assessment = new Assessment({
      title,
      description,
      instructions,
      duration,
      totalPoints,
      passingScore,
      questions,
      randomizeQuestions,
      allowedAttempts,
      proctoring,
      startTime,
      endTime,
      createdBy: req.user.userId,
      organization,
      status
    });

    await assessment.save();

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment
    });
  } catch (error) {
    console.error('Assessment creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assessments (with filters)
app.get('/api/assessments', authenticate, async (req, res) => {
  try {
    const {
      status,
      organization,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (organization) filter.organization = organization;

    // If not admin or instructor, show only published assessments
    if (!['admin', 'instructor'].includes(req.user.role)) {
      filter.status = 'published';
      filter.endTime = { $gte: new Date() };
    } 
    // If instructor, show only their assessments or their org's assessments
    else if (req.user.role === 'instructor') {
      if (req.user.organization) {
        filter.$or = [
          { createdBy: req.user.userId },
          { organization: req.user.organization }
        ];
      } else {
        filter.createdBy = req.user.userId;
      }
    }

    const skip = (page - 1) * limit;

    const assessments = await Assessment.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Assessment.countDocuments(filter);

    res.json({
      assessments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get assessment by ID
app.get('/api/assessments/:id', authenticate, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('questions.question');
    
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Check permission
    const isAuthorized = 
      req.user.role === 'admin' || 
      assessment.createdBy.toString() === req.user.userId ||
      (assessment.organization && assessment.organization.toString() === req.user.organization) ||
      (assessment.status === 'published');

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start an assessment attempt
app.post('/api/assessments/:id/attempt', authenticate, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Check if assessment is published
    if (assessment.status !== 'published') {
      return res.status(400).json({ message: 'Assessment is not published' });
    }

    // Check if assessment is within time window
    const now = new Date();
    if (assessment.startTime && assessment.startTime > now) {
      return res.status(400).json({ message: 'Assessment has not started yet' });
    }
    
    if (assessment.endTime && assessment.endTime < now) {
      return res.status(400).json({ message: 'Assessment has already ended' });
    }

    // Check previous attempts
    const attemptCount = await Attempt.countDocuments({
      assessment: assessment._id,
      user: req.user.userId
    });

    if (attemptCount >= assessment.allowedAttempts) {
      return res.status(400).json({ message: 'Maximum attempts reached' });
    }

    // Get questions (possibly randomized)
    let questions = assessment.questions;
    if (assessment.randomizeQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Create attempt
    const attempt = new Attempt({
      assessment: assessment._id,
      user: req.user.userId,
      answers: questions.map(q => ({
        question: q.question,
        points: 0
      })),
      maxPossibleScore: assessment.totalPoints
    });

    await attempt.save();

    // Cache the attempt in Redis with expiration
    const expirationTime = assessment.duration * 60; // Convert minutes to seconds
    await redis.set(
      `attempt_${attempt._id}`,
      JSON.stringify({
        assessmentId: assessment._id,
        userId: req.user.userId,
        startTime: attempt.startTime
      }),
      'EX',
      expirationTime
    );

    res.status(201).json({
      message: 'Assessment attempt started',
      attemptId: attempt._id,
      questions: questions.map(q => ({
        id: q.question,
        points: q.points
      })),
      duration: assessment.duration,
      startTime: attempt.startTime
    });
  } catch (error) {
    console.error('Start attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit an answer during an attempt
app.post('/api/attempts/:id/answers', authenticate, async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if the attempt belongs to the user
    if (attempt.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if the attempt is still in progress
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Attempt is already completed' });
    }

    // Check if attempt has timed out
    const assessment = await Assessment.findById(attempt.assessment);
    const now = new Date();
    const timeLimit = new Date(attempt.startTime.getTime() + assessment.duration * 60000);
    
    if (now > timeLimit) {
      attempt.status = 'timed-out';
      attempt.endTime = timeLimit;
      attempt.completionTime = (timeLimit - attempt.startTime) / 1000;
      await attempt.save();
      return res.status(400).json({ message: 'Assessment time limit exceeded' });
    }

    // Find the answer in the attempt
    const answerIndex = attempt.answers.findIndex(
      a => a.question.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(400).json({ message: 'Question not found in this attempt' });
    }

    // Update the answer
    attempt.answers[answerIndex].answer = answer;
    attempt.answers[answerIndex].timeSpent = Math.floor((now - attempt.startTime) / 1000);

    // Check if it's correct for auto-graded questions
    const question = await Question.findById(questionId);
    
    if (['multiple-choice', 'single-choice', 'true-false'].includes(question.type)) {
      if (question.type === 'multiple-choice') {
        // For multiple choice, check if selected options match correct ones
        const correctOptionIds = question.options
          .filter(o => o.isCorrect)
          .map(o => o.id);
        
        const isCorrect = 
          Array.isArray(answer) && 
          answer.length === correctOptionIds.length && 
          answer.every(id => correctOptionIds.includes(id));
        
        attempt.answers[answerIndex].isCorrect = isCorrect;
        attempt.answers[answerIndex].points = isCorrect ? question.points : 0;
      } else {
        // For single choice and true-false
        const correctOption = question.options.find(o => o.isCorrect);
        const isCorrect = correctOption && correctOption.id === answer;
        
        attempt.answers[answerIndex].isCorrect = isCorrect;
        attempt.answers[answerIndex].points = isCorrect ? question.points : 0;
      }
    }

    await attempt.save();

    res.json({
      message: 'Answer submitted successfully'
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Finish an assessment attempt
app.post('/api/attempts/:id/submit', authenticate, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if the attempt belongs to the user
    if (attempt.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if the attempt is still in progress
    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Attempt is already completed' });
    }

    // Complete the attempt
    attempt.status = 'completed';
    attempt.endTime = new Date();
    attempt.completionTime = (attempt.endTime - attempt.startTime) / 1000;

    // Calculate total score
    attempt.totalScore = attempt.answers.reduce(
      (total, answer) => total + (answer.points || 0),
      0
    );

    await attempt.save();

    // Remove from Redis
    await redis.del(`attempt_${attempt._id}`);

    // Return the result
    const assessment = await Assessment.findById(attempt.assessment);

    const passed = attempt.totalScore >= assessment.passingScore;

    res.json({
      message: 'Assessment completed successfully',
      result: {
        totalScore: attempt.totalScore,
        maxPossibleScore: attempt.maxPossibleScore,
        percentage: (attempt.totalScore / attempt.maxPossibleScore) * 100,
        passed,
        completionTime: attempt.completionTime
      }
    });
  } catch (error) {
    console.error('Submit attempt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attempt results
app.get('/api/attempts/:id/results', authenticate, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('assessment')
      .populate('answers.question');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if the attempt belongs to the user or the assessment creator
    const isAuthorized = 
      attempt.user.toString() === req.user.userId ||
      attempt.assessment.createdBy.toString() === req.user.userId ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    res.json({
      attempt,
      passed: attempt.totalScore >= attempt.assessment.passingScore,
      percentage: (attempt.totalScore / attempt.maxPossibleScore) * 100
    });
  } catch (error) {
    console.error('Get attempt results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record proctor event for an attempt
app.post('/api/attempts/:id/proctoring', authenticate, async (req, res) => {
  try {
    const { type, details } = req.body;
    
    const attempt = await Attempt.findById(req.params.id);
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    // Check if the attempt belongs to the user
    if (attempt.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Add proctor event
    attempt.proctorEvents.push({
      type,
      timestamp: new Date(),
      details
    });

    await attempt.save();

    res.json({
      message: 'Proctoring event recorded'
    });
  } catch (error) {
    console.error('Proctor event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/assessment/health', (req, res) => {
  res.json({ status: 'ok', service: 'assessment-service' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Assessment service running on port ${PORT}`);
});
