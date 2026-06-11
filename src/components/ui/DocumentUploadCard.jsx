import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Image, X, Download, Trash2, CheckCircle, AlertCircle, Loader2, Eye, ArrowUpFromLine, Replace } from 'lucide-react'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

const fileIcons = {
  pdf: FileText,
  jpg: Image,
  jpeg: Image,
  png: Image,
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const getFileExtension = (filename) => {
  return filename?.split('.').pop()?.toLowerCase() || ''
}

const getFileIcon = (filename) => {
  const ext = getFileExtension(filename)
  return fileIcons[ext] || FileText
}

const isImageFile = (filename) => {
  return ['jpg', 'jpeg', 'png'].includes(getFileExtension(filename))
}

const UploadProgress = ({ progress }) => {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="h-full bg-indigo-500 rounded-full"
      />
    </div>
  )
}

const DocumentUploadCard = ({
  label,
  icon: Icon,
  documentType,
  files = [],
  onUpload,
  onRemove,
  uploading = false,
  disabled = false,
  getFileUrl = (f) => f,
  onViewDocument = null,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [removing, setRemoving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loadingView, setLoadingView] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const removeBtnRef = useRef(null)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  const currentFile = files?.[0]
  const hasFile = Boolean(currentFile)
  const FileIcon = hasFile ? getFileIcon(currentFile) : Icon

  const validateFile = (file) => {
    if (!file) return 'No file selected'
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Accepted: PDF, JPG, PNG'
    }
    if (file.size > MAX_SIZE) {
      return `File exceeds 10MB limit (${formatFileSize(file.size)})`
    }
    return null
  }

  const handleFileSelect = useCallback(async (file) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setUploadProgress(0)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + Math.random() * 30, 90))
    }, 300)
    try {
      await onUpload(file, documentType)
      clearInterval(progressInterval)
      setUploadProgress(100)
      setTimeout(() => setUploadProgress(0), 600)
    } catch (err) {
      clearInterval(progressInterval)
      setUploadProgress(0)
      setError(err?.response?.data?.message || err?.message || 'Upload failed')
    }
  }, [onUpload, documentType])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    if (e.target) e.target.value = ''
  }

  const handleRemoveClick = () => {
    setShowConfirm(true)
  }

  const handleConfirmRemove = async () => {
    setRemoving(true)
    try {
      await onRemove(documentType)
      setShowConfirm(false)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Remove failed')
    } finally {
      setRemoving(false)
    }
  }

  const handleReplaceClick = () => {
    fileInputRef.current?.click()
  }

  const handleViewClick = async () => {
    if (onViewDocument) {
      setLoadingView(true)
      try {
        const url = await onViewDocument(currentFile)
        if (url) setPreviewUrl(url)
      } finally {
        setLoadingView(false)
      }
      return
    }

    if (fileUrl) setPreviewUrl(fileUrl)
  }

  const fileUrl = hasFile ? getFileUrl(currentFile) : null
  const ext = hasFile ? getFileExtension(currentFile).toUpperCase() : ''

  useEffect(() => {
    if (!previewUrl) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [previewUrl])

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-400 shadow-indigo-100/50 shadow-lg'
            : hasFile
              ? 'border-emerald-100 hover:border-gray-200'
              : 'border-gray-100 hover:border-gray-200'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              hasFile ? 'bg-emerald-50' : 'bg-indigo-50'
            }`}>
              {hasFile && files?.length > 0 ? (
                isImageFile(currentFile) ? (
                  <img
                    src={fileUrl}
                    alt=""
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <FileIcon size={18} className={hasFile ? 'text-emerald-600' : 'text-indigo-500'} />
                )
              ) : (
                <FileIcon size={18} className="text-indigo-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
              <p className="text-[11px] text-gray-400 font-medium">
                {hasFile ? 'Uploaded' : 'Not uploaded'}
              </p>
            </div>
            {hasFile && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  <CheckCircle size={10} />
                  Verified
                </span>
              </div>
            )}
          </div>

          {hasFile ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                {isImageFile(currentFile) ? (
                  <img
                    src={fileUrl}
                    alt={currentFile}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-indigo-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {currentFile.length > 30 ? currentFile.slice(0, 27) + '...' : currentFile}
                  </p>
                  <p className="text-[10px] text-gray-400">{ext} Document</p>
                </div>
                <button
                  onClick={handleViewClick}
                  disabled={loadingView}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  title="View document"
                >
                  {loadingView ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                </button>
              </div>

              {uploadProgress > 0 && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-medium">Uploading...</span>
                    <span className="text-[10px] text-gray-400 font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  <UploadProgress progress={uploadProgress} />
                </div>
              )}

              {!disabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReplaceClick}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                  >
                    <Replace size={14} />
                    Replace
                  </button>
                  <div className="relative flex-1">
                    <button
                      ref={removeBtnRef}
                      onClick={() => setShowConfirm(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      {removing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {removing ? 'Removing...' : 'Remove'}
                    </button>
                    <AnimatePresence>
                      {showConfirm && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 right-0 mb-2 z-50"
                        >
                          <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2.5">
                              Remove {label}?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleConfirmRemove}
                                disabled={removing}
                                className="flex-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors"
                              >
                                {removing ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-5 ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-50/50'
                  : error
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={isDragOver ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isDragOver ? 'bg-indigo-100' : 'bg-gray-50'
                  }`}
                >
                  {uploading ? (
                    <Loader2 size={18} className="text-indigo-500 animate-spin" />
                  ) : (
                    <ArrowUpFromLine size={18} className={isDragOver ? 'text-indigo-600' : 'text-gray-400'} />
                  )}
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    {uploading ? 'Uploading...' : isDragOver ? 'Drop here' : 'Upload Document'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isDragOver ? 'Release to upload' : 'Drag & drop or browse'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {['PDF', 'JPG', 'PNG'].map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-50 rounded-md"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {uploadProgress > 0 && !hasFile && (
            <div className="mt-2">
              <UploadProgress progress={uploadProgress} />
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                  <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                  <p className="text-[11px] text-red-600 font-medium">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-400 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-hidden bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-5xl h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            >
              <div className="h-12 px-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{currentFile}</p>
                </div>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <iframe
                  src={previewUrl}
                  title={`${label} preview`}
                  scrolling="auto"
                  className="block h-full w-full bg-gray-50"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DocumentUploadCard
