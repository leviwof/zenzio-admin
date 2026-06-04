import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Gift,
  Loader2,
  MessageSquare,
  Receipt,
  Store,
  Tag,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { approveOffer, getOfferDetails, rejectOffer, requestChanges } from "../../services/api";
import { isRestaurantAdmin } from "../../utils/auth";

const IMAGE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api/admin", "").replace("/api", "").replace(/\/+$/, "");

const OFFER_TYPE_LABELS = {
  PERCENTAGE_DISCOUNT: "Percentage Discount",
  FIXED_AMOUNT_DISCOUNT: "Fixed Amount Discount",
  BUY_ONE_GET_ONE: "Buy 1 Get 1",
  BUY_X_GET_Y: "Buy X Get Y",
  FREE_ITEM_CART_VALUE: "Free Item On Cart Value",
  FREE_ITEM_CATEGORY: "Free Item On Category",
  FREE_ITEM_OFFER: "Free Item Offer",
  CART_VALUE_OFFER: "Cart Value Offer",
  FESTIVAL_OFFER: "Festival Offer",
  PLATFORM_CAMPAIGN: "Platform Campaign",
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const getRestaurantName = (offer) =>
  offer.restaurant?.profile?.restaurant_name ||
  offer.restaurant?.restaurant_name ||
  (offer.restaurantId ? offer.restaurantId : "All Restaurants");

const buildImageUrl = (offerImage) => {
  if (!offerImage) return null;
  const normalized = offerImage.replace(/\\/g, "/");
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("offers/")) return `${IMAGE_BASE_URL}/uploads/${normalized}`;
  return `${IMAGE_BASE_URL}/${normalized}`;
};

const StatusPill = ({ status }) => {
  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
    INACTIVE: "bg-slate-50 text-slate-600 border-slate-200",
    SCHEDULED: "bg-indigo-50 text-indigo-600 border-indigo-100",
    EXPIRED: "bg-orange-50 text-orange-600 border-orange-100",
    PENDING_APPROVAL: "bg-amber-50 text-amber-600 border-amber-100",
    REJECTED: "bg-red-50 text-red-600 border-red-100",
    CHANGES_REQUESTED: "bg-blue-50 text-blue-600 border-blue-100",
  };
  const label = {
    PENDING_APPROVAL: "Pending Approval",
    CHANGES_REQUESTED: "Changes Requested",
  }[status] || String(status || "-").replaceAll("_", " ");

  return <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>{label}</span>;
};

const InfoCard = ({ icon: Icon, label, value, sub, color = "bg-indigo-50 text-indigo-600" }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3.5">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const DetailBlock = ({ title, children }) => (
  <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
    {children}
  </section>
);

const KeyValue = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-sm font-medium text-gray-800 mt-1 break-words">{value || "-"}</p>
  </div>
);

const formatRuleLabel = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();

const isItemDetailObject = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value.name || value.menu_name || value.menu_uid);

const formatRuleValue = (key, value) => {
  if (value === undefined || value === null || value === "") return "-";
  if (isItemDetailObject(value)) {
    const name = value.name || value.menu_name || value.menu_uid;
    const parts = [
      name,
      value.category ? `Category: ${value.category}` : null,
      value.price !== undefined && value.price !== null ? `Price: ${formatCurrency(value.price)}` : null,
    ].filter(Boolean);
    return parts.join(" | ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
      .map(([entryKey, entryValue]) => `${formatRuleLabel(entryKey)}: ${typeof entryValue === "object" ? formatRuleValue(entryKey, entryValue) : String(entryValue)}`)
      .join(" | ") || "-";
  }
  if (/amount|value|price/i.test(key) && !Number.isNaN(Number(value))) return formatCurrency(value);
  return String(value);
};

const JsonSummary = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return <p className="text-sm text-gray-500">No rule details configured.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{formatRuleLabel(key)}</p>
          <p className="text-sm font-medium text-gray-800 mt-1 break-words">{formatRuleValue(key, value)}</p>
        </div>
      ))}
    </div>
  );
};

const getOfferItemNames = (offer) => {
  const names = [
    offer?.discountItemNames?.buyItem,
    offer?.discountItemNames?.freeItem,
    ...(offer?.discountItemNames?.applicableItems || []),
    ...(offer?.applicableItemNames || []),
  ].filter(Boolean);

  return [...new Set(names)];
};

const getRuleData = (offer) => ({
  ...(offer?.ruleConfig || {}),
  ...(offer?.conditions || {}),
  ...(offer?.rewards || {}),
});

const readRuleValue = (offer, keys) => {
  const data = getRuleData(offer);
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const readItemObjectName = (value) => {
  if (!value || typeof value !== "object") return undefined;
  return value.name || value.menu_name || value.title || value.menuName;
};

const getRuleItemName = (offer, kind) => {
  const isBuy = kind === "buy";
  const name = readRuleValue(
    offer,
    isBuy ? ["buyItemName", "buyProductName"] : ["freeItemName", "freeProductName"],
  );
  const detailName = readItemObjectName(
    readRuleValue(
      offer,
      isBuy ? ["buyItemDetails", "buyProductDetails"] : ["freeItemDetails", "freeProductDetails"],
    ),
  );
  const backendName = isBuy ? offer?.discountItemNames?.buyItem : offer?.discountItemNames?.freeItem;
  const rawRef = readRuleValue(offer, isBuy ? ["buyItem", "buyProduct"] : ["freeItem", "freeProduct"]);

  return name || detailName || backendName || rawRef || "-";
};

const getRuleNumber = (offer, keys, fallback = 1) => {
  const value = Number(readRuleValue(offer, keys));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getFriendlyOfferType = (offer) =>
  OFFER_TYPE_LABELS[offer?.offerType] ||
  String(offer?.offerType || offer?.discountType || "-").replaceAll("_", " ");

const getOfferLogicMessage = (offer) => {
  const buyName = getRuleItemName(offer, "buy");
  const freeName = getRuleItemName(offer, "free");
  const buyQty = getRuleNumber(offer, ["buyQuantity", "quantityRequired", "buyQty", "buyX"], 1);
  const freeQty = getRuleNumber(offer, ["freeQuantity", "freeQty", "getQty", "getY"], 1);
  const triggerCategory = readRuleValue(offer, ["triggerCategory", "category", "categoryId"]);
  const minAmount = Number(readRuleValue(offer, ["minimumCartAmount"]) || offer?.minOrderValue || 0);

  if (["BUY_ONE_GET_ONE", "BUY_X_GET_Y"].includes(offer?.offerType)) {
    return `Buy ${buyQty} ${buyName}, get ${freeQty} ${freeName} free`;
  }
  if (offer?.offerType === "FREE_ITEM_CART_VALUE") {
    return `Spend ${formatCurrency(minAmount)}, get ${freeQty} ${freeName} free`;
  }
  if (offer?.offerType === "FREE_ITEM_CATEGORY") {
    return `Buy from ${triggerCategory || "selected category"}, get ${freeQty} ${freeName} free`;
  }
  if (offer?.discountType === "PERCENTAGE") {
    return `Get ${Number(offer.discountValue || 0)}% off${Number(offer.minOrderValue || 0) ? ` above ${formatCurrency(offer.minOrderValue)}` : ""}`;
  }
  return `Get ${formatCurrency(offer?.discountValue)} off${Number(offer?.minOrderValue || 0) ? ` above ${formatCurrency(offer.minOrderValue)}` : ""}`;
};

const buildReadableRuleRows = (offer) => {
  const rows = [{ label: "Type", value: getFriendlyOfferType(offer) }];

  if (["BUY_ONE_GET_ONE", "BUY_X_GET_Y"].includes(offer?.offerType)) {
    rows.push(
      { label: "Buy Item", value: getRuleItemName(offer, "buy") },
      { label: "Free Item", value: getRuleItemName(offer, "free") },
      { label: "Buy Category", value: readRuleValue(offer, ["buyCategory"]) || "-" },
      { label: "Free Category", value: readRuleValue(offer, ["freeCategory"]) || "-" },
      { label: "Buy Quantity", value: getRuleNumber(offer, ["buyQuantity", "quantityRequired", "buyQty", "buyX"], 1) },
      { label: "Free Quantity", value: getRuleNumber(offer, ["freeQuantity", "freeQty", "getQty", "getY"], 1) },
    );
    return rows;
  }

  if (["FREE_ITEM_CART_VALUE", "FREE_ITEM_CATEGORY", "FREE_ITEM_OFFER"].includes(offer?.offerType)) {
    rows.push(
      { label: "Free Item", value: getRuleItemName(offer, "free") },
      { label: "Free Category", value: readRuleValue(offer, ["freeCategory"]) || "-" },
      { label: "Free Quantity", value: getRuleNumber(offer, ["freeQuantity", "freeQty", "getQty"], 1) },
    );
    if (offer.offerType === "FREE_ITEM_CART_VALUE") {
      rows.push({ label: "Minimum Cart", value: formatCurrency(readRuleValue(offer, ["minimumCartAmount"]) || offer.minOrderValue) });
    }
    if (offer.offerType === "FREE_ITEM_CATEGORY") {
      rows.push({ label: "Trigger Category", value: readRuleValue(offer, ["triggerCategory", "category"]) || "-" });
    }
    return rows;
  }

  rows.push(
    { label: "Discount", value: offer?.discountType === "PERCENTAGE" ? `${Number(offer.discountValue || 0)}%` : formatCurrency(offer?.discountValue) },
    { label: "Minimum Order", value: formatCurrency(offer?.minOrderValue) },
    { label: "Category", value: offer?.categoryId || "All Categories" },
  );
  return rows;
};

const DiscountLogicSummary = ({ offer }) => {
  const itemNames = getOfferItemNames(offer);
  const rows = buildReadableRuleRows(offer);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-2">Offer Rule</p>
        <p className="text-base font-semibold text-orange-950">{getOfferLogicMessage(offer)}</p>
        {itemNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {itemNames.map((name) => (
              <span key={name} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-orange-700 border border-orange-100">
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{row.label}</p>
            <p className="text-sm font-medium text-gray-800 mt-1 break-words">{row.value || "-"}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const OfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const restaurantAdmin = isRestaurantAdmin();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showChangeReason, setShowChangeReason] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fetchOfferDetails = async () => {
    try {
      setLoading(true);
      setImageError(false);
      const response = await getOfferDetails(id);
      const data = response.data?.data || response.data;
      setOffer(data);
      setAdminNotes(data?.adminComments || "");
      setRejectionReason(data?.rejectionReason || "");
      setShowRejectReason(Boolean(data?.rejectionReason));
      setShowChangeReason(Boolean(data?.adminComments));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load offer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const imageUrl = useMemo(() => buildImageUrl(offer?.offerImage), [offer?.offerImage]);
  const canReview = offer && !restaurantAdmin && ["PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(offer.lifecycleStatus);

  const runAction = async (success, callback) => {
    try {
      setActionLoading(true);
      await callback();
      toast.success(success);
      fetchOfferDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || "Offer action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = () => runAction("Offer approved", () => approveOffer(id, adminNotes));

  const handleReject = () => {
    if (!showRejectReason) {
      setShowRejectReason(true);
      setShowChangeReason(false);
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error("Enter reason for rejection");
      return;
    }
    runAction("Offer rejected", () => rejectOffer(id, rejectionReason.trim()));
  };

  const handleRequestChanges = () => {
    if (!showChangeReason) {
      setShowChangeReason(true);
      setShowRejectReason(false);
      return;
    }
    if (!adminNotes.trim()) {
      toast.error("Enter reason for requested changes");
      return;
    }
    runAction("Changes requested", () => requestChanges(id, adminNotes));
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={36} />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <button onClick={() => navigate("/offers")} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} />
          Back to Offers
        </button>
        <div className="mt-8 bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">Offer not found</div>
      </div>
    );
  }

  const analytics = {
    totalUses: offer.totalUses || offer.redemptionCount || 0,
    revenue: offer.totalRevenueGenerated || offer.revenueGenerated || 0,
    discount: offer.totalDiscountGiven || 0,
    conversionRate: offer.conversionRate || 0,
    redemptionRate: offer.redemptionRate || 0,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/80">
      <button onClick={() => navigate("/offers")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft size={18} />
        Back to Offers
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{offer.title}</h1>
            <StatusPill status={offer.lifecycleStatus} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{offer.offerCode || "No code"} · {OFFER_TYPE_LABELS[offer.offerType] || offer.discountType}</p>
        </div>
        {canReview && (
          <div className="w-full sm:w-auto sm:min-w-[360px]">
            {showChangeReason && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason for requested changes</label>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  placeholder="Enter what needs to be changed..."
                  className="w-full h-16 p-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-300"
                />
              </div>
            )}
            {showRejectReason && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason for rejection</label>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Enter reason before rejecting..."
                  className="w-full h-16 p-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-300"
                />
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={handleRequestChanges} disabled={actionLoading} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 disabled:opacity-50">
                <MessageSquare size={15} />
                Request Changes
              </button>
              <button onClick={handleReject} disabled={actionLoading} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50">
                <XCircle size={15} />
                Reject
              </button>
              <button onClick={handleApprove} disabled={actionLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Approve
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <InfoCard icon={Receipt} label="Total Uses" value={analytics.totalUses} color="bg-indigo-50 text-indigo-600" />
        <InfoCard icon={DollarSign} label="Revenue Generated" value={formatCurrency(analytics.revenue)} color="bg-emerald-50 text-emerald-600" />
        <InfoCard icon={Gift} label="Discount Given" value={formatCurrency(analytics.discount)} color="bg-pink-50 text-pink-600" />
        <InfoCard icon={TrendingUp} label="Conversion Rate" value={`${Number(analytics.conversionRate).toFixed(1)}%`} color="bg-blue-50 text-blue-600" />
        <InfoCard icon={Tag} label="Redemption Rate" value={`${Number(analytics.redemptionRate).toFixed(1)}%`} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <DetailBlock title="Offer Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KeyValue label="Offer Name" value={offer.title} />
              <KeyValue label="Offer Code" value={offer.offerCode} />
              <KeyValue label="Offer Type" value={OFFER_TYPE_LABELS[offer.offerType] || offer.discountType} />
              <KeyValue label="Discount Type" value={offer.discountType} />
              <KeyValue label="Discount Value" value={offer.discountType === "PERCENTAGE" ? `${offer.discountValue}%` : formatCurrency(offer.discountValue)} />
              <KeyValue label="Minimum Order" value={formatCurrency(offer.minOrderValue)} />
              <KeyValue label="Start Date" value={formatDate(offer.startDate)} />
              <KeyValue label="End Date" value={formatDate(offer.endDate)} />
              <KeyValue label="Created By" value={offer.createdByAdmin ? "Zenzio Admin" : "Restaurant Admin"} />
            </div>
            {offer.description && <p className="text-sm text-gray-600 mt-5 whitespace-pre-line">{offer.description}</p>}
          </DetailBlock>

          <DetailBlock title="Discount Logic">
            <DiscountLogicSummary offer={offer} />
          </DetailBlock>

          <DetailBlock title="Usage Statistics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KeyValue label="Redemption Count" value={analytics.totalUses} />
              <KeyValue label="Revenue Generated" value={formatCurrency(analytics.revenue)} />
              <KeyValue label="Total Discount Given" value={formatCurrency(analytics.discount)} />
              <KeyValue label="Conversion Rate" value={`${Number(analytics.conversionRate).toFixed(1)}%`} />
              <KeyValue label="Redemption Rate" value={`${Number(analytics.redemptionRate).toFixed(1)}%`} />
            </div>
          </DetailBlock>

          <DetailBlock title="Status Timeline">
            {Array.isArray(offer.statusTimeline) && offer.statusTimeline.length > 0 ? (
              <div className="space-y-3">
                {offer.statusTimeline.map((item, index) => (
                  <div key={`${item.status}-${index}`} className="flex gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{String(item.status || "").replaceAll("_", " ")}</p>
                      <p className="text-xs text-gray-400">{formatDate(item.at)} {item.actor ? `· ${item.actor}` : ""}</p>
                      {item.note && <p className="text-sm text-gray-600 mt-1">{item.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No timeline events recorded.</p>
            )}
          </DetailBlock>
        </div>

        <div className="space-y-6">
          <DetailBlock title="Visual Preview">
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              {imageUrl && !imageError ? (
                <img src={imageUrl} alt={offer.title} className="w-full h-56 object-cover" onError={() => setImageError(true)} />
              ) : (
                <div className="w-full h-56 flex items-center justify-center text-gray-300">
                  <Gift size={42} />
                </div>
              )}
            </div>
          </DetailBlock>

          <DetailBlock title="Restaurant Information">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Store size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{getRestaurantName(offer)}</p>
                  <p className="text-xs text-gray-400">{offer.restaurantId ? "Restaurant-specific offer" : "Platform-wide offer"}</p>
                </div>
              </div>
              <KeyValue label="Email" value={offer.restaurant?.profile?.contact_email || offer.restaurant?.contact?.email} />
              <KeyValue label="Phone" value={offer.restaurant?.profile?.contact_number || offer.restaurant?.contact?.phone} />
              <KeyValue label="Address" value={offer.restaurant?.address?.address_line_1 || offer.restaurant?.address?.city} />
            </div>
          </DetailBlock>

          <DetailBlock title="Terms">
            <p className="text-sm text-gray-600 whitespace-pre-line">{offer.termsConditions || "No terms and conditions specified."}</p>
          </DetailBlock>

          {!restaurantAdmin && (
            <DetailBlock title="Approval Notes">
              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder="Add approval comments or change requests..."
                className="w-full h-28 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
              />
              {(offer.rejectionReason || offer.adminComments) && (
                <div className="mt-4 space-y-2">
                  {offer.rejectionReason && <p className="text-sm text-red-600">Rejected: {offer.rejectionReason}</p>}
                  {offer.adminComments && <p className="text-sm text-blue-600">Notes: {offer.adminComments}</p>}
                </div>
              )}
            </DetailBlock>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferDetails;
