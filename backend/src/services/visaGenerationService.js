const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Application = require('../models/Application');
const IssuedVisa = require('../models/IssuedVisa');
const VisaTemplate = require('../models/VisaTemplate');
const ApplicationDocument = require('../models/ApplicationDocument');
const PlatformSettings = require('../models/PlatformSettings');
const { APPLICATION_STATUSES } = require('../config/statusWorkflow');
const { ApiError } = require('../middleware/error');
const { generateVisaNumber } = require('../utils/helpers');
const { uploadRoot } = require('../middleware/upload');
const { changeApplicationStatus } = require('./statusService');
const { notifyApplicant } = require('./emailService');
const {
  EVISA_TEMPLATE_CODE,
  fieldsForVisaType,
  defaultEvisaTemplateSeed,
} = require('./evisaTemplateConfig');

function fmtDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function publicApiBase() {
  const raw =
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 5000}/api/v1`;
  return String(raw).replace(/\/$/, '');
}

function buildVerifyUrl(token) {
  return `${publicApiBase()}/visas/verify/${token}`;
}

function createVerificationToken() {
  return crypto.randomBytes(24).toString('hex');
}

function parseOptionalDate(value) {
  if (value == null || value === '') return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * Merge editable visa fields into application personal/passport/travel.
 * Mutates the mongoose doc (or plain object) in place.
 */
function applyVisaFieldOverrides(application, overrides = {}) {
  if (!overrides || typeof overrides !== 'object') return application;

  application.personal = application.personal || {};
  application.passport = application.passport || {};
  application.travel = application.travel || {};

  const p = application.personal;
  const pass = application.passport;
  const travel = application.travel;

  if (overrides.fullName != null) p.fullName = String(overrides.fullName).trim();
  if (overrides.email != null) p.email = String(overrides.email).trim();
  if (overrides.nationality != null) p.nationality = String(overrides.nationality).trim().toUpperCase();
  if (overrides.sex != null) p.sex = String(overrides.sex).trim().toLowerCase();
  if (overrides.gender != null) p.gender = String(overrides.gender).trim().toLowerCase();

  const dob = parseOptionalDate(overrides.dateOfBirth);
  if (dob) p.dateOfBirth = dob;

  if (overrides.passportNumber != null) pass.passportNumber = String(overrides.passportNumber).trim();
  if (overrides.issuingCountry != null) {
    pass.issuingCountry = String(overrides.issuingCountry).trim().toUpperCase();
  }
  const issueDate = parseOptionalDate(overrides.issueDate || overrides.passportIssueDate);
  if (issueDate) pass.issueDate = issueDate;
  const expiryDate = parseOptionalDate(overrides.expiryDate || overrides.passportExpiryDate);
  if (expiryDate) pass.expiryDate = expiryDate;

  if (overrides.purpose != null) travel.purpose = String(overrides.purpose).trim();
  if (overrides.addressInAfghanistan != null) {
    travel.addressInAfghanistan = String(overrides.addressInAfghanistan).trim();
  }
  if (overrides.remarks != null) travel.remarks = String(overrides.remarks).trim();
  if (overrides.placeOfIssue != null) travel.placeOfIssue = String(overrides.placeOfIssue).trim();

  const entry = parseOptionalDate(overrides.intendedEntryDate || overrides.validFrom);
  if (entry) travel.intendedEntryDate = entry;
  const exit = parseOptionalDate(overrides.intendedExitDate || overrides.validUntil);
  if (exit) travel.intendedExitDate = exit;

  if (overrides.embassyName != null) application.embassyName = String(overrides.embassyName).trim();

  return application;
}

function draftFieldsFromApplication(application) {
  const personal = application.personal || {};
  const passport = application.passport || {};
  const travel = application.travel || {};
  const toIso = (v) => {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  return {
    fullName: personal.fullName || passport.fullName || '',
    email: personal.email || '',
    dateOfBirth: toIso(personal.dateOfBirth || passport.dateOfBirth),
    sex: personal.sex || personal.gender || '',
    nationality: personal.nationality || passport.nationality || '',
    passportNumber: passport.passportNumber || '',
    issuingCountry: passport.issuingCountry || '',
    issueDate: toIso(passport.issueDate),
    expiryDate: toIso(passport.expiryDate),
    purpose: travel.purpose || '',
    intendedEntryDate: toIso(travel.intendedEntryDate),
    intendedExitDate: toIso(travel.intendedExitDate),
    addressInAfghanistan: travel.addressInAfghanistan || '',
    remarks: travel.remarks || application.decisionNote || '',
    placeOfIssue: application.embassyName || travel.placeOfIssue || '',
  };
}

function resolveFieldValue({ key, application, visaNumber, validFrom, validUntil }) {
  const personal = application.personal || {};
  const passport = application.passport || {};
  const travel = application.travel || {};
  const payment = application.payment || {};

  const map = {
    visa_number: visaNumber,
    visaNumber,
    ref_number: application.referenceId || '',
    referenceId: application.referenceId || '',
    issue_date: fmtDate(new Date()),
    expiry_date: fmtDate(validUntil),
    validFrom: fmtDate(validFrom),
    validUntil: fmtDate(validUntil),
    place_of_issue: application.embassyName || travel.placeOfIssue || 'Kabul',
    remarks: travel.remarks || application.decisionNote || 'As authorized',
    visa_fee:
      payment.amount != null
        ? `${payment.currency || 'USD'} ${payment.amount}`
        : payment.feeLabel || '',
    gender: personal.gender || personal.sex || passport.gender || '',
    applicant_name: (personal.fullName || passport.fullName || '').toUpperCase(),
    fullName: personal.fullName || passport.fullName || '',
    date_of_birth: fmtDate(personal.dateOfBirth || passport.dateOfBirth),
    nationality: personal.nationality || passport.nationality || '',
    travel_document: passport.documentType || 'Ordinary Passport',
    passport_no: passport.passportNumber || '',
    passportNumber: passport.passportNumber || '',
    travel_doc_issue: fmtDate(passport.issueDate),
    travel_doc_expiry: fmtDate(passport.expiryDate),
    visa_type: application.visaTypeCode || '',
    embassy_name: application.embassyName || '',
  };

  return map[key] != null && map[key] !== '' ? String(map[key]) : '—';
}

function resolveAssetCandidates(urlOrPath) {
  const raw = String(urlOrPath || '').trim();
  // PDFKit only embeds local files. Remote http(s) URLs are not fetched —
  // they must be resolved to a path under uploads/ or backend/assets/.
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) return [];

  const cleaned = raw.replace(/^\//, '');
  const base = path.basename(cleaned);
  const baseLower = base.toLowerCase();
  const assetsRoot = path.join(__dirname, '../../assets');
  const candidates = [];

  // Absolute path only if the file actually exists (avoid treating "/Logo.png" as FS root)
  if (path.isAbsolute(raw) && fs.existsSync(raw)) {
    candidates.push(raw);
  }

  candidates.push(
    // Deployed with the backend (Railway) — preferred defaults
    path.join(assetsRoot, 'branding', cleaned),
    path.join(assetsRoot, 'branding', base),
    path.join(assetsRoot, 'branding', baseLower),
    path.join(assetsRoot, cleaned),
    path.join(uploadRoot, cleaned),
    path.join(uploadRoot, 'branding', cleaned),
    path.join(uploadRoot, 'branding', base),
    // Local monorepo fallbacks (dev only — not present on Railway backend-only deploys)
    path.join(__dirname, '../../../admin-panel/public', cleaned),
    path.join(__dirname, '../../../website/public', cleaned),
    path.join(__dirname, '../../../website', cleaned),
    path.join(__dirname, '../../../admin-panel/public', base),
    path.join(__dirname, '../../../website/public', baseLower)
  );

  return [...new Set(candidates)];
}

function resolveAssetPath(urlOrPath) {
  const raw = String(urlOrPath || '').trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    console.warn(
      `[visaPDF] Logo URL is remote and cannot be embedded by PDFKit (no HTTP fetch): ${raw}`
    );
    return null;
  }

  for (const file of resolveAssetCandidates(urlOrPath)) {
    if (fs.existsSync(file)) {
      console.log(`[visaPDF] Resolved logo asset "${raw}" → ${file}`);
      return file;
    }
  }

  console.warn(
    `[visaPDF] Logo asset not found on disk: "${raw}". ` +
      'Expected a relative path like /Logo.png under backend/assets/branding or uploads/branding. ' +
      'There is no VITE_/LOGO_URL env for PDF logos.'
  );
  return null;
}

/** Read PNG/JPEG pixel size from file header (best-effort). */
function readImageDimensions(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    // PNG
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG SOF0/SOF2
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = buf[i + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        const len = buf.readUInt16BE(i + 2);
        i += 2 + len;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Draw image inside a box without stretching. Returns used { width, height }.
 */
function drawFittedImage(doc, urlOrPath, boxX, boxY, maxW, maxH, opts = {}) {
  const file = resolveAssetPath(urlOrPath);
  if (!file) return { width: 0, height: 0, drawn: false };

  const dims = readImageDimensions(file);
  let width = maxW;
  let height = maxH;
  if (dims?.width && dims?.height) {
    const scale = Math.min(maxW / dims.width, maxH / dims.height);
    width = Math.max(1, dims.width * scale);
    height = Math.max(1, dims.height * scale);
  }

  let x = boxX;
  if (opts.align === 'right') x = boxX + maxW - width;
  else if (opts.align === 'center') x = boxX + (maxW - width) / 2;

  let y = boxY;
  if (opts.valign === 'center') y = boxY + (maxH - height) / 2;
  else if (opts.valign === 'bottom') y = boxY + maxH - height;

  try {
    if (opts.opacity != null && opts.opacity < 1) {
      doc.save();
      doc.opacity(opts.opacity);
      doc.image(file, x, y, { width, height });
      doc.restore();
    } else {
      doc.image(file, x, y, { width, height });
    }
    return { width, height, drawn: true };
  } catch {
    return { width: 0, height: 0, drawn: false };
  }
}

function tryImage(doc, urlOrPath, x, y, opts = {}) {
  if (opts.fit && Array.isArray(opts.fit)) {
    const [maxW, maxH] = opts.fit;
    return drawFittedImage(doc, urlOrPath, x, y, maxW, maxH, opts).drawn;
  }
  if (opts.width && opts.height && !opts.stretch) {
    return drawFittedImage(doc, urlOrPath, x, y, opts.width, opts.height, opts).drawn;
  }

  const file = resolveAssetPath(urlOrPath);
  if (!file) return false;
  try {
    const { opacity, ...imageOpts } = opts;
    if (opacity != null && opacity < 1) {
      doc.save();
      doc.opacity(opacity);
      doc.image(file, x, y, imageOpts);
      doc.restore();
    } else {
      doc.image(file, x, y, imageOpts);
    }
    return true;
  } catch {
    return false;
  }
}

const PHOTO_DOC_KEYS = ['photos', 'photo_45x35', 'passport_photo', 'photo'];

async function resolveApplicantPhotoPath(applicationId) {
  if (!applicationId) return null;
  const docs = await ApplicationDocument.find({
    application: applicationId,
    isDeleted: false,
    key: { $in: PHOTO_DOC_KEYS },
    mimeType: { $regex: /^image\//i },
  })
    .sort({ createdAt: -1 })
    .lean();

  for (const key of PHOTO_DOC_KEYS) {
    const match = docs.find((d) => d.key === key);
    if (!match?.storagePath) continue;
    const absolute = path.isAbsolute(match.storagePath)
      ? match.storagePath
      : path.join(uploadRoot, match.storagePath);
    if (fs.existsSync(absolute)) return absolute;
  }
  return null;
}

async function generateVisaPdf({
  application,
  template,
  visaNumber,
  outputPath,
  validFrom,
  validUntil,
  verifyUrl,
  photoPath,
}) {
  const layout = template.layout || {};
  const { fields } = fieldsForVisaType(template, application.visaTypeCode);
  const includeBarcode = template.includeBarcode !== false;
  const includeQr = template.includeQr !== false;
  const showPhoto = layout.showPhoto !== false;
  const accent = layout.accentColor || '#1B4D45';
  const scanUrl = verifyUrl || `${visaNumber}|${application.referenceId || ''}`;

  let resolvedPhoto = photoPath || null;
  if (!resolvedPhoto && application?._id) {
    resolvedPhoto = await resolveApplicantPhotoPath(application._id);
  }

  let qrBuffer = null;
  if (includeQr || includeBarcode) {
    try {
      qrBuffer = await QRCode.toBuffer(scanUrl, {
        type: 'png',
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('QR generation failed:', err.message);
    }
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [template.pageWidth || 595, template.pageHeight || 842],
      margin: 36,
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageW = template.pageWidth || 595;
    const pageH = template.pageHeight || 842;
    const marginX = 44;
    const contentW = pageW - marginX * 2;
    let y = 24;

    doc.rect(0, 0, pageW, 6).fillColor(accent).fill();

    const salaamLogo = layout.salaamLogoUrl || template.logoImageUrl || '/Logo.png';
    const embassyLogo = layout.embassyLogoUrl || template.sealImageUrl || '/taliban-flag.png';
    console.log('[visaPDF] Header logo paths from template:', {
      salaamLogo,
      embassyLogo,
      layoutSalaam: layout.salaamLogoUrl || null,
      layoutEmbassy: layout.embassyLogoUrl || null,
      templateLogo: template.logoImageUrl || null,
      templateSeal: template.sealImageUrl || null,
      note: 'PDF logos are local filesystem paths only — not VITE_ env URLs; CORS does not apply',
    });
    const logoMaxW = 128;
    const logoMaxH = 52;
    const leftLogo = drawFittedImage(doc, salaamLogo, marginX, y, logoMaxW, logoMaxH, {
      align: 'left',
      valign: 'center',
    });
    const rightLogo = drawFittedImage(
      doc,
      embassyLogo,
      pageW - marginX - logoMaxW,
      y,
      logoMaxW,
      logoMaxH,
      { align: 'right', valign: 'center' }
    );
    if (!leftLogo.drawn || !rightLogo.drawn) {
      console.warn('[visaPDF] One or more header logos failed to draw', {
        salaamDrawn: leftLogo.drawn,
        embassyDrawn: rightLogo.drawn,
      });
    }
    y += Math.max(leftLogo.height, rightLogo.height, 40) + 14;

    doc.fillColor(accent);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(layout.govLine || 'ISLAMIC EMIRATE OF AFGHANISTAN', marginX, y, {
        width: contentW,
        align: 'center',
        lineGap: 1,
      });
    y = doc.y + 3;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#222')
      .text(layout.ministryLine || 'Ministry of Foreign Affairs', marginX, y, {
        width: contentW,
        align: 'center',
      });
    y = doc.y + 2;
    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#555')
      .text(layout.systemLine || 'Salaam Afghanistan — Electronic Visa System', marginX, y, {
        width: contentW,
        align: 'center',
      });
    y = doc.y + 10;

    doc
      .fillColor(accent)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(layout.sectionTitle || 'eVISA Holder Information', marginX, y, {
        width: contentW,
        align: 'center',
      });
    y = doc.y + 4;
    doc
      .moveTo(marginX + 80, y)
      .lineTo(pageW - marginX - 80, y)
      .strokeColor(accent)
      .lineWidth(1.1)
      .stroke();
    y += 16;

    const photoW = 108;
    const photoH = 136;
    const gapBeforePhoto = 18;
    const fieldsRight = showPhoto ? pageW - marginX - photoW - gapBeforePhoto : pageW - marginX;
    const labelColW = 148;
    const gutter = 14;
    const valueX = marginX + labelColW + gutter;
    const valueW = Math.max(120, fieldsRight - valueX);
    const rightColX = pageW - marginX - photoW;
    const fontSize = Math.min(10.5, Number(layout.fontSize) || 10);
    const rowH = Math.max(17, fontSize + 7);
    const fieldsTop = y;

    drawFittedImage(doc, embassyLogo, pageW / 2 - 95, fieldsTop + 40, 190, 190, {
      align: 'center',
      valign: 'center',
      opacity: 0.08,
    });

    if (showPhoto) {
      doc.rect(rightColX, fieldsTop, photoW, photoH).strokeColor(accent).lineWidth(1.1).stroke();
      if (resolvedPhoto) {
        drawFittedImage(doc, resolvedPhoto, rightColX + 4, fieldsTop + 4, photoW - 8, photoH - 8, {
          align: 'center',
          valign: 'center',
        });
      } else {
        doc.fontSize(9).fillColor('#888').text('Photo', rightColX, fieldsTop + photoH / 2 - 6, {
          width: photoW,
          align: 'center',
        });
      }
    }

    let rowY = fieldsTop;
    for (const field of fields) {
      const value = resolveFieldValue({
        key: field.key,
        application,
        visaNumber,
        validFrom,
        validUntil,
      });
      const label = String(field.label || field.key || '').replace(/:\s*$/, '');

      doc
        .fontSize(fontSize)
        .font('Helvetica-Bold')
        .fillColor(accent)
        .text(`${label}:`, marginX, rowY, {
          width: labelColW,
          lineBreak: false,
          ellipsis: true,
        });
      doc
        .font('Helvetica')
        .fillColor('#111')
        .text(value, valueX, rowY, {
          width: valueW,
          lineBreak: false,
          ellipsis: true,
        });
      rowY += rowH;
    }

    let contentBottom = rowY;
    if (qrBuffer) {
      const qrSize = 88;
      const barY = showPhoto ? fieldsTop + photoH + 10 : rowY + 10;
      const barX = showPhoto ? rightColX + (photoW - qrSize) / 2 : marginX;
      try {
        doc.image(qrBuffer, barX, barY, { width: qrSize, height: qrSize });
      } catch {
        /* keep PDF even if image fails */
      }
      doc
        .fillColor('#444')
        .fontSize(7)
        .font('Helvetica')
        .text('Scan to open visa', showPhoto ? rightColX : barX, barY + qrSize + 3, {
          width: showPhoto ? photoW : qrSize + 40,
          align: 'center',
        });
      doc
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .fillColor(accent)
        .text(visaNumber, showPhoto ? rightColX : barX, barY + qrSize + 13, {
          width: showPhoto ? photoW : Math.max(qrSize + 40, 140),
          align: 'center',
        });
      contentBottom = Math.max(rowY, barY + qrSize + 28);
    }

    const discH = 78;
    const discY = Math.min(Math.max(contentBottom + 18, pageH - discH - 28), pageH - discH - 18);
    doc.rect(marginX, discY, contentW, discH).fillColor('#eef6f3').fill();
    doc.rect(marginX, discY, 4, discH).fillColor(accent).fill();
    const discTextX = marginX + 16;
    const discTextW = contentW - 28;
    doc
      .fillColor(accent)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DISCLAIMER', discTextX, discY + 10, { width: discTextW });
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#333')
      .text(
        layout.disclaimer ||
          'This electronic visa authorizes travel to Afghanistan but does not guarantee entry.',
        discTextX,
        discY + 24,
        { width: discTextW, align: 'left', lineGap: 1.5 }
      );

    doc.rect(0, pageH - 5, pageW, 5).fillColor(accent).fill();

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { verifyUrl: scanUrl };
}

async function resolveTemplate() {
  let template =
    (await VisaTemplate.findOne({ code: EVISA_TEMPLATE_CODE, isActive: true })) ||
    (await VisaTemplate.findOne({ isDefault: true, isActive: true })) ||
    (await VisaTemplate.findOne({ isActive: true }));

  if (!template) {
    template = await VisaTemplate.create(defaultEvisaTemplateSeed);
  }
  return template;
}

function validityWindow(application) {
  const validFrom = application.travel?.intendedEntryDate || new Date();
  let validUntil;
  if (application.travel?.intendedExitDate) {
    validUntil = new Date(application.travel.intendedExitDate);
  } else {
    const stay = application.travel?.stayDurationDays || 30;
    validUntil = new Date(validFrom);
    validUntil.setDate(validUntil.getDate() + stay);
  }
  return { validFrom, validUntil };
}

const PREVIEWABLE_STATUSES = [
  APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
  APPLICATION_STATUSES.APPROVED,
  APPLICATION_STATUSES.VISA_ISSUED,
  APPLICATION_STATUSES.SENT_TO_EMBASSY,
  APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
];

/**
 * Build a PDF preview without saving IssuedVisa / documents / email / status.
 * Works for applications in review or already approved.
 */
async function previewVisaForApplication({ applicationId, fieldOverrides }) {
  const application = await Application.findById(applicationId);
  if (!application) throw new ApiError(404, 'Application not found');

  if (!PREVIEWABLE_STATUSES.includes(application.status)) {
    throw new ApiError(400, 'Visa preview is not available for this application status');
  }

  applyVisaFieldOverrides(application, fieldOverrides);

  const template = await resolveTemplate();
  const { validFrom, validUntil } = validityWindow(application);
  const visaNumber = `PREVIEW-${application.referenceId || application._id}`;
  const previewToken = `preview-${application._id}-${Date.now()}`;
  const verifyUrl = buildVerifyUrl(previewToken);

  const tmpDir = path.join(uploadRoot, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const outputPath = path.join(tmpDir, `preview-${application._id}-${Date.now()}.pdf`);

  try {
    await generateVisaPdf({
      application,
      template,
      visaNumber,
      outputPath,
      validFrom,
      validUntil,
      verifyUrl,
    });
    const buffer = fs.readFileSync(outputPath);
    return {
      buffer,
      fileName: `${visaNumber}.pdf`,
      visaNumber,
      referenceId: application.referenceId,
      applicantName: application.personal?.fullName || application.passport?.fullName || '',
      applicantEmail: application.personal?.email || '',
      draftFields: draftFieldsFromApplication(application),
      verifyUrl,
    };
  } finally {
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {
      /* ignore cleanup */
    }
  }
}

async function issueVisaForApplication({
  applicationId,
  staff,
  embassyStaff,
  force = false,
  sendEmail = true,
  fieldOverrides,
}) {
  if (!staff && !embassyStaff) {
    throw new ApiError(500, 'Visa issuance requires an actor');
  }

  const application = await Application.findById(applicationId);
  if (!application) throw new ApiError(404, 'Application not found');

  if (application.status === APPLICATION_STATUSES.VISA_ISSUED && !force) {
    const existing = await IssuedVisa.findOne({ application: application._id });
    if (existing) return existing;
  }

  if (
    application.status !== APPLICATION_STATUSES.APPROVED &&
    application.status !== APPLICATION_STATUSES.VISA_ISSUED
  ) {
    throw new ApiError(400, 'Visa can only be issued for approved applications');
  }

  if (fieldOverrides && typeof fieldOverrides === 'object') {
    applyVisaFieldOverrides(application, fieldOverrides);
    application.markModified('personal');
    application.markModified('passport');
    application.markModified('travel');
    await application.save();
  }

  const template = await resolveTemplate();
  const actorId = (staff || embassyStaff)._id;
  const visaNumber = generateVisaNumber();
  const fileName = `${visaNumber}.pdf`;
  const storagePath = path.join('visas', fileName);
  const absolute = path.join(uploadRoot, storagePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  const { validFrom, validUntil } = validityWindow(application);
  const verificationToken = createVerificationToken();
  const verifyUrl = buildVerifyUrl(verificationToken);

  await generateVisaPdf({
    application,
    template,
    visaNumber,
    outputPath: absolute,
    validFrom,
    validUntil,
    verifyUrl,
  });

  // Soft-delete prior issued_visa docs so the document panel shows the latest
  await ApplicationDocument.updateMany(
    { application: application._id, key: 'issued_visa', isDeleted: false },
    { $set: { isDeleted: true } }
  );

  const docRecord = await ApplicationDocument.create({
    application: application._id,
    key: 'issued_visa',
    label: 'Issued Visa',
    originalName: fileName,
    mimeType: 'application/pdf',
    size: fs.statSync(absolute).size,
    storageProvider: 'local',
    storagePath,
    uploadedByType: staff ? 'staff' : 'system',
    uploadedBy: actorId,
    category: 'visa_document',
    visibleToApplicant: true,
    deliveredAt: new Date(),
  });

  const issued = await IssuedVisa.findOneAndUpdate(
    { application: application._id },
    {
      $set: {
        referenceId: application.referenceId,
        visaNumber,
        visaTypeCode: application.visaTypeCode,
        applicantName: application.personal?.fullName || application.passport?.fullName || 'Unknown',
        nationality: application.personal?.nationality || application.passport?.nationality,
        passportNumber: application.passport?.passportNumber,
        embassy: application.embassy,
        template: template._id,
        validFrom,
        validUntil,
        entries: 'single',
        document: docRecord._id,
        storagePath,
        qrPayload: verifyUrl,
        verificationToken,
        issuedBy: staff ? staff._id : undefined,
        issuedByEmbassyStaff: embassyStaff ? embassyStaff._id : undefined,
        issuedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (application.status === APPLICATION_STATUSES.APPROVED) {
    await changeApplicationStatus({
      application,
      toStatus: APPLICATION_STATUSES.VISA_ISSUED,
      staff,
      embassyStaff,
      note: `Visa issued: ${visaNumber}`,
    });
  }

  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  if (
    sendEmail &&
    application.applicant &&
    application.personal?.email &&
    settings?.notifications?.visaIssuedEmails !== false
  ) {
    await notifyApplicant({
      applicantId: application.applicant,
      email: application.personal.email,
      type: 'visa_issued',
      title: `Visa issued for ${application.referenceId}`,
      body: `Your visa ${visaNumber} has been issued and is available in your profile.`,
      applicationId: application._id,
      templateCode: 'visa_issued',
      vars: {
        referenceId: application.referenceId,
        visaNumber,
        fullName: application.personal.fullName || '',
        verifyUrl,
      },
    });
    docRecord.emailNotifiedAt = new Date();
    await docRecord.save();
  }

  return issued;
}

module.exports = {
  issueVisaForApplication,
  previewVisaForApplication,
  generateVisaPdf,
  applyVisaFieldOverrides,
  draftFieldsFromApplication,
  buildVerifyUrl,
  createVerificationToken,
  publicApiBase,
};
