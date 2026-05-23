const TimePicker = ({ value, onChange, label, error, disabled = false }) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-500">{label}</label>
      )}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-150 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

export default TimePicker
