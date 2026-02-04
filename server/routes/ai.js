/**
 * AI Routes
 * AI-powered features including Resume Optimizer using Moonshot AI (Kimi)
 * Handles file uploads and AI-powered text processing
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate, optionalAuth } = require('../middleware/auth.js');
const { resumeOptimizer } = require('../services/resumeOptimizer.js');

const router = express.Router();

// ==================== MULTER CONFIGURATION ====================

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');

const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
};

ensureUploadsDir();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  },
});

// File filter for PDFs only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

// ==================== RESUME OPTIMIZER ROUTES ====================

/**
 * @route   POST /api/v1/ai/resume/optimize
 * @desc    Upload and optimize a resume using AI
 * @access  Private (authenticated users)
 * 
 * Request:
 * - file: PDF resume file (required)
 * - jobDescription: string (optional) - Target job description for tailored optimization
 * 
 * Response:
 * - success: boolean
 * - data: {
 *     originalText: string,
 *     optimizedText: string (Markdown format),
 *     analysis: object,
 *     metadata: object
 *   }
 */
router.post(
  '/resume/optimize',
  authenticate,
  upload.single('resume'),
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF resume file',
          code: 'NO_FILE_UPLOADED',
        });
      }

      const filePath = req.file.path;
      const jobDescription = req.body.jobDescription || null;

      console.log(`Processing resume optimization for user: ${req.userId}`);
      console.log(`File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

      // Read file buffer
      const fileBuffer = await fs.readFile(filePath);

      // Process the resume
      const result = await resumeOptimizer.optimize(fileBuffer, jobDescription);

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
        // Non-critical error, continue
      }

      if (!result.success) {
        return res.status(422).json({
          success: false,
          message: result.error,
          code: 'OPTIMIZATION_FAILED',
        });
      }

      // Return successful response
      res.json({
        success: true,
        message: 'Resume optimized successfully',
        data: result.data,
      });
    } catch (error) {
      console.error('Resume optimization route error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file after error:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to optimize resume. Please try again.',
        code: 'INTERNAL_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/resume/analyze
 * @desc    Analyze a resume and provide feedback
 * @access  Private (authenticated users)
 * 
 * Request:
 * - file: PDF resume file (required)
 * 
 * Response:
 * - success: boolean
 * - data: {
 *     analysis: object,
 *     originalText: string,
 *     metadata: object
 *   }
 */
router.post(
  '/resume/analyze',
  authenticate,
  upload.single('resume'),
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a PDF resume file',
          code: 'NO_FILE_UPLOADED',
        });
      }

      const filePath = req.file.path;

      console.log(`Processing resume analysis for user: ${req.userId}`);
      console.log(`File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

      // Read file buffer and extract text
      const fileBuffer = await fs.readFile(filePath);
      const originalText = await resumeOptimizer.extractTextFromBuffer(fileBuffer);

      // Analyze the resume
      const analysis = await resumeOptimizer.analyzeResume(originalText);

      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }

      // Return successful response
      res.json({
        success: true,
        message: 'Resume analyzed successfully',
        data: {
          analysis,
          originalText,
          metadata: {
            originalLength: originalText.length,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Resume analysis route error:', error);
      
      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file after error:', cleanupError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to analyze resume. Please try again.',
        code: 'INTERNAL_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   POST /api/v1/ai/resume/text-optimize
 * @desc    Optimize resume text directly (without file upload)
 * @access  Private (authenticated users)
 * 
 * Request:
 * - resumeText: string (required) - Resume text content
 * - jobDescription: string (optional) - Target job description
 * 
 * Response:
 * - success: boolean
 * - data: {
 *     originalText: string,
 *     optimizedText: string (Markdown format),
 *     analysis: object,
 *     metadata: object
 *   }
 */
router.post(
  '/resume/text-optimize',
  authenticate,
  express.json({ limit: '10mb' }),
  async (req, res) => {
    try {
      const { resumeText, jobDescription } = req.body;

      // Validate input
      if (!resumeText || typeof resumeText !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Resume text is required',
          code: 'MISSING_RESUME_TEXT',
        });
      }

      if (resumeText.length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Resume text is too short. Please provide a complete resume.',
          code: 'RESUME_TOO_SHORT',
        });
      }

      console.log(`Processing text-based resume optimization for user: ${req.userId}`);

      // Optimize the resume
      const optimizedText = await resumeOptimizer.optimizeResume(resumeText, jobDescription);

      // Analyze the resume
      const analysis = await resumeOptimizer.analyzeResume(resumeText);

      // Return successful response
      res.json({
        success: true,
        message: 'Resume optimized successfully',
        data: {
          originalText: resumeText,
          optimizedText,
          analysis,
          metadata: {
            originalLength: resumeText.length,
            optimizedLength: optimizedText.length,
            hasJobDescription: !!jobDescription,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Text-based resume optimization error:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to optimize resume. Please try again.',
        code: 'INTERNAL_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// ==================== ERROR HANDLING ====================

// Multer error handler
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 10MB.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 'UPLOAD_ERROR',
    });
  }
  
  if (error.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only PDF files are allowed',
      code: 'INVALID_FILE_TYPE',
    });
  }
  
  next(error);
});

module.exports = router;