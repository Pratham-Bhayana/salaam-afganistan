const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');
const PlatformSettings = require('../models/PlatformSettings');
const Notification = require('../models/Notification');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

function renderTemplate(str = '', vars = {}) {
  return str.replace(/\{\{(\w+)\}\}/g, (_m, key) => (vars[key] != null ? String(vars[key]) : ''));
}

async function sendTemplatedEmail({ templateCode, to, vars = {}, fallback }) {
  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  if (settings && settings.notifications?.emailEnabled === false) {
    return { skipped: true, reason: 'email_disabled' };
  }

  const template = await EmailTemplate.findOne({ code: templateCode, isActive: true }).lean();
  const subject = template
    ? renderTemplate(template.subject, vars)
    : fallback?.subject || 'Salaam Afghanistan notification';
  const html = template
    ? renderTemplate(template.htmlBody, vars)
    : fallback?.html || `<p>${fallback?.text || ''}</p>`;
  const text = template?.textBody
    ? renderTemplate(template.textBody, vars)
    : fallback?.text || '';

  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'Salaam Afghanistan <noreply@salaam.local>',
    to,
    subject,
    html,
    text,
  });

  return { skipped: false, info };
}

async function notifyApplicant({
  applicantId,
  email,
  type,
  title,
  body,
  applicationId,
  templateCode,
  vars,
}) {
  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  const channel =
    settings?.notifications?.inAppEnabled === false
      ? 'email'
      : settings?.notifications?.emailEnabled === false
        ? 'in_app'
        : 'both';

  const notification = await Notification.create({
    audience: 'applicant',
    recipientId: applicantId,
    channel,
    type,
    title,
    body,
    application: applicationId,
    meta: vars,
  });

  if (email && channel !== 'in_app') {
    const result = await sendTemplatedEmail({
      templateCode,
      to: email,
      vars,
      fallback: { subject: title, text: body, html: `<p>${body}</p>` },
    });
    if (!result.skipped) {
      notification.emailSentAt = new Date();
      await notification.save();
    }
  }

  return notification;
}

module.exports = {
  sendTemplatedEmail,
  notifyApplicant,
  getTransporter,
};
