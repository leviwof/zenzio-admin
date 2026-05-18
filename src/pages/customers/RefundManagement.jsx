import React from 'react';
import { Gift } from 'lucide-react';

const RefundManagement = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
        <Gift className="text-gray-400" size={36} />
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Refund Management
      </h3>

      <p className="text-sm text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
        Refund management is coming soon. You'll be able to review, approve, and process customer refund requests here.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">In Development</span>
      </div>
    </div>
  );
};

export default RefundManagement;
