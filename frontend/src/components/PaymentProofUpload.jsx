import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import ImageDropzone from './ImageDropzone';
import UploadProgressBar from './UploadProgressBar';
import { MAX_PAYMENT_PROOF_SIZE } from '../services/storageService';

const STEPS = ['Reference generated', 'Send payment', 'Upload proof', 'Awaiting admin review'];

function StepProgress({ step }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-surface-border'}`} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 text-center">
        Step {step + 1} of {STEPS.length} — <span className="text-brand-400">{STEPS[step]}</span>
      </p>
    </div>
  );
}

export default function PaymentProofUpload({
  onSubmit,
  loading,
  uploadProgress = 0,
  uploadError = '',
  embedded = false,
  step = 2,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (uploadError) setFailed(true);
    if (loading) setFailed(false);
  }, [uploadError, loading]);

  const handleChange = (f) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFailed(false);
  };

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setFailed(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (file) onSubmit(file);
  };

  const handleRetry = () => {
    if (file) {
      setFailed(false);
      onSubmit(file);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: embedded ? 12 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={embedded ? 'space-y-4' : 'glass-card p-6 space-y-6'}
    >
      {embedded && <StepProgress step={step} />}

      {embedded ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-brand-600/8 border border-brand-500/15">
          <div className="w-9 h-9 rounded-lg bg-brand-600/15 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Upload payment screenshot</p>
            <p className="text-xs text-gray-500">Telecel Cash confirmation · JPG, PNG, WEBP · max 1MB</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-white">Upload payment confirmation</h2>
          <p className="text-sm text-gray-500 mt-1">Screenshot of your Telecel Cash confirmation · max 1MB</p>
          <p className="text-xs text-amber-400/80 mt-2">
            Status after upload: <span className="font-medium">Awaiting admin review</span>
          </p>
        </div>
      )}

      <ImageDropzone
        label="Payment Screenshot *"
        hint="JPG, PNG, WEBP — max 1MB"
        maxFileSize={MAX_PAYMENT_PROOF_SIZE}
        value={file}
        previewUrl={preview}
        onChange={handleChange}
        onRemove={handleRemove}
        disabled={loading}
        error={uploadError}
      />

      {loading && (
        <UploadProgressBar progress={uploadProgress} label="Uploading payment proof…" status="uploading" />
      )}

      {!loading && uploadProgress === 100 && !uploadError && (
        <UploadProgressBar progress={100} status="success" />
      )}

      {failed && uploadError && (
        <div className="space-y-3">
          <UploadProgressBar progress={0} status="error" label={uploadError} />
          <button type="button" onClick={handleRetry} className="btn-secondary w-full py-2.5 text-sm">
            Retry upload
          </button>
        </div>
      )}

      <button type="submit" disabled={!file || loading} className="btn-primary w-full py-3.5 min-h-[48px] disabled:opacity-50 text-base font-semibold">
        {loading ? 'Uploading…' : 'Submit confirmation'}
      </button>
    </motion.form>
  );
}
