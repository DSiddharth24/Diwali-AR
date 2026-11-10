/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Sparkles, Check } from 'lucide-react';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  isARMode: boolean;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  isARMode,
}) => {
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [greetingName, setGreetingName] = useState('Happy Diwali');
  const [customMsg, setCustomMsg] = useState('Wishing you abundant light, joy, prosperity and crackling celebrations!');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Grab 3D WebGL Canvas
    const webglCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!webglCanvas) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = 1200;
    outCanvas.height = 900;
    const ctx = outCanvas.getContext('2d')!;

    // 1. Draw Background
    if (isARMode && videoElement && videoElement.videoWidth > 0) {
      // Draw camera video frame
      ctx.drawImage(videoElement, 0, 0, 1200, 900);
    } else {
      // Draw dark festive gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 900);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#0F172A');
      bgGrad.addColorStop(1, '#1E1B4B');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 900);
    }

    // 2. Draw 3D WebGL Fireworks Canvas
    ctx.drawImage(webglCanvas, 0, 0, 1200, 900);

    // 3. Ornate Golden Border & Vignette
    const vigGrad = ctx.createRadialGradient(600, 450, 300, 600, 450, 750);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, 1200, 900);

    // Golden frame border
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 1160, 860);

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 1140, 840);

    // Corner rosettes
    const corners = [
      [30, 30],
      [1170, 30],
      [30, 870],
      [1170, 870],
    ];
    ctx.fillStyle = '#F59E0B';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Festive Greeting Banner at Bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(80, 740, 1040, 100);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 740, 1040, 100);

    // Typography
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 36px "Outfit", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`✨ ${greetingName} ✨`, 600, 782);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(customMsg, 600, 818);

    // Eco-Friendly AR watermark
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('🌿 100% Eco-Friendly AR Diwali Simulator', 1140, 856);

    const dataUrl = outCanvas.toDataURL('image/png');
    setImageSrc(dataUrl);
    compositeCanvasRef.current = outCanvas;
  }, [isOpen, isARMode, videoElement, greetingName, customMsg]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!imageSrc) return;
    const a = document.createElement('a');
    a.href = imageSrc;
    a.download = `Diwali_AR_Card_${Date.now()}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!imageSrc) return;
    try {
      if (navigator.share) {
        const blob = await (await fetch(imageSrc)).blob();
        const file = new File([blob], 'diwali_greeting.png', { type: 'image/png' });
        await navigator.share({
          title: 'Happy Diwali AR Greeting',
          text: 'Superimposing real Diwali crackers with AR! Wishing you a Happy Diwali!',
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      // Fallback
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪔</span>
            <h3 className="text-base font-bold text-white font-display">
              Capture Diwali AR Greeting Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview */}
        <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-center min-h-[220px]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Diwali AR Snapshot Card"
              className="w-full h-auto max-h-[50vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500 text-xs py-8">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              <span>Rendering 3D Fireworks Snapshot...</span>
            </div>
          )}
        </div>

        {/* Custom Greeting text inputs */}
        <div className="space-y-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Title Greeting
            </label>
            <input
              type="text"
              value={greetingName}
              onChange={(e) => setGreetingName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              placeholder="e.g. Happy Diwali from Sharma Family"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Festive Wish
            </label>
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none"
              placeholder="Custom Diwali wish..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Back to Simulator
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isCopied ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download High-Res Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
