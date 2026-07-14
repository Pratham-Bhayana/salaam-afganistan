const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
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
    gender: personal.gender || passport.gender || '',
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

function tryImage(doc, urlOrPath, x, y, opts) {
  if (!urlOrPath || String(urlOrPath).startsWith('http')) return false;
  const candidates = [];
  if (path.isAbsolute(urlOrPath)) candidates.push(urlOrPath);
  else {
    candidates.push(path.join(uploadRoot, urlOrPath.replace(/^\//, '')));
    // Admin public assets when running monorepo locally
    candidates.push(path.join(__dirname, '../../../admin-panel/public', urlOrPath.replace(/^\//, '')));
  }
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        doc.image(file, x, y, opts);
        return true;
      }
    } catch {
      /* ignore bad images */
    }
  }
  return false;
}

async function generateVisaPdf({ application, template, visaNumber, outputPath, validFrom, validUntil }) {
  const layout = template.layout || {};
  const { fields } = fieldsForVisaType(template, application.visaTypeCode);
  const includeBarcode = template.includeBarcode !== false;
  const showPhoto = layout.showPhoto !== false;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [template.pageWidth || 595, template.pageHeight || 842],
      margin: 36,
    });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const pageW = template.pageWidth || 595;
    let y = 40;

    // Logos
    const salaamLogo = layout.salaamLogoUrl || template.logoImageUrl;
    const embassyLogo = layout.embassyLogoUrl || template.sealImageUrl;
    tryImage(doc, salaamLogo, 40, y, { height: 42, width: 110 });
    tryImage(doc, embassyLogo, pageW - 150, y, { height: 42, width: 110 });
    y += 56;

    // Authority
    doc.fillColor('#111');
    doc.fontSize(12).font('Helvetica-Bold')
      .text(layout.govLine || 'ISLAMIC EMIRATE OF AFGHANISTAN', 40, y, {
        width: pageW - 80,
        align: 'center',
      });
    y = doc.y + 4;
    doc.fontSize(10).font('Helvetica-Bold')
      .text(layout.ministryLine || 'Ministry of Foreign Affairs', {
        width: pageW - 80,
        align: 'center',
      });
    y = doc.y + 2;
    doc.fontSize(9).font('Helvetica')
      .text(layout.systemLine || 'Salaam Afghanistan — Electronic Visa System', {
        width: pageW - 80,
        align: 'center',
      });
    y = doc.y + 10;

    // Section title
    doc.fontSize(11).font('Helvetica-Bold')
      .text(layout.sectionTitle || 'eVISA Holder Information', 40, y, {
        width: pageW - 80,
        align: 'center',
        underline: true,
      });
    y = doc.y + 12;
    doc.moveTo(40, y).lineTo(pageW - 40, y).strokeColor('#222').lineWidth(1).stroke();
    y += 14;

    // Watermark (best-effort; ignore if asset missing)
    tryImage(doc, embassyLogo || '/taliban-flag.png', pageW / 2 - 90, y + 40, {
      width: 180,
      height: 180,
    });

    const labelX = 48;
    const valueX = 210;
    const rightColX = pageW - 40 - 110;
    const fontSize = Number(layout.fontSize) || 10;

    // Photo box
    if (showPhoto) {
      doc.rect(rightColX, y, 110, 140).strokeColor('#333').lineWidth(1).stroke();
      doc.fontSize(9).fillColor('#888').text('Photo', rightColX, y + 60, {
        width: 110,
        align: 'center',
      });
    }

    // Fields
    doc.fillColor('#111');
    let rowY = y;
    for (const field of fields) {
      const value = resolveFieldValue({
        key: field.key,
        application,
        visaNumber,
        validFrom,
        validUntil,
      });
      doc.fontSize(fontSize).font('Helvetica-Bold').text(field.label, labelX, rowY, {
        width: valueX - labelX - 8,
        lineBreak: false,
      });
      doc.font('Helvetica').text(value, valueX, rowY, {
        width: showPhoto ? rightColX - valueX - 12 : pageW - valueX - 48,
        lineBreak: false,
      });
      rowY += Math.max(16, fontSize + 6);
    }

    // Barcode block
    if (includeBarcode) {
      const barY = showPhoto ? y + 150 : rowY + 8;
      const barX = rightColX;
      doc.rect(barX, barY, 110, 46).strokeColor('#ccc').stroke();
      // Fake barcode bars
      for (let i = 0; i < 28; i += 1) {
        const bw = i % 5 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1;
        doc.rect(barX + 6 + i * 3.5, barY + 6, bw, 28).fillColor('#111').fill();
      }
      doc.fillColor('#111').fontSize(8).font('Helvetica-Bold')
        .text(visaNumber, barX, barY + 34, { width: 110, align: 'center' });
      rowY = Math.max(rowY, barY + 56);
    }

    // Disclaimer
    const discY = Math.max(rowY + 20, (template.pageHeight || 842) - 120);
    doc.rect(40, discY, pageW - 80, 70).fillColor('#ececec').fill();
    doc.fillColor('#111').fontSize(9).font('Helvetica-Bold')
      .text('DISCLAIMER:', 48, discY + 8, { width: pageW - 96 });
    doc.font('Helvetica').fontSize(8)
      .text(
        layout.disclaimer ||
          'This electronic visa authorizes travel to Afghanistan but does not guarantee entry.',
        48,
        discY + 22,
        { width: pageW - 96, align: 'left' }
      );

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
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
  const stay = application.travel?.stayDurationDays || 30;
  const validUntil = new Date(validFrom);
  validUntil.setDate(validUntil.getDate() + stay);
  return { validFrom, validUntil };
}

/**
 * Build a PDF preview without saving IssuedVisa / documents / email / status.
 * Works for applications in review or already approved.
 */
async function previewVisaForApplication({ applicationId }) {
  const application = await Application.findById(applicationId);
  if (!application) throw new ApiError(404, 'Application not found');

  const previewable = [
    APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
    APPLICATION_STATUSES.APPROVED,
    APPLICATION_STATUSES.VISA_ISSUED,
    APPLICATION_STATUSES.SENT_TO_EMBASSY,
  ];
  if (!previewable.includes(application.status)) {
    throw new ApiError(400, 'Visa preview is not available for this application status');
  }

  const template = await resolveTemplate();
  const { validFrom, validUntil } = validityWindow(application);
  const visaNumber = `PREVIEW-${application.referenceId || application._id}`;

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
    });
    const buffer = fs.readFileSync(outputPath);
    return {
      buffer,
      fileName: `${visaNumber}.pdf`,
      visaNumber,
      referenceId: application.referenceId,
      applicantName: application.personal?.fullName || application.passport?.fullName || '',
      applicantEmail: application.personal?.email || '',
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

  const template = await resolveTemplate();
  const actorId = (staff || embassyStaff)._id;
  const visaNumber = generateVisaNumber();
  const fileName = `${visaNumber}.pdf`;
  const storagePath = path.join('visas', fileName);
  const absolute = path.join(uploadRoot, storagePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });

  const { validFrom, validUntil } = validityWindow(application);

  await generateVisaPdf({
    application,
    template,
    visaNumber,
    outputPath: absolute,
    validFrom,
    validUntil,
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
        qrPayload: `${visaNumber}|${application.referenceId}`,
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
};
