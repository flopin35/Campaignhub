import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase/auth';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const UPLOAD_TIMEOUT_MS = 60_000;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const STORAGE_FOLDERS = {
  BANNERS: 'campaigns/banners',
  GALLERY: 'campaigns/gallery',
  LOGOS: 'campaigns/logos',
  PAYMENTS: 'payments/screenshots',
  AVATARS: 'users/avatars',
};

const COMPRESS_THRESHOLD = 1024 * 1024; // 1MB
const MAX_DIMENSION = 1920;
const UPLOAD_COOLDOWN_MS = 2000;
let lastUploadAt = 0;

export class StorageUploadError extends Error {
  constructor(message, code = 'storage/unknown') {
    super(message);
    this.name = 'StorageUploadError';
    this.code = code;
  }
}

function getFileExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase();
  if (fromName && ALLOWED_EXTENSIONS.includes(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;

  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeMap[file.type] || 'jpg';
}

function resolveContentType(file) {
  if (ALLOWED_MIME_TYPES.includes(file.type)) return file.type;
  const ext = getFileExtension(file);
  const typeMap = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return typeMap[ext] || 'image/jpeg';
}

function buildFilename(file, label) {
  const ext = getFileExtension(file);
  const safeLabel = label || 'image';
  return `${Date.now()}-${safeLabel}.${ext}`;
}

export function validateImageFile(file) {
  if (!file) {
    throw new StorageUploadError('No file selected.', 'storage/invalid-file');
  }

  const ext = file.name?.split('.').pop()?.toLowerCase();
  const typeOk = ALLOWED_MIME_TYPES.includes(file.type);
  const extOk = ext && ALLOWED_EXTENSIONS.includes(ext);

  if (!typeOk && !extOk) {
    throw new StorageUploadError(
      'Invalid file type. Allowed: JPG, JPEG, PNG, WEBP.',
      'storage/invalid-format'
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new StorageUploadError(
      'File is too large. Maximum size is 5MB.',
      'storage/file-too-large'
    );
  }
}

/**
 * Compress large images client-side before upload (keeps quality reasonable).
 */
export async function compressImageIfNeeded(file) {
  if (!file || file.size <= COMPRESS_THRESHOLD) return file;
  if (!file.type?.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.85
      );
    });

    return new File([blob], file.name, { type: blob.type });
  } catch {
    return file;
  }
}

function enforceUploadCooldown() {
  const now = Date.now();
  if (now - lastUploadAt < UPLOAD_COOLDOWN_MS) {
    throw new StorageUploadError('Please wait a moment before uploading again.', 'storage/rate-limit');
  }
  lastUploadAt = now;
}

function mapStorageError(err) {
  const code = err?.code || 'storage/unknown';
  const messages = {
    'storage/unverified': 'Verify your email before uploading files.',
    'storage/unauthorized': 'Upload denied. Please sign in again and retry.',
    'storage/unauthenticated': 'You must be signed in to upload files.',
    'storage/canceled': 'Upload was canceled.',
    'storage/quota-exceeded': 'Storage quota exceeded. Contact support.',
    'storage/retry-limit-exceeded': 'Upload failed after multiple retries. Check your connection.',
    'storage/invalid-checksum': 'File corrupted during upload. Please try again.',
    'storage/server-file-wrong-size': 'Upload incomplete. Please try again.',
  };

  if (messages[code]) {
    return new StorageUploadError(messages[code], code);
  }

  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('failed') || msg.includes('cors')) {
    return new StorageUploadError(
      'Network error during upload. Check your connection and ensure Firebase Storage is enabled in your Firebase Console.',
      code
    );
  }

  return new StorageUploadError(
    err?.message || 'Upload failed. Please try again.',
    code
  );
}

/**
 * Upload a file to Firebase Storage and return its download URL.
 * @param {File} file
 * @param {string} folder - e.g. campaigns/banners
 * @param {{ onProgress?: (percent: number) => void, label?: string }} options
 */
export async function uploadToStorage(file, folder, options = {}) {
  const { onProgress, label = 'image' } = options;

  if (!auth.currentUser) {
    throw new StorageUploadError(
      'You must be signed in to upload files. Please log in and try again.',
      'storage/unauthenticated'
    );
  }

  if (!auth.currentUser.emailVerified) {
    throw new StorageUploadError(
      'Please verify your email before uploading files. Check your inbox for the verification link.',
      'storage/unverified'
    );
  }

  validateImageFile(file);
  enforceUploadCooldown();

  const prepared = await compressImageIfNeeded(file);
  validateImageFile(prepared);

  const filename = buildFilename(prepared, label);
  const path = `${folder}/${filename}`;
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, prepared, {
    contentType: resolveContentType(prepared),
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    let lastProgressAt = Date.now();

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearInterval(watchdog);
      reject(err);
    };

    const succeed = (url) => {
      if (settled) return;
      settled = true;
      clearInterval(watchdog);
      resolve(url);
    };

    const watchdog = setInterval(() => {
      if (settled) return;
      const idleMs = Date.now() - lastProgressAt;
      if (idleMs > UPLOAD_TIMEOUT_MS) {
        try {
          uploadTask.cancel();
        } catch {
          /* ignore */
        }
        fail(
          new StorageUploadError(
            'Upload timed out. Check your internet connection and try again.',
            'storage/timeout'
          )
        );
      }
    }, 2000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        lastProgressAt = Date.now();
        if (onProgress && snapshot.totalBytes > 0) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (err) => fail(mapStorageError(err)),
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          succeed(url);
        } catch (err) {
          fail(mapStorageError(err));
        }
      }
    );
  });
}

export async function uploadBanner(file, onProgress) {
  return uploadToStorage(file, STORAGE_FOLDERS.BANNERS, { onProgress, label: 'banner' });
}

export async function uploadLogo(file, onProgress) {
  return uploadToStorage(file, STORAGE_FOLDERS.LOGOS, { onProgress, label: 'logo' });
}

export async function uploadGalleryImages(files, onProgress) {
  const list = Array.from(files || []);
  if (!list.length) return [];

  const results = [];
  let completed = 0;

  for (const file of list) {
    const url = await uploadToStorage(file, STORAGE_FOLDERS.GALLERY, {
      label: 'gallery',
      onProgress: (pct) => {
        if (onProgress) {
          const overall = Math.round(((completed + pct / 100) / list.length) * 100);
          onProgress(overall);
        }
      },
    });
    results.push(url);
    completed += 1;
    if (onProgress) onProgress(Math.round((completed / list.length) * 100));
  }

  return results;
}

export async function uploadPaymentScreenshot(file, onProgress) {
  return uploadToStorage(file, STORAGE_FOLDERS.PAYMENTS, { onProgress, label: 'screenshot' });
}

export async function uploadAvatar(file, userId, onProgress) {
  if (!userId) throw new StorageUploadError('User ID required for avatar upload.', 'storage/invalid-file');
  return uploadToStorage(file, `${STORAGE_FOLDERS.AVATARS}/${userId}`, { onProgress, label: 'avatar' });
}
