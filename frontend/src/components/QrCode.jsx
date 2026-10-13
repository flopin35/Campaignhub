import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { cn } from '../utils/format';

/** QR code with one-tap PNG download (print-ready, 1024px, white background). */
export default function QrCode({ value, size = 168, filename = 'campaignhub-qr', caption, className, showDownload = true, title }) {
  const ref = useRef(null);

  const download = () => {
    const svg = ref.current?.querySelector('svg');
    if (!svg) return;
    const px = 1024;
    const pad = 64;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px + (title ? 120 : 0);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, px - pad * 2, px - pad * 2);
      if (title) {
        ctx.fillStyle = '#0b1526';
        ctx.font = 'bold 44px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title.slice(0, 38), px / 2, px + 40);
        ctx.fillStyle = '#475265';
        ctx.font = '30px Inter, Arial, sans-serif';
        ctx.fillText('Scan to join the campaign', px / 2, px + 90);
      }
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${filename}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  return (
    <div className={cn('inline-flex flex-col items-center gap-3', className)}>
      <div ref={ref} className="rounded-xl bg-white p-3 border border-line">
        <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#0b1526" />
      </div>
      {caption && <p className="text-xs text-ink-3 text-center max-w-[200px]">{caption}</p>}
      {showDownload && (
        <button type="button" onClick={download} className="btn btn-secondary btn-sm">
          <Download className="w-4 h-4" /> Download PNG
        </button>
      )}
    </div>
  );
}
