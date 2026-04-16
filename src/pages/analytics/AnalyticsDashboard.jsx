import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getAdminAnalytics } from '../../services/api';

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('last7days');
  const [salesReport, setSalesReport] = useState('');
  const [loading, setLoading] = useState(true);

  // Metrics State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);

  // Data Arrays
  const [dailySalesData, setDailySalesData] = useState([]);
  const [topRestaurantsData, setTopRestaurantsData] = useState([]);
  const [orderSourceData, setOrderSourceData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAdminAnalytics(dateRange);
      const data = res.data;

      setTotalRevenue(data.totalRevenue);
      setTotalOrders(data.totalOrders);
      setAvgOrderValue(data.avgOrderValue);
      setActiveCustomers(data.activeCustomers);
      setDailySalesData(data.dailySalesData);
      setTopRestaurantsData(data.topRestaurantsData);
      setOrderSourceData(data.orderSourceData);
      setCategoryData(data.categoryData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthColor = (growth) => {
    return growth && growth.startsWith('+') ? 'text-green-600' : 'text-red-600';
  };

  const getGrowthIcon = (growth) => {
    return growth && growth.startsWith('+') ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">Analytics & Reports</h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Admin</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thismonth">This Month</option>
            </select>

            <button
              onClick={() => {
                if (!categoryData.length && !dailySalesData.length) {
                  alert("No data to export");
                  return;
                }
                const csvContent = [
                  ["Date", "Sales"],
                  ...dailySalesData.map(d => [d.day, d.sales]),
                  [],
                  ["Category", "Orders", "Revenue", "Avg Order"],
                  ...categoryData.map(c => [c.category, c.orders, c.revenue, c.avgOrder])
                ].map(e => e.join(",")).join("\n");

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "analytics_report.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-red-600 transition-colors">
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">-</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Orders</div>
            <div className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">-</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Average Order Value</div>
            <div className="text-2xl font-bold text-gray-900">₹{avgOrderValue.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">-</div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Active Customers</div>
            <div className="text-2xl font-bold text-gray-900">{activeCustomers.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">-</div>
          </div>
        </div>

        {/* Daily Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales</h2>
          {dailySalesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No sales data available for the selected period.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Sales (₹)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-gray-600">
                Total Revenue: <span className="font-semibold text-gray-900">₹{totalRevenue.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top 5 Restaurants */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Restaurants by Sales</h2>
            {topRestaurantsData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-500">
                No restaurant data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topRestaurantsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="revenue" fill="#EF4444" name="Revenue (₹)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order Source Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Source Breakdown</h2>
            {orderSourceData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-gray-500">
                No order source data available.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={orderSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {orderSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {orderSourceData.map((source, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                      <span className="text-sm text-gray-600">{source.name}: {source.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sales by Category Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sales by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No category data available.
                    </td>
                  </tr>
                ) : (
                  categoryData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.orders.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{item.revenue}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{item.avgOrder}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-medium ${getGrowthColor(item.growth)}`}>
                          {getGrowthIcon(item.growth)}
                          {item.growth}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;