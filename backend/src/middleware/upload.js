const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ApiError } = require('./error');

// Configurable so a Railway/host persistent Volume can be mounted (e.g.
// UPLOAD_DIR=/data/uploads). Defaults to the in-repo uploads folder for local dev.
const uploadRoot = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

function ensureUploadDirs() {
  const dirs = [
    uploadRoot,
    path.join(uploadRoot, 'applications'),
    path.join(uploadRoot, 'deliveries'),
    path.join(uploadRoot, 'visas'),
    path.join(uploadRoot, 'chat'),
    path.join(uploadRoot, 'branding'),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

ensureUploadDirs();

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function makeStorage(subdir) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dest = path.join(uploadRoot, subdir);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  });
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
  }
  return cb(null, true);
}

const uploadApplicationDoc = multer({
  storage: makeStorage('applications'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadDeliveryDoc = multer({
  storage: makeStorage('deliveries'),
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadChatAttachment = multer({
  storage: makeStorage('chat'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = {
  uploadRoot,
  uploadApplicationDoc,
  uploadDeliveryDoc,
  uploadChatAttachment,
  ensureUploadDirs,
};
