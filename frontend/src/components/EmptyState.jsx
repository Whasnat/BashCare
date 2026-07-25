import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = PackageOpen, 
  title, 
  message, 
  actionLabel, 
  onAction 
}) {
  const { t } = useTranslation();
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-col items-center justify-center py-12 px-4"
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border)',
        textAlign: 'center',
        margin: '20px 0'
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--bg-hover)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', marginBottom: 16
      }}>
        <Icon size={32} />
      </div>
      
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        {title || t('common.noData')}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>
        {message}
      </p>
      
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
