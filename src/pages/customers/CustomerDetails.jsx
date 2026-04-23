import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Phone, Trash2 } from "lucide-react";
import { getCustomerById, updateCustomerStatus, deleteCustomer } from "../../services/api";

/* ======================
   DATE FORMATTER
====================== */
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const normalizeCustomer = (response) => {
  const user = response?.data;

  return {
    id: user?.id,
    uid: user?.uid, // ✅ UUID

    personalInfo: {
      uid: user?.uid,
      name: user?.profile
        ? `${user.profile.first_name ?? ""} ${user.profile.last_name ?? ""}`.trim()
        : "N/A",

      email: user?.contact?.encryptedEmail ?? "N/A",
      mobile: user?.contact?.encryptedPhone ?? "N/A",

      birthday: user?.profile?.dob ?? null,
      anniversary: user?.profile?.anniversary ?? null,
      memberSince: user?.createdAt ?? null,

      gender: user?.profile?.gender ?? "Not specified",
      profilePhoto: user?.profile?.photo?.[0] ?? null,

      status: user?.status ? "active" : "blocked",
      status_flag: user?.status_flag,
      isActive: Boolean(user?.isActive),
    },

    savedAddresses: user?.address ?? [],
    bankDetails: user?.bank_details ?? null,

    accountActivity: {
      totalOrders: user?.totalOrders ?? 0,
      totalSpent: user?.totalSpent ?? 0,
    },
  };
};

const CustomerDetails = () => {
  const { id } = useParams(); // 🔑 UID
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (id) fetchCustomerDetails();
  }, [id]);

  /* ======================
     FETCH CUSTOMER
  ====================== */
  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await getCustomerById(id); // UID
      const normalized = normalizeCustomer(response);
      setCustomer(normalized);
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     TOGGLE STATUS
  ====================== */
  const handleStatusToggle = async () => {
    if (!customer?.uid) return;

    try {
      setStatusUpdating(true);

      const newValue = customer.personalInfo.isActive ? 0 : 1;

      await updateCustomerStatus(customer.uid, {
        status: newValue,
        isActive: newValue,
      });

      await fetchCustomerDetails();
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  /* ======================
     DELETE CUSTOMER
  ====================== */
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return;
    }

    if (!customer?.uid) return;

    try {
      setLoading(true);
      await deleteCustomer(customer.uid);
      navigate("/customers");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete customer");
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen text-center">
        <h2 className="text-xl font-semibold">Customer not found</h2>
        <button
          onClick={() => navigate("/customers")}
          className="mt-4 text-red-500 hover:underline"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const {
    personalInfo,
    savedAddresses = [],
    accountActivity = {},
  } = customer;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-6 py-4">
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center text-gray-700 hover:text-gray-900"
        >
          <ChevronLeft size={20} />
          <span className="ml-1 font-medium">Customer Details</span>
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="bg-white p-6 rounded-lg shadow mb-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-pink-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {personalInfo.profilePhoto ? (
                <img
                  src={personalInfo.profilePhoto}
                  alt={personalInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                personalInfo.name.charAt(0)
              )}
            </div>

            <h2 className="mt-3 text-lg font-semibold">
              {personalInfo.name}
            </h2>

            <span
              className={`inline-block px-3 py-1 mt-2 text-xs font-medium rounded ${personalInfo.isActive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              {personalInfo.isActive ? "Active" : "Blocked"}
            </span>

            <p className="text-xs text-gray-500 mt-2">
              Member since {formatDate(personalInfo.memberSince)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="font-semibold mb-4">Personal Information</h3>

            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Mail size={16} className="text-red-500" />
                {personalInfo.email}
              </div>

              <div className="flex gap-2">
                <Phone size={16} className="text-red-500" />
                {personalInfo.mobile}
              </div>

              <div>DOB: {formatDate(personalInfo.birthday)}</div>
              <div>Anniversary: {formatDate(personalInfo.anniversary)}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="font-semibold mb-4">Saved Address</h3>

            {savedAddresses.length > 0 ? (
              <div className="space-y-4">
                {savedAddresses.map((a, index) => (
                  <div key={index} className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {a.address && (
                      <p className="font-medium text-gray-900">{a.address}</p>
                    )}
                    {a.address_secondary && (
                      <p className="text-gray-600">{a.address_secondary}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {a.city && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {a.city}
                        </span>
                      )}
                      {a.state && (
                        <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                          {a.state}
                        </span>
                      )}
                      {a.pincode && (
                        <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                          PIN: {a.pincode}
                        </span>
                      )}
                    </div>
                    {a.lat && a.lng && (
                      <p className="text-xs text-gray-400 mt-2">
                        📍 {a.lat}, {a.lng}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No address saved</p>
            )}
          </div>

          <button
            onClick={handleStatusToggle}
            disabled={statusUpdating}
            className={`w-full py-2 rounded text-white ${personalInfo.isActive ? "bg-red-500" : "bg-green-500"
              }`}
          >
            {personalInfo.isActive ? "Block Customer" : "Unblock Customer"}
          </button>

          <button
            onClick={handleDelete}
            className="w-full mt-3 flex justify-center items-center gap-2 text-red-500 hover:bg-red-50 py-2 rounded transition-colors"
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Account Activity</h3>
            <p className="text-sm">
              Total Orders: {accountActivity.totalOrders}
            </p>
            <p className="text-sm">
              Total Spent: ₹{accountActivity.totalSpent}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">Reviews</h3>
            <p className="text-sm text-gray-500">No reviews yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
