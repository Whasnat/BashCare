import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/activity-logs/admin/all');
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">Loading activity logs...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="admin-activity-log bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">System Activity Audit</h2>
        <button onClick={fetchLogs} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-4 text-center text-gray-500">No activity logs found.</td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {log.impersonator_id ? (
                    <span className="flex items-center gap-1 text-orange-600" title={`Impersonated by ${log.impersonator_name}`}>
                      ⚠️ {log.impersonator_name} (as {log.user_name})
                    </span>
                  ) : (
                    log.user_name || log.username || 'System'
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{log.company_name || 'N/A'}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded font-mono">
                    {log.entity_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${
                    log.action === 'CREATED' ? 'bg-green-100 text-green-800' :
                    log.action === 'DELETED' ? 'bg-red-100 text-red-800' :
                    log.action === 'UPDATED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-xs" title={log.description}>
                  {log.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
