import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Sparkles,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  FileUp,
  Briefcase,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { useToast } from '../hooks/useToast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trm-referral-backend.onrender.com/api'

interface OptimizationResult {
  originalText: string
  optimizedText: string
  analysis: {
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    atsCompatibility: {
      score: number
      issues: string[]
    }
    keywordMatch?: {
      score: number
      matched: string[]
      missing: string[]
    }
  }
  metadata: {
    originalLength: number
    optimizedLength: number
    hasJobDescription: boolean
    timestamp: string
  }
}

interface ResumeAnalysis {
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  atsCompatibility: {
    score: number
    issues: string[]
  }
  sectionScores: {
    summary: number
    experience: number
    skills: number
    education: number
    formatting: number
  }
}

export default function ResumeOptimizer() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'result'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [copied, setCopied] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strengths: true,
    weaknesses: true,
    suggestions: true,
    ats: true,
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please upload a PDF file only')
      }
    }
  }, [])

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please upload a PDF file only')
      }
    }
  }

  // Clear file selection
  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload and optimize resume
  const handleOptimize = async () => {
    if (!file && !resumeText.trim()) {
      setError('Please upload a PDF file or paste your resume text')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      let response

      if (file) {
        // File upload optimization
        const formData = new FormData()
        formData.append('resume', file)
        if (jobDescription.trim()) {
          formData.append('jobDescription', jobDescription)
        }

        response = await fetch(`${API_BASE_URL}/v1/ai/resume/optimize`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })
      } else {
        // Text-based optimization
        response = await fetch(`${API_BASE_URL}/v1/ai/resume/text-optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            resumeText: resumeText.trim(),
            jobDescription: jobDescription.trim() || undefined,
          }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to optimize resume')
      }

      const data = await response.json()
      
      if (data.success) {
        setResult(data.data)
        setAnalysis(data.data.analysis)
        setActiveTab('result')
        toast({
          title: 'Resume Optimized Successfully',
          description: 'Your resume has been enhanced with AI-powered improvements.',
          variant: 'default',
        })
      } else {
        throw new Error(data.message || 'Optimization failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast({
        title: 'Optimization Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Analyze resume without optimization
  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a PDF file to analyze')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch(`${API_BASE_URL}/v1/ai/resume/analyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to analyze resume')
      }

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.data.analysis)
        toast({
          title: 'Analysis Complete',
          description: `Overall Score: ${data.data.analysis.overallScore}/100`,
          variant: 'default',
        })
      } else {
        throw new Error(data.message || 'Analysis failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Copy optimized text to clipboard
  const handleCopy = async () => {
    if (result?.optimizedText) {
      try {
        await navigator.clipboard.writeText(result.optimizedText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: 'Copied to Clipboard',
          description: 'The optimized resume has been copied.',
          variant: 'default',
        })
      } catch {
        toast({
          title: 'Copy Failed',
          description: 'Could not copy to clipboard.',
          variant: 'destructive',
        })
      }
    }
  }

  // Download optimized resume as markdown
  const handleDownload = () => {
    if (result?.optimizedText) {
      const blob = new Blob([result.optimizedText], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `optimized-resume-${new Date().toISOString().split('T')[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Download Started',
        description: 'Your optimized resume is being downloaded.',
        variant: 'default',
      })
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Reset the form
  const handleReset = () => {
    setFile(null)
    setResumeText('')
    setJobDescription('')
    setResult(null)
    setAnalysis(null)
    setError(null)
    setActiveTab('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Render score badge
  const ScoreBadge = ({ score, label }: { score: number; label: string }) => {
    const getColor = (s: number) => {
      if (s >= 80) return 'bg-green-100 text-green-800 border-green-200'
      if (s >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return 'bg-red-100 text-red-800 border-red-200'
    }

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getColor(score)}`}>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{score}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-3 bg-blue-600 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Resume Optimizer</h1>
              <p className="text-gray-600">Enhance your resume with AI-powered suggestions</p>
            </div>
          </motion.div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Resume
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="result" className="flex items-center gap-2" disabled={!result}>
              <Wand2 className="w-4 h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Resume</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200 ease-in-out
                    ${dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                    }
                    ${file ? 'bg-green-50 border-green-300' : ''}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {file ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="p-4 bg-green-100 rounded-full">
                        <FileUp className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearFile()
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-100 rounded-full">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Drag & drop your PDF resume here
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          or click to browse (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Job Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Target Job Description (Optional)
                  </label>
                  <Textarea
                    placeholder="Paste the job description here to tailor your resume for a specific position..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Adding a job description helps the AI optimize your resume for ATS compatibility and keyword matching.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleOptimize}
                    disabled={!file || isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Optimize Resume
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={!file || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Analyze Only
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text Input Tab */}
          <TabsContent value="text">
            <Card>
              <CardHeader>
                <CardTitle>Paste Your Resume Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resume Text */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Resume Content
                  </label>
                  <Textarea
                    placeholder="Paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="w-4 h-4" />
                    Target Job Description (Optional)
                  </label>
                  <Textarea
                    placeholder="Paste the job description here to tailor your resume for a specific position..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleOptimize}
                  disabled={!resumeText.trim() || isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Optimize Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="result">
            {result && (
              <div className="space-y-6">
                {/* Score Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Optimization Results</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleReset}>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Start Over
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3 mb-6">
                      <ScoreBadge score={result.analysis.overallScore} label="Overall Score" />
                      <ScoreBadge score={result.analysis.atsCompatibility.score} label="ATS Score" />
                      {result.metadata.hasJobDescription && result.analysis.keywordMatch && (
                        <ScoreBadge score={result.analysis.keywordMatch.score} label="Keyword Match" />
                      )}
                    </div>

                    {/* Analysis Sections */}
                    <div className="space-y-4">
                      {/* Strengths */}
                      <div className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection('strengths')}
                          className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-900">Strengths</span>
                            <span className="text-sm text-green-700">
                              ({result.analysis.strengths.length})
                            </span>
                          </div>
                          {expandedSections.strengths ? (
                            <ChevronUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-green-600" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedSections.strengths && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="p-4 space-y-2">
                                {result.analysis.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Weaknesses */}
                      <div className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection('weaknesses')}
                          className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-red-900">Areas for Improvement</span>
                            <span className="text-sm text-red-700">
                              ({result.analysis.weaknesses.length})
                            </span>
                          </div>
                          {expandedSections.weaknesses ? (
                            <ChevronUp className="w-5 h-5 text-red-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-red-600" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedSections.weaknesses && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="p-4 space-y-2">
                                {result.analysis.weaknesses.map((weakness, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    {weakness}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Suggestions */}
                      <div className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleSection('suggestions')}
                          className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-900">AI Suggestions</span>
                            <span className="text-sm text-blue-700">
                              ({result.analysis.suggestions.length})
                            </span>
                          </div>
                          {expandedSections.suggestions ? (
                            <ChevronUp className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-blue-600" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedSections.suggestions && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <ul className="p-4 space-y-2">
                                {result.analysis.suggestions.map((suggestion, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                    <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ATS Issues */}
                      {result.analysis.atsCompatibility.issues.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSection('ats')}
                            className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-yellow-600" />
                              <span className="font-medium text-yellow-900">ATS Compatibility Issues</span>
                              <span className="text-sm text-yellow-700">
                                ({result.analysis.atsCompatibility.issues.length})
                              </span>
                            </div>
                            {expandedSections.ats ? (
                              <ChevronUp className="w-5 h-5 text-yellow-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-yellow-600" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedSections.ats && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <ul className="p-4 space-y-2">
                                  {result.analysis.atsCompatibility.issues.map((issue, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Side-by-Side Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                      <span>Resume Comparison</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOriginal(!showOriginal)}
                        >
                          {showOriginal ? (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              Hide Original
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              Show Original
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCopy}>
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid ${showOriginal ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                      {/* Original */}
                      {showOriginal && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Original Resume
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                              {result.originalText}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Optimized */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          AI-Optimized Resume
                        </h3>
                        <div className="bg-blue-50 rounded-lg p-4 max-h-[600px] overflow-y-auto border border-blue-100">
                          <div className="prose prose-sm max-w-none">
                            <div 
                              className="text-gray-800"
                              dangerouslySetInnerHTML={{
                                __html: result.optimizedText
                                  .replace(/#{3}\s(.+)/g, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
                                  .replace(/#{2}\s(.+)/g, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                                  .replace(/#{1}\s(.+)/g, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
                                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                  .replace(/-\s(.+)/g, '<li class="ml-4">$1</li>')
                                  .replace(/\n/g, '<br />')
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
