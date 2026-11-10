/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, Volume2, ShieldCheck, HelpCircle, Layers } from 'lucide-react';

interface DiwaliGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiwaliGuideModal: React.FC<DiwaliGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪔</span>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                How to Play AR Diwali Simulator
              </h3>
              <p className="text-[11px] text-amber-400 font-medium">
                Realistic 3D fireworks in your room with zero smoke & cruelty
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-4 space-y-4 overflow-y-auto pr-1 text-xs text-slate-300">
          {/* Step 1 */}
          <div className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs mb-0.5">
                Scan & Aim Ground Plane
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Allow camera access to superimpose fireworks into your real physical room or street. An animated golden Rangoli marker shows the exact 3D ground position.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs mb-0.5">
                Pick Your Crackers from the Armory
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Select from Flower Pots (Anaar), Ground Chakkars (Wheels), Garlands (1,000 to 10,000 Wala), Atom Bombs, Sky Rockets, or Aerial Fan Cakes in the bottom dock. Tap anywhere on the floor to place them.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs mb-0.5">
                Light with Finger Sparkler or Tap Ignite
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tap individual crackers to light their fuses, or turn on the <span className="text-amber-300 font-medium">Sparkler Tool (Phuljhadi)</span> to drag a crackling sparkler across the fuses! You can also tap <span className="text-orange-400 font-medium">Ignite All</span> for a synchronized festival show.
              </p>
            </div>
          </div>

          {/* Sound & Haptics */}
          <div className="flex gap-3 p-3 bg-amber-950/20 rounded-xl border border-amber-500/30">
            <Volume2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 text-xs mb-0.5">
                Procedural Spatial Audio & Concussive Haptics
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Every cracker features realistic sound synthesis built on Web Audio API: sizzling fuses, doppler whirrs, rapid roll-crackles, and heavy sub-bass bomb impacts with mobile vibration.
              </p>
            </div>
          </div>

          {/* Eco-Friendly Note */}
          <div className="flex gap-3 p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-300 text-xs mb-0.5">
                100% Eco-Friendly & Pet Safe
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Celebrate Diwali with all the visual splendor and festive joy, completely free of toxic chemical smoke, air pollution, burn injuries, or pet trauma.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer transition-all"
          >
            Start Fireworks
          </button>
        </div>
      </div>
    </div>
  );
};
