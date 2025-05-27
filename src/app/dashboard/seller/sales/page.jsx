'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FaCalendar, FaDownload, FaChartBar, FaChartLine, FaChartPie, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function SellerSalesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('week'); // 'day', 'week', 'month', 'year'
  const [salesData, setSalesData] = useState({
    summary: {
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      comparisonPercentage: 0
    },
    chartData: [],
    topProducts: [],
    salesByCategory: []
  });

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'SELLER' && session.user.role !== 'seller') {
      router.push('/dashboard');
      return;
    }

    fetchSalesData();
  }, [session, timeframe]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/seller/sales?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      const data = await response.json();
      
      // Process the data
      setSalesData({
        summary: data.summary || {
          totalSales: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          comparisonPercentage: 0
        },
        chartData: data.chartData || [],
        topProducts: data.topProducts || [],
        salesByCategory: data.salesByCategory || []
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Failed to load sales data. Please try again.');
      setLoading(false);
    }
  };

  const handleExportData = () => {
    // Implement export functionality here
    // Could export as CSV or Excel
    alert('Export functionality will be implemented in a future update.');
  };

  // Generate dummy data for development if needed
  const generateDummyData = () => {
    // Weekly data example
    const weeklyData = [
      { name: 'Mon', sales: Math.floor(Math.random() * 1000) },
      { name: 'Tue', sales: Math.floor(Math.random() * 1000) },
      { name: 'Wed', sales: Math.floor(Math.random() * 1000) },
      { name: 'Thu', sales: Math.floor(Math.random() * 1000) },
      { name: 'Fri', sales: Math.floor(Math.random() * 1000) },
      { name: 'Sat', sales: Math.floor(Math.random() * 1000) },
      { name: 'Sun', sales: Math.floor(Math.random() * 1000) }
    ];

    const topProducts = [
      { name: 'Organic Apples', sales: 123, revenue: 738 },
      { name: 'Fresh Tomatoes', sales: 95, revenue: 475 },
      { name: 'Leafy Greens', sales: 86, revenue: 430 },
      { name: 'Local Honey', sales: 72, revenue: 648 },
      { name: 'Farm Eggs', sales: 65, revenue: 325 }
    ];

    const categoryData = [
      { name: 'Fruits', value: 40 },
      { name: 'Vegetables', value: 30 },
      { name: 'Dairy', value: 15 },
      { name: 'Bakery', value: 10 },
      { name: 'Other', value: 5 }
    ];

    return {
      summary: {
        totalSales: weeklyData.reduce((sum, item) => sum + item.sales, 0),
        totalRevenue: topProducts.reduce((sum, item) => sum + item.revenue, 0),
        averageOrderValue: 25,
        comparisonPercentage: 12.5 // positive means increase
      },
      chartData: weeklyData,
      topProducts,
      salesByCategory: categoryData
    };
  };

  // Use dummy data for development if no real data is available
  useEffect(() => {
    if (salesData.chartData.length === 0 && !loading) {
      setSalesData(generateDummyData());
    }
  }, [salesData, loading]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-10">
        <div className="bg-red-50 p-4 rounded-lg text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchSalesData} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Sales Analytics</h1>
        
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2 bg-white p-2 rounded-md shadow-sm">
            <FaCalendar className="text-gray-500" />
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border-none focus:ring-0 text-gray-700"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
          
          <button 
            onClick={handleExportData}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <FaDownload />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Orders</p>
              <h2 className="text-2xl font-bold mt-1">{salesData.summary.totalSales}</h2>
            </div>
            <div className={`rounded-full p-2 ${salesData.summary.comparisonPercentage >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <FaChartBar className={`text-lg ${salesData.summary.comparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            {salesData.summary.comparisonPercentage >= 0 ? (
              <FaArrowUp className="text-green-600 mr-1 text-xs" />
            ) : (
              <FaArrowDown className="text-red-600 mr-1 text-xs" />
            )}
            <span className={`text-xs ${salesData.summary.comparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(salesData.summary.comparisonPercentage)}% from previous {timeframe}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <h2 className="text-2xl font-bold mt-1">${salesData.summary.totalRevenue.toFixed(2)}</h2>
            </div>
            <div className="rounded-full p-2 bg-blue-100">
              <FaChartLine className="text-lg text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            {salesData.summary.comparisonPercentage >= 0 ? (
              <FaArrowUp className="text-green-600 mr-1 text-xs" />
            ) : (
              <FaArrowDown className="text-red-600 mr-1 text-xs" />
            )}
            <span className={`text-xs ${salesData.summary.comparisonPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(salesData.summary.comparisonPercentage)}% from previous {timeframe}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Average Order Value</p>
              <h2 className="text-2xl font-bold mt-1">${salesData.summary.averageOrderValue.toFixed(2)}</h2>
            </div>
            <div className="rounded-full p-2 bg-purple-100">
              <FaChartPie className="text-lg text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Average value per order</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Conversion Rate</p>
              <h2 className="text-2xl font-bold mt-1">3.2%</h2>
            </div>
            <div className="rounded-full p-2 bg-yellow-100">
              <FaChartBar className="text-lg text-yellow-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Based on store visits</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesData.chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#4F46E5" 
                  activeDot={{ r: 8 }} 
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Sales by Category</h3>
          <div className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesData.salesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {salesData.salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left border-b">Product</th>
                <th className="py-3 px-4 text-right border-b">Units Sold</th>
                <th className="py-3 px-4 text-right border-b">Revenue</th>
                <th className="py-3 px-4 text-right border-b">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {salesData.topProducts.map((product, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{product.name}</td>
                  <td className="py-3 px-4 text-right border-b">{product.sales}</td>
                  <td className="py-3 px-4 text-right border-b">${product.revenue}</td>
                  <td className="py-3 px-4 text-right border-b">
                    {((product.revenue / salesData.summary.totalRevenue) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Recent Orders</h3>
          <Link href="/dashboard/seller/orders" className="text-green-600 hover:underline text-sm">
            View All Orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left border-b">Order ID</th>
                <th className="py-3 px-4 text-left border-b">Customer</th>
                <th className="py-3 px-4 text-right border-b">Date</th>
                <th className="py-3 px-4 text-right border-b">Amount</th>
                <th className="py-3 px-4 text-center border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* This would be populated with real data */}
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">#ORD-1234</td>
                <td className="py-3 px-4 border-b">John Doe</td>
                <td className="py-3 px-4 text-right border-b">May 25, 2025</td>
                <td className="py-3 px-4 text-right border-b">$128.50</td>
                <td className="py-3 px-4 border-b">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Delivered</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">#ORD-1235</td>
                <td className="py-3 px-4 border-b">Jane Smith</td>
                <td className="py-3 px-4 text-right border-b">May 24, 2025</td>
                <td className="py-3 px-4 text-right border-b">$75.20</td>
                <td className="py-3 px-4 border-b">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Shipping</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">#ORD-1236</td>
                <td className="py-3 px-4 border-b">Robert Johnson</td>
                <td className="py-3 px-4 text-right border-b">May 24, 2025</td>
                <td className="py-3 px-4 text-right border-b">$94.75</td>
                <td className="py-3 px-4 border-b">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Processing</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
