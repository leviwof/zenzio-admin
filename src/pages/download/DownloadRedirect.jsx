import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.zenzio.user";
const APP_STORE_URL  = "https://apps.apple.com/app/id6757667198";
const WEBSITE_URL    = "https://zenzio.in";
const API_BASE       = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "";

function detectDevice() {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return { deviceType: "android", redirectTarget: "playstore", url: PLAY_STORE_URL };
  if (/iphone|ipad|ipod/i.test(ua)) return { deviceType: "ios", redirectTarget: "appstore", url: APP_STORE_URL };
  return { deviceType: "desktop", redirectTarget: "website", url: WEBSITE_URL };
}

export default function DownloadRedirect() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source") || "direct";
  const [countdown, setCountdown] = useState(1);
  const tracked = useRef(false);

  const device = detectDevice();

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    // Fire tracking — don't await, never block redirect
    fetch(`${API_BASE}/download/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        deviceType: device.deviceType,
        redirectTarget: device.redirectTarget,
      }),
    }).catch(() => {});

    const timer = setTimeout(() => {
      window.location.href = device.url;
    }, 1000);

    const tick = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white text-3xl font-bold">Z</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Zenzio</h1>
        <p className="text-gray-500 text-sm mt-1">Food Delivery</p>
      </div>

      {/* Redirect message */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm text-center mb-6">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-800 font-semibold text-lg">Redirecting to Zenzio App…</p>
        <p className="text-gray-400 text-sm mt-1">
          {countdown > 0 ? `Opening in ${countdown}s` : "Opening…"}
        </p>
        <p className="text-gray-400 text-xs mt-3">
          {device.deviceType === "android" && "Taking you to Google Play Store"}
          {device.deviceType === "ios" && "Taking you to Apple App Store"}
          {device.deviceType === "desktop" && "Taking you to our website"}
        </p>
      </div>

      {/* Fallback buttons */}
      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-xs text-gray-400 mb-1">Not redirecting? Open manually:</p>

        <a
          href={PLAY_STORE_URL}
          className="flex items-center gap-3 w-full bg-gray-900 text-white rounded-xl px-5 py-3.5 hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
            <path d="M3.18 23.76c.3.17.64.24.98.2l12.45-11.96-2.79-2.79L3.18 23.76zm16.87-10.41L17.3 11.7l-2.96 2.96 2.94 2.94c.54.38 1.27.2 1.62-.37l.15-.35c.25-.74.1-1.56-.6-2.33l-.6-.2zM2.1.24C1.87.5 1.74.87 1.74 1.34v21.33c0 .47.13.84.36 1.09l.08.07L13.25 12.8v-.28L2.18.17l-.08.07zm11.16 11.27l3.24-3.24L4.04.37C3.73.2 3.39.13 3.06.17L13.26 11.51z" />
          </svg>
          <div className="text-left">
            <p className="text-[10px] text-gray-300 leading-none">Download on</p>
            <p className="text-sm font-semibold leading-tight">Google Play</p>
          </div>
        </a>

        <a
          href={APP_STORE_URL}
          className="flex items-center gap-3 w-full bg-gray-900 text-white rounded-xl px-5 py-3.5 hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          <div className="text-left">
            <p className="text-[10px] text-gray-300 leading-none">Download on the</p>
            <p className="text-sm font-semibold leading-tight">App Store</p>
          </div>
        </a>

        <a
          href={WEBSITE_URL}
          className="flex items-center justify-center gap-2 w-full border border-gray-200 text-gray-600 rounded-xl px-5 py-3 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Visit Website
        </a>
      </div>

      <p className="text-gray-300 text-xs mt-8">© {new Date().getFullYear()} Zenzio. All rights reserved.</p>
    </div>
  );
}
