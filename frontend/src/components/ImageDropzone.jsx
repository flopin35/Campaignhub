import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, validateImageFile, StorageUploadError } from '../services/storageService';
import { Camera, X } from './icons/AppIcons';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImageDropzone({
  label = 'Upload image',
  hint = `JPG, PNG, WEBP — max ${formatSize(MAX_FILE_SIZE)}`,
  value = null,
  previewUrl = null,
  onChange,
  onRemove,
  error = '',
  multiple = false,
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const accept = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',');

  const processFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      setLocalError('');

      try {
        if (multiple) {
          files.forEach((f) => validateImageFile(f));
          onChange?.(files);
        } else {
          validateImageFile(files[0]);
          onChange?.(files[0]);
        }
      } catch (err) {
        const msg = err instanceof StorageUploadError ? err.message : 'Invalid file';
        setLocalError(msg);
      }
    },
    [multiple, onChange]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const displayError = error || localError;

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          displayError
            ? 'border-red-500/50 bg-red-500/5'
            : dragging
              ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
              : 'border-surface-border hover:border-brand-500/50 hover:bg-surface-elevated/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-52 mx-auto rounded-lg object-contain shadow-lg ring-1 ring-white/10"
              />
              {value && (
                <p className="text-xs text-gray-500 mt-2 truncate max-w-xs mx-auto">
                  {value.name} · {formatSize(value.size)}
                </p>
              )}
              {!disabled && onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalError('');
                    onRemove();
                  }}
                  className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  Remove image
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-brand-400" />
              </div>
              <p className="text-gray-300 text-sm font-medium mb-1">
                {dragging ? 'Drop image here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-gray-500 text-xs">{hint}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {displayError && <p className="text-xs text-red-400 mt-1.5">{displayError}</p>}
    </div>
  );
}

export function GalleryDropzone({ files = [], previews = [], onChange, onRemoveAt, error = '', disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const accept = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',');

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setLocalError('');

    try {
      incoming.forEach((f) => validateImageFile(f));
      onChange?.([...files, ...incoming]);
    } catch (err) {
      setLocalError(err instanceof StorageUploadError ? err.message : 'Invalid file');
    }
  };

  const displayError = error || localError;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Gallery Images</label>

      {previews.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt="" className="w-20 h-20 rounded-lg object-cover ring-1 ring-white/10" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemoveAt?.(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragging ? 'border-brand-400 bg-brand-500/10' : 'border-surface-border hover:border-brand-500/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input ref={inputRef} type="file" accept={accept} multiple disabled={disabled} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} className="hidden" />
        <p className="text-gray-400 text-sm">Add gallery images (optional)</p>
        <p className="text-gray-600 text-xs mt-1">Drag & drop or click · JPG, PNG, WEBP · max 5MB each</p>
      </div>

      {displayError && <p className="text-xs text-red-400 mt-1.5">{displayError}</p>}
    </div>
  );
}
