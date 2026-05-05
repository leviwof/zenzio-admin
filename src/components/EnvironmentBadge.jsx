import React from 'react';

const EnvironmentBadge = () => {
  const env = import.meta.env.VITE_ENV;

  // Don't show badge in production
  if (env === 'production' || !env) return null;

  const config = {
    development: {
      color: 'bg-blue-500',
      label: 'DEV',
      apiUrl: import.meta.env.VITE_API_BASE_URL
    },
    uat: {
      color: 'bg-yellow-500',
      label: 'UAT',
      apiUrl: import.meta.env.VITE_API_BASE_URL
    }
  };

  const { color, label, apiUrl } = config[env] || {};

  if (!color) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 ${color} text-white px-3 py-2 rounded-lg shadow-lg text-xs font-bold uppercase z-50 cursor-help`}
      title={`Environment: ${env}\nAPI: ${apiUrl}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
        {label}
      </div>
    </div>
  );
};

export default EnvironmentBadge;
