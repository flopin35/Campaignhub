import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../context/ToastContext';
import { buildCampaignUrl } from '../utils/sharing';

export default function QRCodeCard({ slug, title, campaignId }) {
  const qrRef = useRef(null);
  const { toast } = useToast();
  const url = buildCampaignUrl(slug, 'qr');

  const getSvgElement = () => qrRef.current?.querySelector('svg');

  const handleDownload = () => {
    const svg = getSvgElement();
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(blobUrl);
      const link = document.createElement('a');
      link.download = `campaignhub-${slug}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('QR code downloaded', 'success');
    };
    img.src = blobUrl;
  };

  const handleCopyImage = async () => {
    const svg = getSvgElement();
    if (!svg) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = blobUrl;
      });

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(blobUrl);

      canvas.toBlob(async (pngBlob) => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
        toast('QR code copied to clipboard', 'success');
      });
    } catch {
      toast('Copy not supported — use Download instead', 'warning');
    }
  };

  const handlePrint = () => {
    const svg = getSvgElement();
    if (!svg) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>QR - ${title}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
        <h2>${title}</h2>
        ${svg.outerHTML}
        <p style="margin-top:16px;font-size:14px;color:#666;">${url}</p>
        <p style="font-size:12px;color:#999;">Scan to view campaign on CampaignHub</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    toast('Print dialog opened', 'info');
  };

  return (
    <div className="glass-card text-center" id="qr-print-area">
      <h3 className="text-sm font-medium text-gray-300 mb-1">Campaign QR Code</h3>
      <p className="text-xs text-gray-500 mb-4">Use on flyers, posters, banners & billboards</p>

      <div ref={qrRef} className="inline-block p-4 bg-white rounded-xl shadow-lg">
        <QRCodeSVG value={url} size={180} level="H" includeMargin />
      </div>

      <p className="text-xs text-gray-500 mt-3 truncate max-w-xs mx-auto">{url}</p>

      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <button onClick={handleDownload} className="btn-primary text-xs py-2 px-4">
          Download QR
        </button>
        <button onClick={handleCopyImage} className="btn-secondary text-xs py-2 px-4">
          Copy QR Image
        </button>
        <button onClick={handlePrint} className="btn-secondary text-xs py-2 px-4">
          Print QR
        </button>
      </div>
    </div>
  );
}
