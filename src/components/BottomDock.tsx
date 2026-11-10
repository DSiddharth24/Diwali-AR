/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  CrackerDefinition,
  CRACKER_DEFINITIONS,
  PlacedCracker,
} from '../types/crackers';
import {
  Flame,
  Sparkles,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BottomDockProps {
  selectedCracker: CrackerDefinition;
  onSelectCracker: (cracker: CrackerDefinition) => void;
  placedCrackers: PlacedCracker[];
  onIgniteAll: () => void;
  onClearSpent: () => void;
  onClearAll: () => void;
  isSparklerMode: boolean;
  onToggleSparkler: () => void;
  autoIgniteEnabled: boolean;
  onToggleAutoIgnite: () => void;
  onFastDropAndFire: (cracker: CrackerDefinition) => void;
  onDragStartCracker: (cracker: CrackerDefinition, x: number, y: number) => void;
  onDragMoveCracker: (x: number, y: number) => void;
  onDragEndCracker: (x: number, y: number) => void;
}

const CRACKER_SHORT_LABELS: Record<string, { label: string; icon: string }> = {
  anaar_gold: { label: 'Gold Anaar', icon: '🏺' },
  anaar_silver: { label: 'Silver Anaar', icon: '✨' },
  anaar_tricolor: { label: 'Tricolor Anaar', icon: '🇮🇳' },
  chakkar_deluxe: { label: 'Chakkar', icon: '🌀' },
  chakkar_rainbow: { label: 'Rainbow Wheel', icon: '🌈' },
  garland_1000: { label: '1,000 Ladi', icon: '🧨' },
  garland_5000: { label: '5,000 Mega', icon: '💥' },
  bomb_atom: { label: 'Atom Bomb', icon: '💣' },
  bomb_hydro: { label: 'Hydro Bomb', icon: '🌊' },
  rocket_whistle: { label: 'Sky Rocket', icon: '🚀' },
  rocket_titanium: { label: 'Titanium Rocket', icon: '⭐' },
  cake_fan_12: { label: '12-Fan Cake', icon: '🎆' },
  cake_grand_25: { label: '25 Symphony', icon: '🎇' },
};

export const BottomDock: React.FC<BottomDockProps> = ({
  selectedCracker,
  onSelectCracker,
  placedCrackers,
  onIgniteAll,
  onClearSpent,
  onClearAll,
  isSparklerMode,
  onToggleSparkler,
  autoIgniteEnabled,
  onToggleAutoIgnite,
  onFastDropAndFire,
  onDragStartCracker,
  onDragMoveCracker,
  onDragEndCracker,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeDraggingCracker, setActiveDraggingCracker] = useState<CrackerDefinition | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragPointerStart = useRef<{ x: number; y: number; cracker: CrackerDefinition } | null>(null);
  const isDraggingRef = useRef(false);

  const unlitCount = placedCrackers.filter((p) => p.state === 'idle').length;
  const spentCount = placedCrackers.filter((p) => p.state === 'spent').length;

  // Window-level listeners for drag movement & release
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!dragPointerStart.current) return;
      const dx = e.clientX - dragPointerStart.current.x;
      const dy = e.clientY - dragPointerStart.current.y;

      if (!isDraggingRef.current && (Math.hypot(dx, dy) > 12 || dy < -12)) {
        isDraggingRef.current = true;
        setActiveDraggingCracker(dragPointerStart.current.cracker);
        onDragStartCracker(dragPointerStart.current.cracker, e.clientX, e.clientY);
      }

      if (isDraggingRef.current) {
        setDragPos({ x: e.clientX, y: e.clientY });
        onDragMoveCracker(e.clientX, e.clientY);
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (isDraggingRef.current && dragPointerStart.current) {
        onDragEndCracker(e.clientX, e.clientY);
      }
      isDraggingRef.current = false;
      dragPointerStart.current = null;
      setActiveDraggingCracker(null);
      setDragPos(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [onDragStartCracker, onDragMoveCracker, onDragEndCracker]);

  return (
    <>
      {/* Floating Drag Avatar that follows touch/cursor */}
      {activeDraggingCracker && dragPos && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-amber-400 shadow-2xl text-white font-bold text-xs backdrop-blur-md"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <span className="text-base">🔥</span>
          <span className="text-amber-300 font-bold">{activeDraggingCracker.name}</span>
        </div>
      )}

      {/* Ultra-Short, Simple & Accessible Bottom Dock */}
      <div
        className={`fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-2 sm:px-4 transition-transform duration-300 ease-out pointer-events-auto ${
          isCollapsed ? 'translate-y-[calc(100%-32px)]' : 'translate-y-0'
        }`}
      >
        {/* Minimalist Collapse Handle Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-amber-200/90 bg-slate-950/85 hover:bg-slate-900 border border-amber-500/25 border-b-0 rounded-t-xl shadow-md backdrop-blur-md cursor-pointer transition-colors"
            title={isCollapsed ? 'Show cracker armory' : 'Minimize armory bar'}
          >
            {isCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3 text-amber-400" />
                <span>Crackers</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-amber-400" />
                <span>Hide</span>
              </>
            )}
          </button>
        </div>

        {/* Single-Tier Compact Pill Container (Height ~68px) */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-amber-500/25 shadow-2xl">
          {/* Quick Tools on Left: Auto-Ignite & Sparkler */}
          <div className="flex items-center gap-1 shrink-0 pl-0.5">
            {/* Auto-Ignite Toggle Button */}
            <button
              onClick={onToggleAutoIgnite}
              className={`flex flex-col items-center justify-center w-11 h-12 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                autoIgniteEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title={`Auto-Ignition is ${autoIgniteEnabled ? 'ON: taps fire immediately' : 'OFF'}`}
            >
              <Zap className={`w-4 h-4 ${autoIgniteEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="scale-90 leading-none mt-0.5">{autoIgniteEnabled ? 'Auto' : 'Manual'}</span>
            </button>

            {/* Sparkler Tool Button */}
            <button
              onClick={onToggleSparkler}
              className={`flex flex-col items-center justify-center w-11 h-12 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                isSparklerMode
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-300 shadow-md shadow-amber-400/25'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title="Sparkler mode: touch any cracker to light fuse"
            >
              <Sparkles className="w-4 h-4" />
              <span className="scale-90 leading-none mt-0.5">Spark</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-800 shrink-0" />

          {/* Center: Horizontal Scrollable Cracker Items */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 flex-1 min-w-0"
          >
            {CRACKER_DEFINITIONS.map((cracker) => {
              const isSelected = selectedCracker.id === cracker.id;
              const meta = CRACKER_SHORT_LABELS[cracker.id] || {
                label: cracker.name.split(' ')[0],
                icon: '🔥',
              };

              return (
                <button
                  key={cracker.id}
                  onPointerDown={(e) => {
                    dragPointerStart.current = { x: e.clientX, y: e.clientY, cracker };
                    onSelectCracker(cracker);
                  }}
                  onClick={() => {
                    onSelectCracker(cracker);
                    // Instant tap launch
                    onFastDropAndFire(cracker);
                  }}
                  className={`flex flex-col items-center justify-center w-[54px] sm:w-[60px] h-12 rounded-xl border shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                  title={`${cracker.name} (${cracker.hindiName}) - Tap to launch or drag`}
                >
                  <span className="text-lg leading-none">{meta.icon}</span>
                  <span className="text-[9px] font-bold text-slate-200 truncate w-full text-center px-0.5 mt-0.5 leading-none">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-800 shrink-0" />

          {/* Right Action: Instant Launch & Clean */}
          <div className="flex items-center gap-1 shrink-0 pr-0.5">
            {/* Primary Instant Fire Button */}
            <button
              onClick={() => onFastDropAndFire(selectedCracker)}
              className="flex flex-col items-center justify-center w-13 h-12 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:brightness-110 active:scale-95 text-white font-bold text-[10px] shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              title="Launch selected cracker immediately"
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span className="font-extrabold uppercase tracking-tight scale-95 mt-0.5">Fire</span>
            </button>

            {/* Optional Ignite All or Clear Button */}
            {unlitCount > 0 ? (
              <button
                onClick={onIgniteAll}
                className="flex items-center justify-center w-8 h-12 rounded-xl bg-gradient-to-b from-orange-500 to-red-600 text-white font-bold text-[10px] cursor-pointer shadow-md active:scale-95"
                title={`Ignite all ${unlitCount} crackers`}
              >
                <span>{unlitCount}</span>
              </button>
            ) : spentCount > 0 ? (
              <button
                onClick={onClearSpent}
                className="flex items-center justify-center w-8 h-12 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                title="Clear burned crackers"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : placedCrackers.length > 0 ? (
              <button
                onClick={onClearAll}
                className="flex items-center justify-center w-8 h-12 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
