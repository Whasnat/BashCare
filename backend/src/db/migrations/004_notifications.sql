-- 004_notifications.sql

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'PAYMENT_CONFIRMED', 'INVOICE_GENERATED', 'OVERDUE_WARNING', 'PAYMENT_REJECTED'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  reference_id UUID, -- Optional ID linking to an invoice, payment, or lease
  reference_type VARCHAR(50), -- e.g., 'invoice', 'payment'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries on a user's notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);


