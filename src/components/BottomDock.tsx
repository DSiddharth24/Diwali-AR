/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  anaar_golden: { label: 'Gold Anaar', icon: '🏺' },
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
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  // Mouse drag tracking
  const pointerStartRef = useRef<{ x: number; y: number; cracker: CrackerDefinition } | null>(null);

  // Mobile Touch drag tracking
  const touchStartRef = useRef<{ x: number; y: number; cracker: CrackerDefinition; isUpwardDrag: boolean } | null>(null);

  const unlitCount = placedCrackers.filter((p) => p.state === 'idle').length;
  const spentCount = placedCrackers.filter((p) => p.state === 'spent').length;

  // Window-level mouse pointer listeners for drag movement & release
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // Handled by explicit touch listeners for maximum reliability
      if (!pointerStartRef.current) return;

      const dx = e.clientX - pointerStartRef.current.x;
      const dy = e.clientY - pointerStartRef.current.y;

      if (!isDraggingRef.current && (Math.hypot(dx, dy) > 10 || dy < -10)) {
        isDraggingRef.current = true;
        setActiveDraggingCracker(pointerStartRef.current.cracker);
        onDragStartCracker(pointerStartRef.current.cracker, e.clientX, e.clientY);
      }

      if (isDraggingRef.current) {
        setDragPos({ x: e.clientX, y: e.clientY });
        onDragMoveCracker(e.clientX, e.clientY);
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (isDraggingRef.current && pointerStartRef.current) {
        onDragEndCracker(e.clientX, e.clientY);
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 300);
      }
      isDraggingRef.current = false;
      pointerStartRef.current = null;
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

  // Mobile Touch Handlers
  const handleTouchStart = (cracker: CrackerDefinition, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      cracker,
      isUpwardDrag: false,
    };
    onSelectCracker(cracker);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Detect if user intends to drag upward onto the 3D terrace ground
    if (!isDraggingRef.current) {
      if (dy < -10 || (Math.abs(dy) > Math.abs(dx) && Math.hypot(dx, dy) > 12)) {
        isDraggingRef.current = true;
        touchStartRef.current.isUpwardDrag = true;
        setActiveDraggingCracker(touchStartRef.current.cracker);
        onDragStartCracker(touchStartRef.current.cracker, touch.clientX, touch.clientY);
      }
    }

    if (isDraggingRef.current) {
      // Prevent browser default scroll while dragging cracker onto 3D scene
      if (e.cancelable) e.preventDefault();
      setDragPos({ x: touch.clientX, y: touch.clientY });
      onDragMoveCracker(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (isDraggingRef.current && touchStartRef.current) {
      onDragEndCracker(touch.clientX, touch.clientY);
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
    } else if (touchStartRef.current && !touchStartRef.current.isUpwardDrag) {
      // Clean mobile tap: trigger fast drop and fire directly
      onFastDropAndFire(touchStartRef.current.cracker);
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
    }

    isDraggingRef.current = false;
    touchStartRef.current = null;
    setActiveDraggingCracker(null);
    setDragPos(null);
  };

  const handleCrackerClick = (cracker: CrackerDefinition) => {
    if (suppressClickRef.current) return;
    onSelectCracker(cracker);
    onFastDropAndFire(cracker);
  };

  return (
    <>
      {/* Floating Drag Avatar following touch / cursor */}
      {activeDraggingCracker && dragPos && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl text-white font-bold text-xs backdrop-blur-md animate-pulse"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <span className="text-lg">🔥</span>
          <span className="text-amber-300 font-bold whitespace-nowrap">{activeDraggingCracker.name}</span>
        </div>
      )}

      {/* Ultra-Short, Sleek & Accessible Bottom Dock */}
      <div
        className={`fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-2 transition-transform duration-300 ease-out pointer-events-auto ${
          isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Minimalist Collapse Handle Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-3 py-0.5 text-[10px] font-semibold text-amber-200/90 bg-slate-950/90 hover:bg-slate-900 border border-amber-500/25 border-b-0 rounded-t-lg shadow-md backdrop-blur-md cursor-pointer transition-colors"
            title={isCollapsed ? 'Show crackers' : 'Hide crackers dock'}
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

        {/* Compact Single-Tier Dock Container (Height ~56px) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-amber-500/25 shadow-2xl">
          {/* Quick Tools on Left: Auto-Ignite & Sparkler */}
          <div className="flex items-center gap-1 shrink-0 pl-0.5">
            {/* Auto-Ignite Toggle */}
            <button
              onClick={onToggleAutoIgnite}
              className={`flex flex-col items-center justify-center w-10 h-11 rounded-xl text-[9px] font-bold transition-all cursor-pointer border ${
                autoIgniteEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title={`Auto-Ignition is ${autoIgniteEnabled ? 'ON' : 'OFF'}`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoIgniteEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="scale-90 leading-none mt-0.5">{autoIgniteEnabled ? 'Auto' : 'Manual'}</span>
            </button>

            {/* Sparkler Toggle */}
            <button
              onClick={onToggleSparkler}
              className={`flex flex-col items-center justify-center w-10 h-11 rounded-xl text-[9px] font-bold transition-all cursor-pointer border ${
                isSparklerMode
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 border-amber-300 shadow-md shadow-amber-400/25'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title="Sparkler mode: touch any cracker to light fuse"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="scale-90 leading-none mt-0.5">Spark</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-slate-800 shrink-0" />

          {/* Center: Horizontally Scrollable Cracker Items */}
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-0.5 flex-1 min-w-0"
            style={{ touchAction: 'pan-x' }}
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
                    if (e.pointerType !== 'touch') {
                      pointerStartRef.current = { x: e.clientX, y: e.clientY, cracker };
                      onSelectCracker(cracker);
                    }
                  }}
                  onTouchStart={(e) => handleTouchStart(cracker, e)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onClick={() => handleCrackerClick(cracker)}
                  className={`flex flex-col items-center justify-center w-[52px] sm:w-[58px] h-11 rounded-xl border shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                  title={`${cracker.name} (${cracker.hindiName}) - Tap to place & fire or drag onto terrace`}
                >
                  <span className="text-base leading-none">{meta.icon}</span>
                  <span className="text-[8px] font-bold text-slate-200 truncate w-full text-center px-0.5 mt-0.5 leading-none">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-slate-800 shrink-0" />

          {/* Right Action: Instant Launch & Clear */}
          <div className="flex items-center gap-1 shrink-0 pr-0.5">
            {/* Primary Instant Fire Button */}
            <button
              onClick={() => onFastDropAndFire(selectedCracker)}
              className="flex flex-col items-center justify-center w-12 h-11 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:brightness-110 active:scale-95 text-white font-bold text-[9px] shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              title="Launch selected cracker immediately"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-extrabold uppercase tracking-tight scale-90 mt-0.5">Fire</span>
            </button>

            {/* Clear or Ignite All */}
            {unlitCount > 0 ? (
              <button
                onClick={onIgniteAll}
                className="flex items-center justify-center w-8 h-11 rounded-xl bg-gradient-to-b from-orange-500 to-red-600 text-white font-bold text-[10px] cursor-pointer shadow-md active:scale-95"
                title={`Ignite all ${unlitCount} crackers`}
              >
                <span>{unlitCount}</span>
              </button>
            ) : spentCount > 0 ? (
              <button
                onClick={onClearSpent}
                className="flex items-center justify-center w-8 h-11 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                title="Clear burned crackers"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : placedCrackers.length > 0 ? (
              <button
                onClick={onClearAll}
                className="flex items-center justify-center w-8 h-11 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
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
