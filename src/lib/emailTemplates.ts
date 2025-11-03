interface Hotel {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

const getEmailHeader = () => `<div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;"><div style="font-family: 'Batangas', 'Georgia', serif; font-size: 48px; font-weight: 700; color: white; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">WIXOTEL</div><div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-top: 8px; letter-spacing: 1px;">Premium Hotel Management Platform</div></div>`;

const getEmailFooter = (hotel: Hotel) => {
  const contactInfo = [];
  if (hotel.email) contactInfo.push(`📧 ${hotel.email}`);
  if (hotel.phone) contactInfo.push(`📞 ${hotel.phone}`);
  
  const addressParts = [];
  if (hotel.address) addressParts.push(hotel.address);
  if (hotel.city) addressParts.push(hotel.city);
  if (hotel.country) addressParts.push(hotel.country);
  const fullAddress = addressParts.join(', ');

  return `<div style="background-color: #f8fafc; padding: 30px 20px; margin-top: 40px; border-top: 3px solid #3b82f6;"><div style="max-width: 600px; margin: 0 auto;"><div style="text-align: center; margin-bottom: 20px;"><h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 20px; font-weight: 600;">${hotel.name}</h3>${fullAddress ? `<p style="color: #64748b; margin: 5px 0; font-size: 14px;">📍 ${fullAddress}</p>` : ''}</div>${contactInfo.length > 0 ? `<div style="text-align: center; margin: 15px 0; padding: 15px; background: white; border-radius: 8px;">${contactInfo.map(info => `<p style="color: #475569; margin: 8px 0; font-size: 14px;">${info}</p>`).join('')}</div>` : ''}<div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;"><p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">Powered by <span style="font-family: 'Batangas', 'Georgia', serif; font-weight: 700; color: #3b82f6;">WIXOTEL</span></p><p style="color: #cbd5e1; font-size: 11px; margin: 5px 0;">© ${new Date().getFullYear()} All rights reserved</p></div></div></div>`;
};

const getBaseEmailTemplate = (content: string, hotel: Hotel) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');body{margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#f1f5f9;}@media only screen and (max-width:600px){.email-container{width:100%!important;}.content-padding{padding:30px 20px!important;}.header-title{font-size:36px!important;}.section-title{font-size:20px!important;}.detail-table td{display:block!important;text-align:left!important;padding:8px 0!important;}.detail-table td:first-child{font-weight:600!important;}.detail-table td:last-child{padding-bottom:12px!important;}}</style></head><body style="margin:0;padding:0;background-color:#f1f5f9;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:20px 10px;"><tr><td align="center"><table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);max-width:600px;width:100%;"><tr><td>${getEmailHeader()}</td></tr><tr><td class="content-padding" style="padding:40px 30px;">${content}</td></tr><tr><td>${getEmailFooter(hotel)}</td></tr></table></td></tr></table></body></html>`;

export const createBookingConfirmationEmail = (params: {
  guestName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  confirmationNumber: string;
  hotel: Hotel;
}) => {
  const content = `<div style="text-align:center;margin-bottom:30px;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:12px 24px;border-radius:50px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(16,185,129,0.3);">✓ Booking Confirmed</div></div><h2 class="section-title" style="color:#1e293b;margin:0 0 10px 0;font-size:24px;">Dear ${params.guestName},</h2><p style="color:#64748b;line-height:1.6;font-size:16px;margin:0 0 25px 0;">Thank you for choosing <strong style="color:#3b82f6;">${params.hotel.name}</strong>! We're delighted to confirm your reservation.</p><div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);padding:20px;border-radius:8px;border:2px solid #10b981;margin:25px 0;text-align:center;"><p style="color:#166534;margin:0 0 8px 0;font-size:14px;font-weight:600;">Your Confirmation Number</p><p style="color:#1e293b;margin:0;font-size:24px;font-weight:700;font-family:monospace;letter-spacing:2px;">${params.confirmationNumber}</p><p style="color:#166534;margin:8px 0 0 0;font-size:12px;">Save this number for check-in and review submission</p></div><div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;"><h3 style="color:#1e40af;margin:0 0 15px 0;font-size:18px;">Reservation Details</h3><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">🏨 Room:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.roomName}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-in:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkIn}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-out:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkOut}</td></tr><tr style="border-top:2px solid #3b82f6;"><td style="padding:15px 0;color:#1e40af;font-weight:700;font-size:16px;">💰 Total Amount:</td><td style="padding:15px 0;color:#1e40af;text-align:right;font-weight:700;font-size:18px;">€${params.totalAmount}</td></tr></table></div><p style="color:#64748b;line-height:1.6;font-size:15px;margin:25px 0;">We look forward to welcoming you and making your stay memorable! If you have any special requests or questions, please don't hesitate to contact us.</p><div style="text-align:center;margin-top:30px;padding:20px;background-color:#fef3c7;border-radius:8px;"><p style="color:#92400e;margin:0;font-size:14px;">💡 <strong>Tip:</strong> Save this email and your confirmation number for your records.</p></div>`;

  return getBaseEmailTemplate(content, params.hotel);
};

export const createLeadApprovedEmail = (params: {
  guestName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalAmount: number;
  hotel: Hotel;
}) => {
  const content = `<div style="text-align:center;margin-bottom:30px;"><div style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:12px 24px;border-radius:50px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(16,185,129,0.3);">✓ Request Approved</div></div><h2 class="section-title" style="color:#1e293b;margin:0 0 10px 0;font-size:24px;">Great News, ${params.guestName}!</h2><p style="color:#64748b;line-height:1.6;font-size:16px;margin:0 0 25px 0;">Your booking request at <strong style="color:#3b82f6;">${params.hotel.name}</strong> has been approved! We're excited to host you.</p><div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;"><h3 style="color:#1e40af;margin:0 0 15px 0;font-size:18px;">Booking Details</h3><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">🏨 Room:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.roomName}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-in:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkIn}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-out:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkOut}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">🌙 Nights:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.nights}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">👥 Guests:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guests}</td></tr><tr style="border-top:2px solid #3b82f6;"><td style="padding:15px 0;color:#1e40af;font-weight:700;font-size:16px;">💰 Total Amount:</td><td style="padding:15px 0;color:#1e40af;text-align:right;font-weight:700;font-size:18px;">€${params.totalAmount.toFixed(2)}</td></tr></table></div><p style="color:#64748b;line-height:1.6;font-size:15px;margin:25px 0;">We're looking forward to welcoming you! If you have any questions or special requirements, please feel free to contact us.</p><div style="text-align:center;margin-top:30px;"><p style="color:#475569;font-size:14px;margin:0;">See you soon! 🎉</p></div>`;

  return getBaseEmailTemplate(content, params.hotel);
};

export const createLeadRejectedEmail = (params: {
  guestName: string;
  checkIn: string;
  checkOut: string;
  hotel: Hotel;
}) => {
  const content = `<div style="text-align:center;margin-bottom:30px;"><div style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:12px 24px;border-radius:50px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(245,158,11,0.3);">Booking Update</div></div><h2 class="section-title" style="color:#1e293b;margin:0 0 10px 0;font-size:24px;">Dear ${params.guestName},</h2><p style="color:#64748b;line-height:1.6;font-size:16px;margin:0 0 25px 0;">Thank you for your interest in <strong style="color:#3b82f6;">${params.hotel.name}</strong>.</p><p style="color:#64748b;line-height:1.6;font-size:15px;margin:0 0 20px 0;">Unfortunately, we are unable to accommodate your booking request for the following dates:</p><div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-left:4px solid #f59e0b;padding:20px;border-radius:8px;margin:20px 0;"><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#92400e;font-weight:600;font-size:15px;">📅 Check-in:</td><td style="padding:8px 0;color:#78350f;text-align:right;font-size:15px;">${params.checkIn}</td></tr><tr><td style="padding:8px 0;color:#92400e;font-weight:600;font-size:15px;">📅 Check-out:</td><td style="padding:8px 0;color:#78350f;text-align:right;font-size:15px;">${params.checkOut}</td></tr></table></div><p style="color:#64748b;line-height:1.6;font-size:15px;margin:20px 0;">This could be due to availability constraints or other factors. However, we'd love to help you find alternative options:</p><div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:20px 0;"><ul style="color:#475569;line-height:1.8;margin:0;padding-left:20px;"><li>Try different dates for your stay</li><li>Contact us directly to discuss alternatives</li><li>Check our availability for nearby dates</li></ul></div><p style="color:#64748b;line-height:1.6;font-size:15px;margin:25px 0;">We hope to have the opportunity to serve you in the future and appreciate your understanding.</p><div style="text-align:center;margin-top:30px;"><p style="color:#475569;font-size:14px;margin:0;">Thank you for considering us! 🙏</p></div>`;

  return getBaseEmailTemplate(content, params.hotel);
};

export const createLeadConfirmationEmail = (params: {
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  hotel: Hotel;
}) => {
  const content = `<div style="text-align:center;margin-bottom:30px;"><div style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:12px 24px;border-radius:50px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(59,130,246,0.3);">Request Received</div></div><h2 class="section-title" style="color:#1e293b;margin:0 0 10px 0;font-size:24px;">Dear ${params.guestName},</h2><p style="color:#64748b;line-height:1.6;font-size:16px;margin:0 0 25px 0;">Thank you for your booking inquiry at <strong style="color:#3b82f6;">${params.hotel.name}</strong>!</p><p style="color:#64748b;line-height:1.6;font-size:15px;margin:0 0 20px 0;">We have received your request with the following details:</p><div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;"><h3 style="color:#1e40af;margin:0 0 15px 0;font-size:18px;">Request Details</h3><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-in:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkIn}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-out:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkOut}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">👥 Guests:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guests}</td></tr></table></div><div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);padding:20px;border-radius:8px;border:1px solid #86efac;margin:25px 0;"><p style="color:#166534;margin:0;font-size:15px;line-height:1.6;"><strong>⏱️ What's Next?</strong><br>Our team will review your request and get back to you shortly with confirmation and additional details.</p></div><p style="color:#64748b;line-height:1.6;font-size:15px;margin:25px 0;">If you have any immediate questions or special requests, please don't hesitate to contact us directly.</p><div style="text-align:center;margin-top:30px;"><p style="color:#475569;font-size:14px;margin:0;">Thank you for choosing us! 🌟</p></div>`;

  return getBaseEmailTemplate(content, params.hotel);
};

export const createHotelNotificationEmail = (params: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
  hotel: Hotel;
}) => {
  const content = `<div style="text-align:center;margin-bottom:30px;"><div style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);color:white;padding:12px 24px;border-radius:50px;font-size:18px;font-weight:600;box-shadow:0 4px 12px rgba(139,92,246,0.3);">🔔 New Booking Request</div></div><h2 class="section-title" style="color:#1e293b;margin:0 0 10px 0;font-size:24px;">New Inquiry Received</h2><p style="color:#64748b;line-height:1.6;font-size:16px;margin:0 0 25px 0;">You have received a new booking request. Please review the details below and respond promptly.</p><div style="background:linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%);border-left:4px solid #8b5cf6;padding:25px;border-radius:8px;margin:25px 0;"><h3 style="color:#6b21a8;margin:0 0 15px 0;font-size:18px;">Guest Information</h3><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">👤 Name:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guestName}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📧 Email:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guestEmail}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📞 Phone:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guestPhone}</td></tr></table></div><div style="background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border-left:4px solid #3b82f6;padding:25px;border-radius:8px;margin:25px 0;"><h3 style="color:#1e40af;margin:0 0 15px 0;font-size:18px;">Booking Details</h3><table class="detail-table" style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-in:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkIn}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">📅 Check-out:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.checkOut}</td></tr><tr><td style="padding:10px 0;color:#475569;font-weight:600;font-size:15px;">👥 Guests:</td><td style="padding:10px 0;color:#1e293b;text-align:right;font-size:15px;">${params.guests}</td></tr></table></div>${params.message ? `<div style="background:#f1f5f9;padding:20px;border-radius:8px;margin:20px 0;"><h3 style="color:#1e293b;margin:0 0 10px 0;font-size:16px;">💬 Guest Message:</h3><p style="color:#475569;margin:0;font-size:15px;line-height:1.6;font-style:italic;">"${params.message}"</p></div>` : ''}<div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);padding:20px;border-radius:8px;margin:25px 0;"><p style="color:#92400e;margin:0;font-size:14px;text-align:center;"><strong>⚡ Action Required:</strong> Please log in to your dashboard to accept or reject this request.</p></div>`;

  return getBaseEmailTemplate(content, params.hotel);
};
