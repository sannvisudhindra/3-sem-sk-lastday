import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME || `api-${Math.random().toString(36).substring(2, 7)}`,

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },

  email: {
    mode: process.env.EMAIL_MODE || 'console',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'tickets@encore.test',
  },

  business: {
    holdSeconds: parseInt(process.env.HOLD_SECONDS || '180', 10),
    paymentSeconds: parseInt(process.env.PAYMENT_SECONDS || '60', 10),
    maxTicketsPerUser: parseInt(process.env.MAX_TICKETS_PER_USER || '10', 10),
    maxPaymentAttempts: parseInt(process.env.MAX_PAYMENT_ATTEMPTS || '3', 10),
    maxOtpAttempts: parseInt(process.env.MAX_OTP_ATTEMPTS || '3', 10),
    queueMaxActive: parseInt(process.env.QUEUE_MAX_ACTIVE || '100', 10),
    queueAdmissionSeconds: parseInt(process.env.QUEUE_ADMISSION_SECONDS || '300', 10),
    venueTurnoverMinutes: parseInt(process.env.VENUE_TURNOVER_MINUTES || '180', 10),
  },
};

