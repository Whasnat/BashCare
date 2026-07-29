import React from 'react';
import AdminActivityLog from '../../components/AdminActivityLog';

export default function AdminActivity() {
  return (
    <div className="admin-activity-page">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Platform Activity Log</h1>
          <p className="page-subtitle">Comprehensive audit trail of all system activities</p>
        </div>
      </div>
      
      <AdminActivityLog />
    </div>
  );
}
