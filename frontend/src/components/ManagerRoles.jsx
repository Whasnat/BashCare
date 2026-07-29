import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PERMISSION_CATEGORIES = {
  PropertyAccess: [{ key: 'PROPERTY_VIEW', label: 'View Property Dashboard' }],
  ModuleRoles: [
    { key: 'UNIT_MANAGER', label: 'Unit Manager' },
    { key: 'OCCUPANT_MANAGER', label: 'Occupant Manager' },
    { key: 'AGREEMENT_MANAGER', label: 'Agreement Manager' },
    { key: 'BILLING_MANAGER', label: 'Billing Manager' },
    { key: 'PAYMENT_MANAGER', label: 'Payment Manager' },
    { key: 'MAINTENANCE_MANAGER', label: 'Maintenance Manager' },
    { key: 'UTILITY_MANAGER', label: 'Utility Manager' }
  ],
  Reports: [
    { key: 'REPORT_VIEWER', label: 'Report Viewer' },
    { key: 'ACTIVITY_VIEWER', label: 'Activity Viewer' }
  ]
};

export default function ManagerRoles({ userId, propertyId, initialPermissions = [], onSave }) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPermissions(initialPermissions);
  }, [initialPermissions]);

  const handleToggle = (key) => {
    setPermissions(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/managers/${userId}/permissions`, {
        property_id: propertyId,
        permissions
      });
      if (onSave) onSave(permissions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manager-roles bg-white p-6 rounded shadow border">
      <h3 className="text-xl font-bold mb-4">Assign Module Permissions</h3>
      {error && <div className="text-red-500 mb-4 text-sm font-medium">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
          <div key={category}>
            <h4 className="font-semibold text-gray-700 mb-2">{category.replace(/([A-Z])/g, ' $1').trim()}</h4>
            <div className="flex flex-col gap-2">
              {perms.map(perm => (
                <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={permissions.includes(perm.key)}
                    onChange={() => handleToggle(perm.key)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-800">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}
