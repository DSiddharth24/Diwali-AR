/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCamera } from './hooks/useCamera';
import { ARCanvas, ARCanvasHandle } from './components/ARCanvas';
import { TopHUD } from './components/TopHUD';
import { BottomDock } from './components/BottomDock';
import { SnapshotModal } from './components/SnapshotModal';
import { DiwaliGuideModal } from './components/DiwaliGuideModal';
import { CRACKER_DEFINITIONS, CrackerDefinition, PlacedCracker } from './types/crackers';
import { ParticleEngine } from './three/particleEngine';
import { fireworkAudio } from './audio/fireworkAudio';
import { Camera, Sparkles, Zap } from 'lucide-react';

export default function App() {
  const {
    videoRef,
    isStreaming,
    hasPermission,
    permissionError,
    facingMode,
    toggleFacingMode,
    startCamera,
  } = useCamera();

  // Selected cracker for placement
  const [selectedCracker, setSelectedCracker] = useState<CrackerDefinition>(CRACKER_DEFINITIONS[0]);
  const [placedCrackers, setPlacedCrackers] = useState<PlacedCracker[]>([]);
  const [isARCameraMode, setIsARCameraMode] = useState<boolean>(true);
  const [isSparklerMode, setIsSparklerMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSkyViewActive, setIsSkyViewActive] = useState<boolean>(false);

  // Drag and Drop state
  const [draggedCracker, setDraggedCracker] = useState<CrackerDefinition | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);

  // Auto-Ignite state (True by default per user's explicit request: "it should lit up automatically and it shouldn't wait for me to lit up")
  const [autoIgniteEnabled, setAutoIgniteEnabled] = useState<boolean>(true);

  const particleEngineRef = useRef<ParticleEngine | null>(null);
  const canvasHandleRef = useRef<ARCanvasHandle | null>(null);

  // If camera permission fails or is not available, default gracefully to Virtual Terrace Mode
  useEffect(() => {
    if (permissionError) {
      console.info('Switching to Virtual Terrace Mode due to camera restriction.');
      setIsARCameraMode(false);
    }
  }, [permissionError]);

  // Ignite individual cracker
  const handleIgniteCracker = useCallback((instanceId: string) => {
    setPlacedCrackers((prev) =>
      prev.map((c) =>
        c.instanceId === instanceId && c.state === 'idle'
          ? { ...c, state: 'burning_fuse', stateStartTime: performance.now() / 1000 }
          : c
      )
    );
    if (particleEngineRef.current) {
      particleEngineRef.current.igniteCracker(instanceId);
    }
  }, []);

  // Handle cracker placement with instant auto-ignition
  const handleCrackerPlaced = useCallback((newPlaced: PlacedCracker) => {
    setPlacedCrackers((prev) => [...prev, newPlaced]);
    fireworkAudio.playDropSound();

    // Auto-ignite immediately per user request!
    if (autoIgniteEnabled) {
      setTimeout(() => {
        handleIgniteCracker(newPlaced.instanceId);
      }, 50);
    }
  }, [handleIgniteCracker, autoIgniteEnabled]);

  // Drag and drop handlers from the bottom dock
  const handleDragStartCracker = useCallback((cracker: CrackerDefinition, x: number, y: number) => {
    setDraggedCracker(cracker);
    setDragPointer({ x, y });
  }, []);

  const handleDragMoveCracker = useCallback((x: number, y: number) => {
    setDragPointer({ x, y });
  }, []);

  const handleDragEndCracker = useCallback((x: number, y: number) => {
    if (draggedCracker && canvasHandleRef.current) {
      // Check if dropped onto the 3D scene (above the bottom dock bar)
      const groundPos = canvasHandleRef.current.getGroundPositionFromScreen(x, y);

      const newPlaced: PlacedCracker = {
        instanceId: `cracker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        crackerId: draggedCracker.id,
        position: groundPos,
        rotationY: Math.random() * Math.PI * 2,
        state: 'idle',
        stateStartTime: performance.now() / 1000,
        elapsedTime: 0,
        burnProgress: 0,
      };

      handleCrackerPlaced(newPlaced);
    }

    setDraggedCracker(null);
    setDragPointer(null);
  }, [draggedCracker, handleCrackerPlaced]);

  // Fast drop and fire right in front of camera
  const handleFastDropAndFire = useCallback((cracker: CrackerDefinition) => {
    setSelectedCracker(cracker);
    // Position directly in comfortable foreground view
    const newPlaced: PlacedCracker = {
      instanceId: `cracker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      crackerId: cracker.id,
      position: [(Math.random() - 0.5) * 1.0, 0, -2.2 + (Math.random() - 0.5) * 0.6],
      rotationY: Math.random() * Math.PI * 2,
      state: 'idle',
      stateStartTime: performance.now() / 1000,
      elapsedTime: 0,
      burnProgress: 0,
    };
    handleCrackerPlaced(newPlaced);
  }, [handleCrackerPlaced]);

  // Ignite all placed crackers in a staggered festive barrage
  const handleIgniteAll = useCallback(() => {
    placedCrackers.forEach((c, idx) => {
      if (c.state === 'idle') {
        setTimeout(() => {
          handleIgniteCracker(c.instanceId);
        }, idx * 250);
      }
    });
  }, [placedCrackers, handleIgniteCracker]);

  // Clear spent crackers
  const handleClearSpent = useCallback(() => {
    setPlacedCrackers((prev) => prev.filter((c) => c.state !== 'spent'));
    if (particleEngineRef.current) {
      particleEngineRef.current.clearAllSpent();
    }
  }, []);

  // Clear all crackers
  const handleClearAll = useCallback(() => {
    setPlacedCrackers([]);
    if (particleEngineRef.current) {
      particleEngineRef.current.clearAll();
    }
  }, []);

  // Toggle Sound Mute
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    fireworkAudio.setMuted(next);
  }, [isMuted]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 's' || e.key === 'S') {
        setIsSparklerMode((prev) => !prev);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleIgniteAll();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClearSpent();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'a' || e.key === 'A') {
        setAutoIgniteEnabled((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleIgniteAll, handleClearSpent, handleToggleMute]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Background Camera Video Feed (AR Superimposition) */}
      {isARCameraMode && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-100"
            autoPlay
            playsInline
            muted
          />
          {/* Subtle contrast grading for camera feed */}
          <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
        </div>
      )}

      {/* Camera Permission / Connecting Hint Banner if in AR mode but stream not ready */}
      {isARCameraMode && !isStreaming && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              <Camera className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white font-display">
              Enable Camera for Real-World AR
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Superimpose realistic 3D Diwali fireworks directly onto your room floor, patio, or outdoor street!
            </p>
            {permissionError && (
              <p className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20">
                Camera notice: {permissionError}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={startCamera}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer transition-all"
              >
                Allow Camera
              </button>
              <button
                onClick={() => setIsARCameraMode(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer"
              >
                Use Virtual Terrace Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Layer (Three.js with Fireworks Particle Physics) */}
      <div className="absolute inset-0 z-20">
        <ARCanvas
          selectedCracker={selectedCracker}
          isARCameraMode={isARCameraMode}
          isSparklerMode={isSparklerMode}
          placedCrackers={placedCrackers}
          onCrackerPlaced={handleCrackerPlaced}
          onIgniteCracker={handleIgniteCracker}
          particleEngineRef={particleEngineRef}
          draggedCracker={draggedCracker}
          dragPointer={dragPointer}
          canvasHandleRef={canvasHandleRef}
          isSkyViewActive={isSkyViewActive}
        />
      </div>

      {/* Sparkler Mode Floating Helper Badge (Only when Sparkler is active) */}
      {isSparklerMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-25 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xl animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sparkler Active: Touch any fuse to ignite!</span>
        </div>
      )}

      {/* Top HUD (Clean floating capsule with Mode Switcher, Sky View, Sound, Snapshot & Guide) */}
      <TopHUD
        isARCameraMode={isARCameraMode}
        onToggleARMode={() => setIsARCameraMode((prev) => !prev)}
        facingMode={facingMode}
        onToggleFacingMode={toggleFacingMode}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenSnapshot={() => setIsSnapshotOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        isSkyViewActive={isSkyViewActive}
        onToggleSkyView={() => setIsSkyViewActive((prev) => !prev)}
      />

      {/* Bottom Dock (Collapsible Drawer with Cracker Armory, Drag-and-Drop & Actions) */}
      <BottomDock
        selectedCracker={selectedCracker}
        onSelectCracker={setSelectedCracker}
        placedCrackers={placedCrackers}
        onIgniteAll={handleIgniteAll}
        onClearSpent={handleClearSpent}
        onClearAll={handleClearAll}
        isSparklerMode={isSparklerMode}
        onToggleSparkler={() => setIsSparklerMode((prev) => !prev)}
        autoIgniteEnabled={autoIgniteEnabled}
        onToggleAutoIgnite={() => setAutoIgniteEnabled((prev) => !prev)}
        onFastDropAndFire={handleFastDropAndFire}
        onDragStartCracker={handleDragStartCracker}
        onDragMoveCracker={handleDragMoveCracker}
        onDragEndCracker={handleDragEndCracker}
      />

      {/* Snapshot / Greeting Card Generator Modal */}
      <SnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        videoElement={videoRef.current}
        isARMode={isARCameraMode}
      />

      {/* Diwali Crackers Guide Modal */}
      <DiwaliGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </main>
  );
}
