import { forwardRef } from 'react';

const InvoicePDF = forwardRef(({ invoice, landlord }, ref) => {
  if (!invoice) return null;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';
  const formatMonth = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
  const formatCurrency = (val) => `৳${Number(val || 0).toLocaleString()}`;

  return (
    <div ref={ref} style={{ padding: '40px', background: '#fff', color: '#000', fontFamily: 'sans-serif', fontSize: '14px', lineHeight: 1.5, width: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '28px' }}>
            {landlord?.company_name || 'BashaCare Property Management'}
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            {landlord?.contact_email && <span>{landlord.contact_email}<br/></span>}
            {landlord?.contact_phone && <span>{landlord.contact_phone}</span>}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px', letterSpacing: '2px' }}>INVOICE</h2>
          <p style={{ margin: '0 0 4px 0', color: '#475569' }}><strong>Invoice #:</strong> INV-{String(invoice.id).padStart(6, '0')}</p>
          <p style={{ margin: '0 0 4px 0', color: '#475569' }}><strong>Billing Month:</strong> {formatMonth(invoice.billing_month)}</p>
          <p style={{ margin: 0, color: '#475569' }}><strong>Date Issued:</strong> {formatDate(invoice.created_at)}</p>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Bill To</h3>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: '#0f172a' }}>{invoice.tenant_name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#475569' }}>Property: {invoice.property_name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#475569' }}>Unit: {invoice.unit_number}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Status</h3>
          <div style={{ 
            display: 'inline-block', 
            padding: '6px 12px', 
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '14px',
            backgroundColor: invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'OVERDUE' ? '#fee2e2' : '#fef9c3',
            color: invoice.status === 'PAID' ? '#166534' : invoice.status === 'OVERDUE' ? '#991b1b' : '#854d0e'
          }}>
            {invoice.status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>Description</th>
            <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 'bold' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '12px', color: '#0f172a' }}>Base Rent</td>
            <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(invoice.base_rent)}</td>
          </tr>
          {Number(invoice.utility_charges) > 0 && (
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', color: '#0f172a' }}>Utility Charges</td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(invoice.utility_charges)}</td>
            </tr>
          )}
          {Number(invoice.late_fee) > 0 && (
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', color: '#0f172a' }}>Late Fee</td>
              <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatCurrency(invoice.late_fee)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ color: '#475569' }}>Total Due</span>
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(invoice.total_calculated_due || invoice.amount_due)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #e2e8f0' }}>
            <span style={{ color: '#475569' }}>Amount Paid</span>
            <span style={{ color: '#10b981' }}>- {formatCurrency(invoice.amount_paid)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '18px', fontWeight: 'bold' }}>
            <span style={{ color: '#0f172a' }}>Balance Remaining</span>
            <span style={{ color: Number(invoice.balance_remaining) > 0 ? '#ef4444' : '#10b981' }}>
              {formatCurrency(invoice.balance_remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        <p style={{ margin: 0 }}>Thank you for your business!</p>
        <p style={{ margin: '4px 0 0 0' }}>This is a computer-generated document. No signature is required.</p>
      </div>

    </div>
  );
});

InvoicePDF.displayName = 'InvoicePDF';
export default InvoicePDF;
