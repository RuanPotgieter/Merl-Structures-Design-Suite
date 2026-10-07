import React, { useState } from 'react';
import { 
  Scan, 
  Magnet, 
  RotateCcw, 
  RotateCw, 
  Sun, 
  Compass, 
  Zap, 
  ChevronUp, 
  ChevronDown,
  Sparkles,
  HelpCircle,
  Printer,
  Layers,
  FileCheck2
} from 'lucide-react';

export interface QuickActionMenuProps {
  isWireframe: boolean;
  onToggleWireframe: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  onCameraReset: () => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  isShadows: boolean;
  onToggleShadows: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  isShadecloth?: boolean;
  onToggleShadecloth?: () => void;
  onExport3dDrawing?: () => void;
  onClientApprovalExport?: () => void;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  isWireframe,
  onToggleWireframe,
  snapToGrid,
  onToggleSnapToGrid,
  onCameraReset,
  isAutoRotate,
  onToggleAutoRotate,
  isShadows,
  onToggleShadows,
  showAxes,
  onToggleAxes,
  isShadecloth = false,
  onToggleShadecloth,
  onExport3dDrawing,
  onClientApprovalExport,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showHotkeysHint, setShowHotkeysHint] = useState(false);

  return (
    <div className="absolute top-14 left-3 z-20 select-none animate-in fade-in slide-in-from-left-2 duration-150">
      <div className="bg-white/95 backdrop-blur-md rounded-xl border border-[#b8d4e3] shadow-lg overflow-hidden transition-all duration-200 w-48 sm:w-52">
        {/* Header Bar */}
        <div className="px-3 py-2 bg-[#f0f8ff] border-b border-[#b8d4e3] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-[#0284c7]">
              <Zap size={12} className="fill-[#0284c7]" />
            </div>
            <span className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
              Quick Actions
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHotkeysHint(!showHotkeysHint)}
              className="p-1 rounded text-[#64748b] hover:text-[#0284c7] hover:bg-[#e0f2fe] transition-colors"
              title="Keyboard Shortcuts"
            >
              <HelpCircle size={12} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-[#64748b] hover:text-[#0284c7] hover:bg-[#e0f2fe] transition-colors"
              title={isCollapsed ? "Expand Quick Actions" : "Collapse Quick Actions"}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* Hotkey Guide Modal / Tooltip */}
        {showHotkeysHint && !isCollapsed && (
          <div className="px-3 py-2 bg-[#e0f2fe]/60 border-b border-[#b8d4e3] text-[11px] font-mono text-[#0369a1] flex flex-col gap-1">
            <div className="font-bold flex items-center justify-between">
              <span>Viewport Hotkeys:</span>
              <button 
                onClick={() => setShowHotkeysHint(false)}
                className="text-[#0369a1] hover:text-[#0f172a] text-[10px]"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div><kbd className="px-1 bg-white border border-[#bae6fd] rounded shadow-2xs font-bold text-[#0284c7]">W</kbd> Wireframe</div>
              <div><kbd className="px-1 bg-white border border-[#bae6fd] rounded shadow-2xs font-bold text-[#0284c7]">G</kbd> Snap Grid</div>
              <div><kbd className="px-1 bg-white border border-[#bae6fd] rounded shadow-2xs font-bold text-[#0284c7]">R</kbd> Reset Cam</div>
              <div><kbd className="px-1 bg-white border border-[#bae6fd] rounded shadow-2xs font-bold text-[#0284c7]">T</kbd> Turntable</div>
            </div>
          </div>
        )}

        {/* Action Controls List */}
        {!isCollapsed && (
          <div className="p-1.5 flex flex-col gap-1 text-xs font-mono">
            {/* 1. Wireframe Mode Toggle */}
            <button
              onClick={onToggleWireframe}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                isWireframe
                  ? 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold'
                  : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
              }`}
              title="Toggle skeletal wireframe CAD mesh mode [W]"
            >
              <div className="flex items-center gap-2">
                <Scan size={13} className={isWireframe ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span>Wireframe</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                isWireframe ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {isWireframe ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 2. Snap to Grid Toggle */}
            <button
              onClick={onToggleSnapToGrid}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                snapToGrid
                  ? 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold'
                  : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
              }`}
              title="Toggle 1.2m Kwikstage standard modular grid snapping [G]"
            >
              <div className="flex items-center gap-2">
                <Magnet size={13} className={snapToGrid ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span>Snap to Grid</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                snapToGrid ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {snapToGrid ? '1.2m' : 'OFF'}
              </span>
            </button>

            {/* 3. Camera Reset Button */}
            <button
              onClick={onCameraReset}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#ffffff] text-[#334155] hover:bg-[#0284c7] hover:text-white border border-[#e2e8f0] hover:border-[#0284c7] transition-all shadow-xs group active:scale-95"
              title="Reset camera zoom and position to default Isometric perspective [R]"
            >
              <div className="flex items-center gap-2">
                <RotateCcw size={13} className="text-[#0284c7] group-hover:text-white transition-colors" />
                <span>Camera Reset</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f1f5f9] group-hover:bg-[#0369a1] text-[#64748b] group-hover:text-white font-bold transition-colors">
                ISO
              </span>
            </button>

            <div className="h-px bg-[#e2e8f0] my-0.5" />

            {/* 4. Auto-Turntable Rotation Toggle */}
            <button
              onClick={onToggleAutoRotate}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                isAutoRotate
                  ? 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold'
                  : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
              }`}
              title="Toggle automatic 360° turntable presentation rotation [T]"
            >
              <div className="flex items-center gap-2">
                <RotateCw size={13} className={isAutoRotate ? 'text-[#0284c7] animate-spin' : 'text-[#64748b]'} />
                <span>Turntable</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                isAutoRotate ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {isAutoRotate ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 5. Contact Shadows Toggle */}
            <button
              onClick={onToggleShadows}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                isShadows
                  ? 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold'
                  : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
              }`}
              title="Toggle soft ground contact shadow rendering"
            >
              <div className="flex items-center gap-2">
                <Sun size={13} className={isShadows ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span>Shadows</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                isShadows ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {isShadows ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 6. Origin Benchmark & Axes Toggle */}
            <button
              onClick={onToggleAxes}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                showAxes
                  ? 'bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold'
                  : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
              }`}
              title="Toggle 3D coordinate origin benchmark datum and XYZ axes"
            >
              <div className="flex items-center gap-2">
                <Compass size={13} className={showAxes ? 'text-[#0284c7]' : 'text-[#64748b]'} />
                <span>Origin Axes</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                showAxes ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {showAxes ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 7. Perimeter Shadecloth Toggle */}
            {onToggleShadecloth && (
              <button
                onClick={onToggleShadecloth}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                  isShadecloth
                    ? 'bg-[#0f172a] text-white shadow-xs font-semibold'
                    : 'bg-[#ffffff] text-[#334155] hover:bg-[#f0f8ff] hover:text-[#0284c7] border border-[#e2e8f0]'
                }`}
                title="Toggle stage perimeter black shadecloth fabric skirting to conceal scaffolding"
              >
                <div className="flex items-center gap-2">
                  <Layers size={13} className={isShadecloth ? 'text-cyan-400' : 'text-[#64748b]'} />
                  <span>Shadecloth</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                  isShadecloth ? 'bg-cyan-500 text-slate-900' : 'bg-[#e2e8f0] text-[#64748b]'
                }`}>
                  {isShadecloth ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {/* 8. Export 3D Drawing & Checkpoints */}
            {onExport3dDrawing && (
              <button
                onClick={onExport3dDrawing}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#f0f8ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] shadow-xs font-semibold transition-all mt-0.5"
                title="Export & Print 3D Drawing with Crucial Checkpoints for Crew"
              >
                <div className="flex items-center gap-2">
                  <Printer size={13} className="text-[#0284c7]" />
                  <span>Crew 3D Drawing</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#0284c7] text-white">
                  PDF
                </span>
              </button>
            )}

            {/* 9. Client Approval 3D Isometric Export */}
            {onClientApprovalExport && (
              <button
                onClick={onClientApprovalExport}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#ecfdf5] hover:bg-[#d1fae5] text-[#059669] border border-[#a7f3d0] shadow-xs font-semibold transition-all mt-0.5"
                title="Export 3D Isometric View for Client Approval & Submittal"
              >
                <div className="flex items-center gap-2">
                  <FileCheck2 size={13} className="text-[#059669]" />
                  <span>Client Approval 3D</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#059669] text-white">
                  SUBMIT
                </span>
              </button>
            )}
          </div>
        )}

        {/* Collapsed Pill View */}
        {isCollapsed && (
          <div className="p-1 flex items-center justify-around bg-white">
            <button
              onClick={onToggleWireframe}
              className={`p-1.5 rounded transition-colors ${
                isWireframe ? 'text-[#0284c7] bg-[#e0f2fe]' : 'text-[#64748b] hover:text-[#0284c7]'
              }`}
              title={`Wireframe: ${isWireframe ? 'ON' : 'OFF'} [W]`}
            >
              <Scan size={14} />
            </button>
            <button
              onClick={onToggleSnapToGrid}
              className={`p-1.5 rounded transition-colors ${
                snapToGrid ? 'text-[#0284c7] bg-[#e0f2fe]' : 'text-[#64748b] hover:text-[#0284c7]'
              }`}
              title={`Snap to Grid: ${snapToGrid ? '1.2m' : 'OFF'} [G]`}
            >
              <Magnet size={14} />
            </button>
            {onToggleShadecloth && (
              <button
                onClick={onToggleShadecloth}
                className={`p-1.5 rounded transition-colors ${
                  isShadecloth ? 'text-white bg-[#0f172a]' : 'text-[#64748b] hover:text-[#0284c7]'
                }`}
                title={`Shadecloth: ${isShadecloth ? 'ON' : 'OFF'}`}
              >
                <Layers size={14} />
              </button>
            )}
            <button
              onClick={onCameraReset}
              className="p-1.5 rounded text-[#0284c7] hover:bg-[#e0f2fe] transition-colors"
              title="Reset Camera [R]"
            >
              <RotateCcw size={14} />
            </button>
            {onExport3dDrawing && (
              <button
                onClick={onExport3dDrawing}
                className="p-1.5 rounded text-[#0284c7] hover:bg-[#e0f2fe] transition-colors"
                title="Export Crew 3D Drawing"
              >
                <Printer size={14} />
              </button>
            )}
            {onClientApprovalExport && (
              <button
                onClick={onClientApprovalExport}
                className="p-1.5 rounded text-[#059669] hover:bg-[#ecfdf5] transition-colors"
                title="Client Approval 3D Export"
              >
                <FileCheck2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
