// =============================================
// FILE: src/pages/auth/Login.jsx
// =============================================
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { adminLogin } from "../../services/api";
import logo from "../../assets/logoadmin.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const res = await adminLogin(email, password, role);

    const { status, data } = res.data;
    if (status !== "success" || !data?.user || !data?.accessToken) {
      throw new Error("Login failed");
    }

    // 🔑 SAVE TOKENS (THIS FIXES EVERYTHING)
    localStorage.setItem("access_token", data.accessToken);
    localStorage.setItem("refresh_token", data.refreshToken); // optional

    // 👤 SAVE USER INFO
    localStorage.setItem("adminId", data.user.id);
    localStorage.setItem("adminEmail", data.user.email);
    localStorage.setItem("adminRole", data.user.role);

    window.location.href = "/dashboard";
  } catch (err) {
    setError(
      err.response?.data?.message || err.message || "Invalid credentials"
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="flex min-h-screen bg-gray-100 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-8 text-center">
          <img src={logo} alt="Admin" className="mx-auto h-24" />
        </div>

        {error && (
          <div className="mb-4 p-3 text-red-600 bg-red-50 border rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mb-4 px-4 py-3 border rounded"
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="w-full mb-4 px-4 py-3 border rounded"
          >
            <option value="">Select Role</option>
            <option value="1">Super Admin</option>
            <option value="2">Admin</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-500 text-white rounded"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

// // =============================================
// // FILE: src/pages/auth/Login.jsx
// // =============================================
// import React, { useState } from 'react';
// import { Eye, EyeOff } from 'lucide-react';
// import { adminLogin } from '../../services/api';

// const Login = ({ onLogin }) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       const response = await adminLogin(email, password);
//       localStorage.setItem('adminId', response.data.adminId);
//       localStorage.setItem('adminEmail', response.data.email);
//       onLogin();
//     } catch (err) {
//       setError(err.response?.data?.error || 'Invalid email or password');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//       <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
//         <div className="text-center mb-8">
//           <h1 className="text-4xl font-bold">
//             <span className="text-red-500">Z</span>
//             <span className="text-yellow-500">enzio</span>
//           </h1>
//         </div>

//         <h2 className="text-2xl font-semibold text-gray-800 text-center mb-6">
//           Admin Login
//         </h2>

//         {error && (
//           <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <input
//               type="email"
//               placeholder="Enter admin email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
//             />
//           </div>

//           <div className="mb-2 relative">
//             <input
//               type={showPassword ? 'text' : 'password'}
//               placeholder="Enter password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pr-12"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
//             >
//               {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//             </button>
//           </div>

//           <div className="text-right mb-6">
//             <button type="button" className="text-sm text-red-500 hover:text-red-600 font-medium">
//               Forgot Password...
//             </button>
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-md transition disabled:opacity-50"
//           >
//             {loading ? 'Logging in...' : 'Login'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default Login;
