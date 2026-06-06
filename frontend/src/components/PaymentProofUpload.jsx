import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ImageDropzone from './ImageDropzone';
import UploadProgressBar from './UploadProgressBar';

export default function PaymentProofUpload({ onSubmit, loading, uploadProgress = 0, uploadError = '' }) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="glass-card p-6 space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-white">Upload Payment Proof</h2>
        <p className="text-sm text-gray-400 mt-1">Upload a screenshot of your mobile money payment confirmation.</p>
      </div>

      <ImageDropzone
        label="Payment Screenshot *"
        hint="JPG, PNG, WEBP — max 5MB"
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

      <button type="submit" disabled={!file || loading} className="btn-primary w-full py-3 disabled:opacity-50">
        {loading ? 'Uploading…' : 'Submit Proof'}
      </button>
    </motion.form>
  );
}
