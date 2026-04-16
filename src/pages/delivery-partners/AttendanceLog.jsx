// =============================================
// FILE: src/pages/delivery-partners/AttendanceLog.jsx
// =============================================
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Calendar, List, AlertCircle } from 'lucide-react';
import { getPartnerAttendance, getDeliveryPartnerById } from '../../services/api';

const AttendanceLog = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [partnerName, setPartnerName] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState({
    totalWorkingHours: 0,
    totalBreakHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  useEffect(() => {
    fetchAttendance();
  }, [partnerId, selectedPeriod]);

  const fetchAttendance = async () => {
    if (!partnerId || partnerId === 'undefined') {
      console.error("AttendanceLog: partnerId is missing or 'undefined'");
      setError("Invalid partner ID access");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let start, end;
      const now = new Date();

      if (selectedPeriod === 'custom') {
        start = startDate;
        end = endDate;
      } else if (selectedPeriod === 'this-month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      } else if (selectedPeriod === 'last-month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      } else {
        // Fallback or other periods
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      }

      if (selectedPeriod === 'custom' && (!start || !end)) {
        setLoading(false);
        return;
      }

      const response = await getPartnerAttendance(partnerId, { start_date: start, end_date: end });
      console.log("Attendance API Response:", response.data);

      if (response.data.status === 'success') {
        const data = response.data.data;
        setAttendance(data.daily_breakdown || []);
        setSummary({
          totalWorkingHours: data.total_working_hours || 0,
          totalBreakHours: data.total_break_hours || 0
        });

        // Fetch partner details if not already set
        if (!partnerName) {
          try {
            const partnerRes = await getDeliveryPartnerById(partnerId);
            const pData = partnerRes.data?.data || partnerRes.data;
            if (pData && pData.profile) {
              setPartnerName(`${pData.profile.first_name || ''} ${pData.profile.last_name || ''}`.trim() || 'Partner');
            } else if (pData && pData.name) {
              setPartnerName(pData.name);
            }
          } catch (e) {
            console.error("Partner details fetch failed", e);
          }
        }
      } else {
        setError(response.data.message || 'Failed to fetch attendance');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError(error.response?.data?.message || 'Failed to fetch attendance log');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const handleExportCSV = () => {
    if (attendance.length === 0) return;

    const headers = ['Date', 'Working Hours', 'Break Hours'];
    const rows = attendance.map(day => [
      day.date,
      formatDuration(day.working_hours),
      formatDuration(day.break_hours)
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${partnerId}_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodOptions = [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance log...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(`/delivery-partners/${partnerId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft size={20} />
          <span>Back to Partner Details</span>
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center space-x-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => navigate(`/delivery-partners/${partnerId}`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ChevronLeft size={20} />
        <span className="ml-1">Back to Partner Details</span>
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Log</h1>
            <p className="text-gray-600 text-sm mt-1">{partnerName}</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export CSV (Salary)</span>
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {selectedPeriod === 'custom' && (
          <div className="flex space-x-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendance}
                className="px-4 py-1 bg-gray-800 text-white rounded text-sm hover:bg-black"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Period Filter & View Toggle */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex space-x-2">
            {periodOptions.map(period => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedPeriod === period.value
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 border rounded-md flex items-center space-x-2 ${viewMode === 'calendar' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
            >
              <Calendar size={16} />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 border rounded-md flex items-center space-x-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
            >
              <List size={16} />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-4xl font-bold text-blue-600">{formatDuration(summary.totalWorkingHours)}</p>
            <p className="text-sm text-gray-600 mt-2">Total Working Hours</p>
          </div>
          <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-100">
            <p className="text-4xl font-bold text-orange-600">{formatDuration(summary.totalBreakHours)}</p>
            <p className="text-sm text-gray-600 mt-2">Total Break Hours</p>
          </div>
        </div>

        {/* Attendance List/Calendar */}
        {attendance.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records found for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((day, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-4 hover:shadow-md transition flex justify-between items-center bg-white"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                  <div className="flex items-center space-x-8 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-gray-500">Working:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {formatDuration(day.working_hours)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                      <span className="text-gray-500">Break:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {formatDuration(day.break_hours)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Login</p>
                  <p className="font-bold text-gray-700">{formatDuration(day.working_hours + day.break_hours)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLog;