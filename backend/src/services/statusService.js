const {
  canTransition,
  getAllowedNextStatuses,
  APPLICATION_STATUSES,
} = require('../config/statusWorkflow');
const { ROLES } = require('../config/permissions');
const { ApiError } = require('../middleware/error');
const { notifyApplicant } = require('./emailService');
const PlatformSettings = require('../models/PlatformSettings');

function actorPayloadFromStaff(staff) {
  return {
    actorType: 'staff',
    actorId: staff._id,
    actorRole: staff.role,
    actorName: `${staff.firstName} ${staff.lastName}`.trim(),
  };
}

function actorPayloadFromEmbassyStaff(embassyStaff) {
  return {
    actorType: 'embassy',
    actorId: embassyStaff._id,
    actorRole: embassyStaff.role,
    actorName: `${embassyStaff.firstName} ${embassyStaff.lastName}`.trim(),
  };
}

async function changeApplicationStatus({
  application,
  toStatus,
  staff,
  embassyStaff,
  note,
  meta,
}) {
  if (!staff && !embassyStaff) {
    throw new ApiError(500, 'Status change requires an actor');
  }

  const fromStatus = application.status;
  const isReceptionist = staff?.role === ROLES.RECEPTIONIST;
  const isEmbassy = Boolean(embassyStaff);

  if (!canTransition(fromStatus, toStatus, { isReceptionist, isEmbassy })) {
    throw new ApiError(
      400,
      `Illegal status transition: ${fromStatus} → ${toStatus}`,
      { allowed: getAllowedNextStatuses(fromStatus, { isReceptionist, isEmbassy }) }
    );
  }

  application.status = toStatus;
  if (toStatus === APPLICATION_STATUSES.SENT_TO_EMBASSY) {
    application.sentToEmbassyAt = new Date();
  }
  if (
    [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.REJECTED].includes(toStatus)
  ) {
    application.decidedAt = new Date();
  }
  if (toStatus === APPLICATION_STATUSES.VISA_ISSUED) {
    application.issuedAt = new Date();
  }
  if (toStatus === APPLICATION_STATUSES.DOCUMENTS_REQUIRED && note) {
    application.documentRequestNote = note;
  }
  if (toStatus === APPLICATION_STATUSES.REJECTED && note) {
    application.rejectionReason = note;
  }
  if (toStatus === APPLICATION_STATUSES.ARCHIVED) {
    application.isArchived = true;
  }

  const actor = embassyStaff
    ? actorPayloadFromEmbassyStaff(embassyStaff)
    : actorPayloadFromStaff(staff);

  application.activity.push({
    action: 'status_change',
    fromStatus,
    toStatus,
    note,
    ...actor,
    meta,
    at: new Date(),
  });

  await application.save();

  if (application.applicant && application.personal?.email) {
    const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
    const shouldEmail =
      settings?.notifications?.statusChangeEmails !== false ||
      (toStatus === APPLICATION_STATUSES.DOCUMENTS_REQUIRED &&
        settings?.notifications?.documentRequestEmails !== false) ||
      (toStatus === APPLICATION_STATUSES.VISA_ISSUED &&
        settings?.notifications?.visaIssuedEmails !== false);

    if (shouldEmail) {
      await notifyApplicant({
        applicantId: application.applicant,
        email: application.personal.email,
        type: 'status_change',
        title: `Application ${application.referenceId} is now ${toStatus}`,
        body: note || `Your application status changed to ${toStatus}.`,
        applicationId: application._id,
        templateCode: 'application_status_change',
        vars: {
          referenceId: application.referenceId,
          status: toStatus,
          note: note || '',
          fullName: application.personal.fullName || '',
        },
      });
    }
  }

  return application;
}

module.exports = {
  changeApplicationStatus,
  actorPayload: actorPayloadFromStaff,
  actorPayloadFromStaff,
  actorPayloadFromEmbassyStaff,
  APPLICATION_STATUSES,
};
