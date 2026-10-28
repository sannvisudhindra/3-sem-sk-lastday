import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (config.email.mode === 'smtp' && !transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpPort === 465,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass,
      },
    });
  }
  return transporter;
}

/**
 * Sends or logs an email according to EMAIL_MODE.
 */
async function sendMail({ to, subject, text, html }) {
  if (config.email.mode === 'smtp') {
    const t = getTransporter();
    if (!t) {
      console.warn('[Mailer] SMTP requested but transporter not configured.');
      return;
    }
    return t.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html,
    });
  }

  // Console Mode (default for local & dev)
  console.log('\n================== [MAILER CONSOLE] ==================');
  console.log(`To:      ${to}`);
  console.log(`From:    ${config.email.from}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------------------------');
  console.log(text || html);
  console.log('======================================================\n');
}

/**
 * Sends OTP email for Net Banking verification.
 */
export async function sendOtpEmail({ to, otp, eventTitle }) {
  const subject = `🔐 Your Encore Verification Code: ${otp}`;
  const text = `Your 6-digit verification code for "${eventTitle || 'Ticket Booking'}" is:\n\n${otp}\n\nThis code expires in 60 seconds. Do not share it with anyone.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #07080f; color: #f5f6fa; border-radius: 12px;">
      <h2 style="color: #ff5e62;">Encore Verification Code</h2>
      <p>You are authorizing a ticket purchase for <strong>${eventTitle || 'an event'}</strong>.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px; background: #0e1020; border-radius: 8px; color: #ffd166; text-align: center; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #9ba1b8; font-size: 14px;">This code expires in 60 seconds. If you did not request this, please ignore this email.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
}

/**
 * Sends UPI QR / Remote approval payment link email.
 */
export async function sendPaymentLinkEmail({ to, link, eventTitle, amountPaise }) {
  const formattedAmount = `₹${(amountPaise / 100).toLocaleString('en-IN')}`;
  const subject = `💳 Complete your payment for ${eventTitle || 'Encore Tickets'}`;
  const text = `Click the link below to approve your payment of ${formattedAmount} for ${eventTitle}:\n\n${link}\n\nThis link expires in 60 seconds.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; background: #07080f; color: #f5f6fa; border-radius: 12px;">
      <h2 style="color: #14d3b5;">Approve Your Payment</h2>
      <p>Amount to pay: <strong>${formattedAmount}</strong> for <strong>${eventTitle || 'Encore Booking'}</strong>.</p>
      <div style="margin: 25px 0;">
        <a href="${link}" style="background: linear-gradient(135deg, #ff5e62, #ff9f43); color: #1a0f0a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">
          Approve Payment (${formattedAmount})
        </a>
      </div>
      <p style="color: #9ba1b8; font-size: 13px;">Or open this link directly: <a href="${link}" style="color: #3b82f6;">${link}</a></p>
      <p style="color: #9ba1b8; font-size: 12px;">This link will expire in 60 seconds.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
}

/**
 * Sends Ticket Confirmation email with ticket code and details (PRD §9.4).
 */
export async function sendTicketEmail({ to, booking }) {
  const eventTitle = booking.event?.title || 'Your Event';
  const totalPaid = `₹${((booking.totalPaise || 0) / 100).toLocaleString('en-IN')}`;
  const subject = `🎟️ Your Encore tickets: ${eventTitle}`;
  const seatsList = (booking.items || [])
    .map((item) => `${item.label || item.sectionName || 'General'} (Qty: ${item.qty})`)
    .join(', ');

  const text = `Your booking for ${eventTitle} is confirmed!\n\nTicket Code: ${booking.ticketCode}\nTotal: ${totalPaid}\nSeats: ${seatsList}\n\nShow this code at the venue. Enjoy the show!`;
  const html = `
    <div style="font-family: sans-serif; padding: 24px; background: #07080f; color: #f5f6fa; border-radius: 14px; max-width: 600px;">
      <h1 style="color: #ff5e62; margin-top: 0;">Booking Confirmed! 🎉</h1>
      <p style="font-size: 16px;">Get ready for <strong>${eventTitle}</strong>.</p>
      
      <div style="background: #0e1020; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #9ba1b8;">TICKET CODE</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #ffd166; margin: 0 0 15px 0;">${booking.ticketCode}</p>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 15px 0;" />
        <p style="margin: 5px 0;"><strong>Seats:</strong> ${seatsList}</p>
        <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${totalPaid}</p>
        ${booking.event?.venue?.name ? `<p style="margin: 5px 0;"><strong>Venue:</strong> ${booking.event.venue.name}</p>` : ''}
      </div>

      <p style="color: #9ba1b8; font-size: 14px;">Please present this ticket code or QR code at entry.</p>
    </div>
  `;
  return sendMail({ to, subject, text, html });
}
