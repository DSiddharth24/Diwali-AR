/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface TopHUDProps {
  isARCameraMode: boolean;
  onToggleARMode: () => void;
  facingMode: 'environment' | 'user';
  onToggleFacingMode: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSnapshot: () => void;
  onOpenGuide: () => void;
  isSkyViewActive?: boolean;
  onToggleSkyView?: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  isARCameraMode,
  onToggleARMode,
  facingMode,
  onToggleFacingMode,
  isMuted,
  onToggleMute,
  onOpenSnapshot,
  onOpenGuide,
  isSkyViewActive = false,
  onToggleSkyView,
}) => {
  return (
    <header className="fixed top-2.5 sm:top-3.5 left-0 right-0 z-30 px-3 sm:px-6 pointer-events-none">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-amber-500/20 shadow-2xl pointer-events-auto">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/25 text-base select-none">
            🪔
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap font-display leading-tight">
              Diwali AR
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium tracking-wide hidden sm:inline">
              3D Fireworks Simulator
            </span>
          </div>
        </div>

        {/* Center: Environment Mode & Perspective Control */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <button
              onClick={onToggleARMode}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isARCameraMode
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Superimpose 3D fireworks directly over your live camera feed"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>AR Camera</span>
            </button>

            <button
              onClick={onToggleARMode}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                !isARCameraMode
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Experience fireworks in the 3D night terrace courtyard"
            >
              <CameraOff className="w-3.5 h-3.5" />
              <span>3D Terrace</span>
            </button>
          </div>

          {/* Perspective Sub-Action: Sky View toggle for Terrace mode */}
          {!isARCameraMode && onToggleSkyView && (
            <button
              onClick={onToggleSkyView}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                isSkyViewActive
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
              }`}
              title="Tilt camera directly up into the night sky to admire high aerial fireworks"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Sky View</span>
            </button>
          )}

          {/* Camera Flip Button (Only in AR mode) */}
          {isARCameraMode && (
            <button
              onClick={onToggleFacingMode}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer shrink-0 transition-colors"
              title={`Switch camera: currently ${facingMode}`}
            >
              <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline capitalize">{facingMode}</span>
            </button>
          )}
        </div>

        {/* Right: Audio, Greeting Card, and Help Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isMuted
                ? 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isMuted ? 'Unmute fireworks audio' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Greeting Card Photo Snapshot Button */}
          <button
            onClick={onOpenSnapshot}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">Diwali Card</span>
            <span className="sm:hidden">Card</span>
          </button>

          {/* Guide Modal Button */}
          <button
            onClick={onOpenGuide}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Diwali Fireworks Guide & Instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
