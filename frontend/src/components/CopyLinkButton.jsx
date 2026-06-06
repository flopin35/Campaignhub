import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { trackLinkCopy } from '../services/analyticsService';
import { Check } from './icons/AppIcons';

export default function CopyLinkButton({ url, campaignId, label = 'Copy Campaign Link', className = '' }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (campaignId) trackLinkCopy(campaignId).catch(console.error);
      toast('Campaign link copied successfully', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      if (campaignId) trackLinkCopy(campaignId).catch(console.error);
      toast('Campaign link copied successfully', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleCopy} className={`btn-secondary text-sm inline-flex items-center gap-2 ${className}`}>
      {copied && <Check className="w-4 h-4" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}
