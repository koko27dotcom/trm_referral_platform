require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas Connected:', conn.connection.host);
    console.log('📁 Database:', conn.connection.name);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('⚠️ Continuing without database...');
    // Don't exit - let server run
  }
};

connectDB();

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
};

// Auth Middleware
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized, no token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
  }
};

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  type: { type: String, enum: ['jobseeker', 'recruiter'], default: 'jobseeker' },  // CHANGED: role -> type
  company: { type: String },  // ADDED: for recruiters
  earnings: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  salary: { type: String, required: true },
  description: { type: String, required: true },
  requirements: [{ type: String, required: true }],
  benefits: [{ type: String, required: true }],
  referralBonus: { type: String, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  resumeUrl: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

const referralSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['active', 'used', 'paid'], default: 'active' },
  bonus: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);
const Referral = mongoose.model('Referral', referralSchema);

// Auth Routes - REGISTER (FIXED)
app.post('/api/auth/register', async (req, res) => {
  try {
    // Extract all fields including 'type' and 'company'
    const { name, email, password, type, company } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    // Create user with type
    const userData = { 
      name, 
      email, 
      password, 
      type: type || 'jobseeker'  // Default to jobseeker if not provided
    };
    
    // Add company if recruiter
    if (type === 'recruiter' && company) {
      userData.company = company;
    }
    
    const user = await User.create(userData);
    
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,  // CHANGED: role -> type
        company: user.company,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auth Routes - LOGIN (FIXED)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        type: user.type,  // CHANGED: role -> type
        company: user.company,
        earnings: user.earnings,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Job Routes
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'active' }).populate('postedBy', 'name');
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/jobs', protect, async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    console.log('✅ New job posted:', job);
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('❌ Post job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/jobs/my-posted', protect, async (req, res) => {
  try {
    console.log('=== DEBUG my-posted ===');
    console.log('1. req.user:', req.user);
    console.log('2. req.user?._id:', req.user?._id);
    console.log('3. req.headers.authorization:', req.headers.authorization);
    console.log('4. Type of _id:', typeof req.user?._id);
    console.log('5. _id value:', req.user?._id);
    
    if (!req.user) {
      console.error('ERROR: req.user is undefined!');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!req.user._id) {
      console.error('ERROR: req.user._id is missing!');
      return res.status(401).json({ success: false, error: 'User ID not found' });
    }

    // Convert string ID to MongoDB ObjectId
    const mongoose = require('mongoose');
    let userId = req.user._id;
    if (typeof userId === 'string') {
      userId = new mongoose.Types.ObjectId(userId);
      console.log('4a. Converted to ObjectId:', userId);
    }

    console.log('5. Attempting Job.find() with postedBy:', userId);
    const jobs = await Job.find({ postedBy: userId }).sort({ createdAt: -1 });
    console.log('6. Jobs found:', jobs.length);
    
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('=== ERROR in my-posted ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});
// GET single job by ID
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name company');
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update job
app.put('/api/jobs/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Check ownership
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updatedJob });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE job
app.delete('/api/jobs/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    // Check ownership
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Application Routes
app.post('/api/applications', protect, upload.single('resume'), async (req, res) => {
  try {
    const { jobId, fullName, email, phone } = req.body;
    
    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      fullName,
      email,
      phone,
      resumeUrl: req.file ? req.file.filename : null
    });
    
    console.log('✅ New application:', application);
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    console.error('❌ Submit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/applications/my', protect, async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate('job', 'title company');
    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Referral Routes
app.post('/api/referrals/generate', protect, async (req, res) => {
  try {
    const { code, jobId, bonus } = req.body;
    
    const referral = await Referral.create({
      code,
      job: jobId,
      referrer: req.user._id,
      bonus
    });
    
    console.log('✅ New referral code:', referral);
    res.status(201).json({ success: true, data: referral });
  } catch (error) {
    console.error('❌ Referral error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/referrals/track', async (req, res) => {
  try {
    const { code, action } = req.body;
    console.log('📊 Referral tracked:', { code, action });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/referrals/my', protect, async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('job', 'title company')
      .populate('referredUser', 'name');
    res.json({ success: true, data: referrals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GLOBAL ERROR HANDLER - Enhanced
app.use((error, req, res, next) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Error Message:', error.message);
  console.error('Error Stack:', error.stack);
  console.error('Error Code:', error.code);
  console.error('Error Name:', error.name);
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  console.error('Request Headers:', req.headers);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/auth/register - Register new user');
  console.log('  POST /api/auth/login - Login user');
  console.log('  GET  /api/auth/me - Get current user');
  console.log('  GET  /api/jobs - Get all jobs');
  console.log('  POST /api/jobs - Post new job (protected)');
  console.log('  GET  /api/jobs/my-posted - Get my posted jobs (protected)');
  console.log('  POST /api/applications - Submit application (protected)');
  console.log('  GET  /api/applications/my - My applications (protected)');
  console.log('  POST /api/referrals/generate - Generate referral (protected)');
  console.log('  GET  /api/referrals/my - My referrals (protected)');
});