import { useState, useRef, useCallback } from 'react'
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

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{title || 'Confirm'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{message || 'Are you sure?'}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
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
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
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
    setShowConfirm(false)
    try {
      await onRemove(documentType)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Remove failed')
    }
  }

  const handleReplaceClick = () => {
    fileInputRef.current?.click()
  }

  const fileUrl = hasFile ? getFileUrl(currentFile) : null
  const ext = hasFile ? getFileExtension(currentFile).toUpperCase() : ''

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
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="View document"
                >
                  <Eye size={16} />
                </a>
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
                  <button
                    onClick={handleRemoveClick}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
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

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmRemove}
        title="Remove Document"
        message={`Are you sure you want to remove the ${label}? This action cannot be undone.`}
      />
    </>
  )
}

export default DocumentUploadCard