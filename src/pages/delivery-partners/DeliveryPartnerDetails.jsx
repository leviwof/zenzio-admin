import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, AlertCircle, CheckCircle, FileText, ExternalLink, Edit2, X, Lock, Unlock } from "lucide-react";
import {
  getDeliveryPartnerById,
  updatePartnerStatus,
  getWorkTypes,
  updatePartnerProfile,
  getShiftConfig,
  getFleetShift,
  adminUpdateShift
} from "../../services/api";

const normalizePartner = (data) => {
  const statusMap = {
    true: "active",
    false: "blocked",
  };

  
  const getDocValue = (field) => {
    if (data.documents && data.documents.length > 0) {
      
      return data.documents[data.documents.length - 1][field] || "N/A";
    }
    return "N/A";
  };

  const getDocFiles = (field) => {
    if (data.documents && data.documents.length > 0) {
      return data.documents[data.documents.length - 1][field] || [];
    }
    return [];
  }

  return {
    partnerCode: data.uid,
    personalInfo: {
      id: data.id,
      fullName: `${data.profile?.first_name ?? ""} ${data.profile?.last_name ?? ""
        }`.trim(),

      email: data.contact?.encryptedEmail ?? "N/A",
      mobile: data.contact?.encryptedPhone ?? "N/A",
      dob: data.profile?.dob ?? null,
      gender: data.profile?.gender ?? "N/A",

      status: statusMap[data.status] || "inactive",
      joinedDate: data.createdAt,

      address: data.address
        ? {
          line1: data.address.address || "",
          line2: data.address.address_secondary || "",
          landmark: data.address.land_mark || "",
          city: data.address.city || "",
          state: data.address.state || "",
          pincode: data.address.pincode || "",
          fullCombined: `${data.address.address}, ${data.address.address_secondary ? data.address.address_secondary + ', ' : ''}${data.address.city}, ${data.address.state} - ${data.address.pincode}`,
        }
        : null,

      emergencyContacts: data.emergencyContacts || [],

      profilePhoto: data.profile?.photo?.[0] ?? null,
    },

    workAndAttendance: {
      workType: data.profile?.work_type?.name ?? data.profile?.work_type_uid ?? "N/A",
      workTypeUid: data.profile?.work_type_uid ?? null,
      shiftId: data.shift_id ?? null,
      shiftLocked: data.shift_locked ?? false,
      startTime: data.profile?.start_time ?? "N/A",
      endTime: data.profile?.end_time ?? "N/A",
      breakStartTime: data.profile?.break_start_time ?? "N/A",
      breakEndTime: data.profile?.break_end_time ?? "N/A",
    },

    vehicleInfo: {
      vehicleType: getDocValue('vehicle_type'),
      vehicleModel: getDocValue('model'),
      licensePlate: getDocValue('licenseNumber'), 
      registrationNumber: getDocValue('registrationNumber'),
      vehicleColor: getDocValue('vehicleColor'),
      engineNo: getDocValue('engineNo'),
      frameNo: getDocValue('frameNo'),
      insuranceNo: getDocValue('insuranceNo'),

      
      aadharNumber: getDocValue('aadharNumber'),
    },

    payoutBankDetails: {
      bankName: data.bank_details?.bank_name ?? "N/A",
      accountNumber: data.bank_details?.account_number ?? "N/A",
      ifsc: data.bank_details?.ifsc_code ?? "N/A",
      accountType: data.bank_details?.account_type ?? "N/A",
    },

    documents: {
      aadhar: getDocFiles('file_aadhar'),
      pan: getDocFiles('file_pan'),
      license: getDocFiles('file_license') || getDocFiles('file_dl'), 
      rc: getDocFiles('file_rc'),
      insurance: getDocFiles('file_insurance'),
      other: getDocFiles('file_other'),
    },
  };
};

const DeliveryPartnerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    type: "",
    message: "",
  });

  
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [workTypes, setWorkTypes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [timeForm, setTimeForm] = useState({
    work_type_uid: "",
    start_time: "",
    end_time: "",
    break_start_time: "",
    break_end_time: ""
  });
  const [shiftForm, setShiftForm] = useState({
    shiftId: "",
    locked: false
  });


  useEffect(() => {
    fetchPartnerDetails();
  }, [id]);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false }), 3000);
  };

  const fetchPartnerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getDeliveryPartnerById(id);
      console.log("Full Partner Data:", response);

      if (response.data) {
        const partnerData = response.data.data || response.data;
        if (partnerData) {
          setPartner(normalizePartner(partnerData));
        } else {
          setError("Invalid partner data received");
        }
      } else {
        setError("Failed to fetch partner details");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to fetch partner details"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkTypes = async () => {
    try {
      const response = await getWorkTypes();
      if (response.data) {
        setWorkTypes(response.data.data || response.data);
      }
    } catch (err) {
      console.error("Failed to fetch work types", err);
    }
  };

  const fetchShiftConfig = async () => {
    try {
      const response = await getShiftConfig();
      if (response.data) {
        setShifts(response.data.data || response.data);
      }
    } catch (err) {
      console.error("Failed to fetch shift config", err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setActionLoading(true);
      const status = newStatus === "active";
      await updatePartnerStatus(id, status);
      await fetchPartnerDetails();
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Failed to update status"
      );
    } finally {
      setActionLoading(false);
    }
  };


  
  const handleEditTimeClick = () => {
    if (!partner) return;
    if (workTypes.length === 0) fetchWorkTypes();

    const wa = partner.workAndAttendance;
    setTimeForm({
      work_type_uid: wa.workTypeUid || "",
      start_time: wa.startTime !== "N/A" ? wa.startTime : "",
      end_time: wa.endTime !== "N/A" ? wa.endTime : "",
      break_start_time: wa.breakStartTime !== "N/A" ? wa.breakStartTime : "",
      break_end_time: wa.breakEndTime !== "N/A" ? wa.breakEndTime : "",
    });
    setShowTimeModal(true);
  };

  const handleWorkTypeChange = (e) => {
    const uid = e.target.value;
    const selected = workTypes.find(wt => wt.work_type_uid === uid);
    if (selected) {
      setTimeForm({
        work_type_uid: uid,
        start_time: selected.start_time || "",
        end_time: selected.end_time || "",
        break_start_time: selected.break_start_time || "",
        break_end_time: selected.break_end_time || "",
      });
    } else {
      setTimeForm(prev => ({ ...prev, work_type_uid: uid }));
    }
  };

  const handleTimeFormChange = (e) => {
    const { name, value } = e.target;
    setTimeForm(prev => ({ ...prev, [name]: value }));
  };

  const submitTimeUpdate = async (e) => {
    e.preventDefault();
    if (!partner) return;

    setActionLoading(true);
    try {
      await updatePartnerProfile(partner.partnerCode, {
        work_type_uid: timeForm.work_type_uid,
        start_time: timeForm.start_time,
        end_time: timeForm.end_time,
        break_start_time: timeForm.break_start_time,
        break_end_time: timeForm.break_end_time
      });

      showAlert("success", "Shift timings updated successfully!");
      setShowTimeModal(false);
      fetchPartnerDetails(); 

    } catch (err) {
      console.error(err);
      showAlert("error", err.response?.data?.message || "Failed to update timings");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditShiftClick = () => {
    if (!partner) return;
    if (shifts.length === 0) fetchShiftConfig();

    const wa = partner.workAndAttendance;
    setShiftForm({
      shiftId: wa.shiftId || "",
      locked: wa.shiftLocked || false
    });
    setShowShiftModal(true);
  };

  const handleShiftChange = (e) => {
    const shiftId = e.target.value;
    setShiftForm(prev => ({ ...prev, shiftId }));
  };

  const handleLockToggle = () => {
    setShiftForm(prev => ({ ...prev, locked: !prev.locked }));
  };

  const submitShiftUpdate = async (e) => {
    e.preventDefault();
    if (!partner) return;

    setActionLoading(true);
    try {
      await adminUpdateShift(partner.partnerCode, {
        shiftId: shiftForm.shiftId,
        locked: shiftForm.locked
      });

      showAlert("success", "Shift updated successfully!");
      setShowShiftModal(false);
      fetchPartnerDetails();

    } catch (err) {
      console.error(err);
      showAlert("error", err.response?.data?.message || "Failed to update shift");
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-b-2 border-red-500 rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/delivery-partners")}
          className="flex items-center mb-4"
        >
          <ChevronLeft /> Back
        </button>

        <div className="bg-red-100 text-red-700 p-4 rounded flex gap-2">
          <AlertCircle /> {error}
        </div>
      </div>
    );
  }

  if (!partner) return null;

  const {
    personalInfo,
    vehicleInfo,
    payoutBankDetails,
    workAndAttendance,
    documents,
  } = partner;

  const currentStatus = personalInfo.status.toLowerCase();

  const renderDocImage = (title, urls) => {
    if (!urls || urls.length === 0) return null;
    return (
      <div className="mb-4">
        <h5 className="font-semibold text-sm text-gray-600 mb-2">{title}</h5>
        <div className="flex gap-2 flex-wrap">
          {urls.map((url, idx) => renderDocument(url,idx))}
        </div>
      </div>
    );
  };

    const renderDocument = (url, index) => {
      const ext = url.split('.').pop().toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  
      if (isImage) {
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" key={index}>
            <img
              src={url}
              alt={` ${index + 1}`}
              className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EError%3C/text%3E%3C/svg%3E';
              }}
            />
          </a>
        );
      }
  
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
        >
          <FileText className="w-8 h-8 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-gray-600 font-medium">View {ext.toUpperCase()}</span>
        </a>
      );
    };


  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {}
      {alert.show && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded shadow text-white z-50 ${alert.type === "error" ? "bg-red-500" : "bg-green-500"
            }`}
        >
          {alert.type === "error" ? <AlertCircle /> : <CheckCircle />}
          {alert.message}
        </div>
      )}

      {}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowTimeModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Shift Timings</h2>

            <form onSubmit={submitTimeUpdate} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-500 mb-1">Select Shift Type</label>
                <select
                  name="work_type_uid"
                  value={timeForm.work_type_uid}
                  onChange={handleWorkTypeChange}
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  required
                >
                  <option value="">-- Choose a Shift --</option>
                  {workTypes.map(wt => (
                    <option key={wt.work_type_uid} value={wt.work_type_uid}>
                      {wt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1">Shift Start</label>
                  <input
                    type="time"
                    name="start_time"
                    value={timeForm.start_time}
                    onChange={handleTimeFormChange}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1">Shift End</label>
                  <input
                    type="time"
                    name="end_time"
                    value={timeForm.end_time}
                    onChange={handleTimeFormChange}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1">Break Start</label>
                  <input
                    type="time"
                    name="break_start_time"
                    value={timeForm.break_start_time}
                    onChange={handleTimeFormChange}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-500 mb-1">Break End</label>
                  <input
                    type="time"
                    name="break_end_time"
                    value={timeForm.break_end_time}
                    onChange={handleTimeFormChange}
                    className="w-full border rounded p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowShiftModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Assign Shift</h2>

            <form onSubmit={submitShiftUpdate} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-500 mb-1">Select Shift</label>
                <select
                  name="shiftId"
                  value={shiftForm.shiftId}
                  onChange={handleShiftChange}
                  className="w-full border rounded p-2 text-sm bg-gray-50"
                  required
                >
                  <option value="">-- Choose a Shift --</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({shift.start} - {shift.end})
                    </option>
                  ))}
                </select>
              </div>

              {shiftForm.shiftId && (
                <div className="bg-gray-50 p-3 rounded border">
                  {(() => {
                    const selectedShift = shifts.find(s => s.id === shiftForm.shiftId);
                    if (!selectedShift) return null;
                    return (
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Work Hours:</span> {selectedShift.workHours}h</p>
                        <p><span className="font-medium">Break:</span> {selectedShift.breakMinutes} min ({selectedShift.breakType || 'SPLIT'})</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex items-center gap-2">
                  {shiftForm.locked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                  <span className="text-sm font-medium">Lock Shift Assignment</span>
                </div>
                <button
                  type="button"
                  onClick={handleLockToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${shiftForm.locked ? 'bg-red-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${shiftForm.locked ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {shiftForm.locked && (
                <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  When locked, the partner cannot change their shift. Only admin can modify.
                </p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      <button
        onClick={() => navigate("/delivery-partners")}
        className="flex items-center mb-4 text-gray-600 font-medium hover:text-black transition"
      >
        <ChevronLeft className="w-5 h-5 mr-1" /> Back to Partners
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Delivery Partner Details</h1>

        {}
        <div className="flex gap-3">
          {currentStatus === "active" && (
            <button
              onClick={() => handleStatusChange(personalInfo.id, "blocked")}
              disabled={actionLoading}
              className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
            >
              Block Partner
            </button>
          )}

          {currentStatus === "blocked" || currentStatus === "inactive" ? (
            <button
              onClick={() => handleStatusChange(personalInfo.id, "active")}
              disabled={actionLoading}
              className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600 transition"
            >
              {currentStatus === "inactive" ? "Approve & Activate" : "Unblock Partner"}
            </button>
          ) : null}

          <button
            onClick={() => navigate(`/delivery-partners/${partner.partnerCode}/attendance`)}
            className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-900 transition"
          >
            View Attendance Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {}
        <div className="md:col-span-1 space-y-6">
          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 flex flex-col items-center text-center">
            {personalInfo.profilePhoto ? (
              <img src={personalInfo.profilePhoto} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-50 shadow-sm mb-4" />
            ) : (
              <div className="w-32 h-32 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-4xl font-bold mb-4 border-4 border-gray-50">
                {personalInfo.fullName.charAt(0)}
              </div>
            )}

            <h2 className="text-xl font-bold">{personalInfo.fullName}</h2>
            <p className="text-sm text-gray-500 mb-2">Code: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{partner.partnerCode}</span></p>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${currentStatus === "active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              {personalInfo.status}
            </span>
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-500 block text-xs uppercase">Email</label>
                <p className="font-medium break-all">{personalInfo.email}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Mobile</label>
                <p className="font-medium">{personalInfo.mobile}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 block text-xs uppercase">DOB</label>
                  <p className="font-medium">{personalInfo.dob ? new Date(personalInfo.dob).toLocaleDateString("en-IN") : "N/A"}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Gender</label>
                  <p className="font-medium capitalize">{personalInfo.gender}</p>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100 group relative">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="font-bold text-lg">Shift Details</h3>
              <button
                onClick={handleEditShiftClick}
                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition text-xs px-3 py-1 border border-blue-200"
                title="Manage Shift"
              >
                {workAndAttendance.shiftLocked ? 'Change Shift' : 'Assign Shift'}
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {workAndAttendance.shiftLocked ? (
                    <Lock className="w-4 h-4 text-red-500" />
                  ) : (
                    <Unlock className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <label className="text-gray-500 block text-xs uppercase">Shift Status</label>
                    <p className="font-medium">{workAndAttendance.shiftLocked ? 'Locked' : 'Unlocked'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${workAndAttendance.shiftLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {workAndAttendance.shiftLocked ? 'Cannot change' : 'Can change'}
                </span>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Work Type</label>
                <p className="font-medium">{workAndAttendance.workType}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Start Time</label>
                  <p className="font-medium">{workAndAttendance.startTime}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">End Time</label>
                  <p className="font-medium">{workAndAttendance.endTime}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                {/* <div>
                  <label className="text-gray-500 block text-xs uppercase">Break Start</label>
                  <p className="font-medium text-gray-700">{workAndAttendance.breakStartTime}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Break End</label>
                  <p className="font-medium text-gray-700">{workAndAttendance.breakEndTime}</p>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="md:col-span-2 space-y-6">

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Address Details</h3>
            {personalInfo.address ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Primary Address</label>
                  <p className="font-medium">{personalInfo.address.line1}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Secondary Address</label>
                  <p className="font-medium">{personalInfo.address.line2 || "N/A"}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">Landmark</label>
                  <p className="font-medium">{personalInfo.address.landmark || "N/A"}</p>
                </div>
                <div>
                  <label className="text-gray-500 block text-xs uppercase">City / State / Pin</label>
                  <p className="font-medium">{`${personalInfo.address.city}, ${personalInfo.address.state} - ${personalInfo.address.pincode}`}</p>
                </div>
              </div>
            ) : <p className="text-gray-400">No address details available</p>}
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Emergency Contacts</h3>
            {personalInfo.emergencyContacts.length > 0 ? (
              <div className="space-y-4">
                {personalInfo.emergencyContacts.map((ec, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-gray-500 block text-xs uppercase">Name</label>
                        <p className="font-semibold">{ec.contact_person}</p>
                      </div>
                      <div>
                        <label className="text-gray-500 block text-xs uppercase">Relationship</label>
                        <p>{ec.relationship}</p>
                      </div>
                      <div>
                        <label className="text-gray-500 block text-xs uppercase">Phone</label>
                        <p>{ec.phoneNumber}</p>
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-gray-500 block text-xs uppercase">Address</label>
                        <p className="text-gray-700">{`${ec.address}, ${ec.city}, ${ec.state} - ${ec.pincode}`}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400">No emergency contacts added</p>}
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Vehicle Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <label className="text-gray-500 block text-xs uppercase">Vehicle Type</label>
                <p className="font-medium">{vehicleInfo.vehicleType}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Model</label>
                <p className="font-medium">{vehicleInfo.vehicleModel}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Color</label>
                <p className="font-medium">{vehicleInfo.vehicleColor}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">License Plate</label>
                <p className="font-medium">{vehicleInfo.licensePlate}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Registration No.</label>
                <p className="font-medium">{vehicleInfo.registrationNumber}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Insurance No.</label>
                <p className="font-medium">{vehicleInfo.insuranceNo}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Engine No.</label>
                <p className="font-medium">{vehicleInfo.engineNo}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Frame / Chassis No.</label>
                <p className="font-medium">{vehicleInfo.frameNo}</p>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Payout Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <label className="text-gray-500 block text-xs uppercase">Bank Name</label>
                <p className="font-medium">{payoutBankDetails.bankName}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Account Type</label>
                <p className="font-medium capitalize">{payoutBankDetails.accountType}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">Account Number</label>
                <p className="font-medium font-mono">{payoutBankDetails.accountNumber}</p>
              </div>
              <div>
                <label className="text-gray-500 block text-xs uppercase">IFSC Code</label>
                <p className="font-medium font-mono">{payoutBankDetails.ifsc}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-gray-500 block text-xs uppercase">Aadhar Number</label>
                <p className="font-medium font-mono tracking-wider">{vehicleInfo.aadharNumber}</p>
              </div>
            </div>
          </div>

          {}
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="font-bold border-b pb-2 mb-4 text-lg">Uploaded Documents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {renderDocImage("Aadhar Card", documents.aadhar)}
              {renderDocImage("PAN Card", documents.pan)}
              {renderDocImage("Driving License", documents.license)}
              {renderDocImage("Vehicle RC", documents.rc)}
              {renderDocImage("Insurance", documents.insurance)}
              {renderDocImage("Other Docs", documents.other)}
            </div>
            {(!documents.aadhar && !documents.pan && !documents.license && !documents.rc) && (
              <p className="text-gray-400 italic">No document images uploaded.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DeliveryPartnerDetails;
