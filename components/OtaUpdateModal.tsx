import React, { useState, useEffect } from 'react';
import { 
  CloudDownload, 
  Smartphone, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Radio, 
  Cpu, 
  Calendar, 
  Terminal,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { 
  CURRENT_BUILD, 
  getRuntimePlatform, 
  getConfiguredNetlifyUrl, 
  setConfiguredNetlifyUrl, 
  checkForNetlifyUpdate, 
  applyOtaUpdate, 
  OtaCheckResult,
  VersionInfo 
} from '../utils/otaManager';

export interface OtaUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateApplied?: () => void;
}

export const OtaUpdateModal: React.FC<OtaUpdateModalProps> = ({
  isOpen,
  onClose,
  onUpdateApplied,
}) => {
  const [platformInfo, setPlatformInfo] = useState(getRuntimePlatform());
  const [netlifyUrl, setNetlifyUrl] = useState<string>('');
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<OtaCheckResult | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'status' | 'guide'>('status');

  useEffect(() => {
    if (isOpen) {
      setPlatformInfo(getRuntimePlatform());
      const savedUrl = getConfiguredNetlifyUrl();
      setNetlifyUrl(savedUrl);
      // Auto-check on opening
      runCheck(savedUrl);
    }
  }, [isOpen]);

  const runCheck = async (urlToCheck?: string) => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const res = await checkForNetlifyUpdate(urlToCheck || netlifyUrl);
      setCheckResult(res);
    } catch {
      // Handled in utility
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveUrl = () => {
    setConfiguredNetlifyUrl(netlifyUrl);
    setIsEditingUrl(false);
    runCheck(netlifyUrl);
  };

  const handleApplyUpdate = async () => {
    setIsApplying(true);
    try {
      if (onUpdateApplied) onUpdateApplied();
      await applyOtaUpdate(netlifyUrl);
    } catch (err) {
      console.error('Failed to apply update', err);
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-[#b8d4e3] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#f0f8ff] border-b border-[#b8d4e3] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center text-[#0284c7]">
              <CloudDownload size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-mono font-bold text-[#0f172a] tracking-tight">
                  Netlify OTA Updates
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] uppercase">
                  {platformInfo.isNative ? 'Native Capacitor' : 'Web / PWA'}
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                Over-The-Air web bundle synchronization for mobile and desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#e0f2fe] transition-colors"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-0 bg-white border-b border-[#e2e8f0] flex items-center gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'status'
                ? 'border-[#0284c7] text-[#0284c7]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Update Status & Sync
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-2 text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-[#0284c7] text-[#0284c7]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Terminal size={13} />
            <span>Capacitor Native Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'status' && (
            <>
              {/* Platform & Local Version Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#e0f2fe] text-[#0284c7] shrink-0">
                    {platformInfo.isNative ? <Smartphone size={18} /> : <Globe size={18} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-[#64748b] uppercase block">
                      Runtime Shell
                    </span>
                    <span className="text-xs font-mono font-bold text-[#0f172a] truncate block">
                      {platformInfo.label}
                    </span>
                    <span className="text-[10px] text-[#64748b] block mt-0.5">
                      {platformInfo.isNative ? 'Capacitor Android / iOS App' : 'Browser Client Mode'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#e0f2fe] text-[#0284c7] shrink-0">
                    <Cpu size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-[#64748b] uppercase block">
                      Installed Version
                    </span>
                    <span className="text-xs font-mono font-bold text-[#0f172a] block">
                      v{CURRENT_BUILD.version} ({CURRENT_BUILD.buildHash})
                    </span>
                    <span className="text-[10px] text-[#64748b] block mt-0.5 truncate">
                      Built: {new Date(CURRENT_BUILD.buildTimestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Netlify Sync Endpoint Configuration */}
              <div className="p-4 bg-[#f0f8ff] border border-[#b8d4e3] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-[#0f172a] flex items-center gap-1.5">
                    <Radio size={14} className="text-[#0284c7]" />
                    <span>Netlify Production Endpoint</span>
                  </label>
                  {!isEditingUrl ? (
                    <button
                      onClick={() => setIsEditingUrl(true)}
                      className="text-xs font-mono text-[#0284c7] hover:underline"
                    >
                      Change URL
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveUrl}
                        className="px-2 py-0.5 bg-[#0284c7] text-white rounded text-xs font-mono font-bold shadow-xs hover:bg-[#0369a1]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setNetlifyUrl(getConfiguredNetlifyUrl());
                          setIsEditingUrl(false);
                        }}
                        className="text-xs font-mono text-[#64748b] hover:text-[#0f172a]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isEditingUrl ? (
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={netlifyUrl}
                      onChange={(e) => setNetlifyUrl(e.target.value)}
                      placeholder="https://your-app-name.netlify.app"
                      className="w-full px-3 py-2 bg-white border border-[#bae6fd] rounded-lg text-xs font-mono text-[#0f172a] focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]"
                    />
                    <span className="text-[11px] text-[#64748b] block">
                      Point this to your Netlify app URL where <code>version.json</code> is deployed.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#b8d4e3] text-xs font-mono text-[#334155]">
                    <span className="truncate">{netlifyUrl || '(Using current origin)'}</span>
                    {netlifyUrl && (
                      <a
                        href={netlifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0284c7] hover:text-[#0369a1] shrink-0 ml-2"
                        title="Open in browser"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Status & Update Action Block */}
              <div className="p-4 bg-white border border-[#e2e8f0] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0f172a] uppercase tracking-wider">
                    OTA Sync Status
                  </span>
                  <button
                    onClick={() => runCheck()}
                    disabled={isChecking || isApplying}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f8ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] rounded-lg text-xs font-mono font-semibold transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                    <span>{isChecking ? 'Checking Netlify...' : 'Check for Updates'}</span>
                  </button>
                </div>

                {/* State: Checking */}
                {isChecking && (
                  <div className="p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] flex items-center justify-center gap-3 text-xs font-mono text-[#64748b]">
                    <div className="w-4 h-4 border-2 border-[#0284c7] border-t-transparent rounded-full animate-spin"></div>
                    <span>Querying Netlify CDN for latest version manifest...</span>
                  </div>
                )}

                {/* State: Error */}
                {!isChecking && checkResult?.error && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 font-mono">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block">Could not connect to Netlify</span>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        {checkResult.error}. Make sure your Netlify site is deployed and has the <code>version.json</code> file generated in the publish directory.
                      </p>
                    </div>
                  </div>
                )}

                {/* State: Update Available */}
                {!isChecking && checkResult?.updateAvailable && (
                  <div className="p-4 bg-[#f0f8ff] border-2 border-[#0284c7] rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#0284c7] text-white">
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-bold text-[#0284c7] block">
                          New Netlify Update Ready!
                        </span>
                        <p className="text-xs text-[#334155]">
                          A fresh build was detected on Netlify with updated CAD features and structural components.
                        </p>
                      </div>
                    </div>

                    {checkResult.remote && (
                      <div className="p-2.5 bg-white rounded-lg border border-[#bae6fd] text-[11px] font-mono text-[#475569] grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#64748b] block">Remote Version:</span>
                          <span className="font-bold text-[#0f172a]">v{checkResult.remote.version}</span>
                        </div>
                        <div>
                          <span className="text-[#64748b] block">Remote Commit:</span>
                          <span className="font-bold text-[#0f172a]">{checkResult.remote.buildHash}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleApplyUpdate}
                      disabled={isApplying}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-mono font-bold transition-all shadow-md active:scale-98 disabled:opacity-50"
                    >
                      {isApplying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Applying OTA Update...</span>
                        </>
                      ) : (
                        <>
                          <CloudDownload size={14} />
                          <span>Apply Update Now (OTA)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* State: Up to Date */}
                {!isChecking && checkResult && !checkResult.updateAvailable && !checkResult.error && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs font-mono text-emerald-900">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Everything is up to date</span>
                      <span className="text-[11px] text-emerald-700 block">
                        Your app is running the newest code from Netlify ({CURRENT_BUILD.buildHash}).
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-3.5 bg-[#f0f8ff] border border-[#b8d4e3] rounded-xl space-y-2">
                <span className="font-bold text-[#0284c7] flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>How Netlify OTA Works in Native Apps</span>
                </span>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  Capacitor wraps this React CAD application inside a native Android APK or iOS IPA. With our Netlify OTA configuration:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#334155] pl-1">
                  <li><strong>Deploy to Netlify:</strong> Every time you push to GitHub, Netlify automatically builds and generates a new <code>version.json</code>.</li>
                  <li><strong>Instant Sync:</strong> The native mobile app checks Netlify and loads the updated bundle directly over-the-air.</li>
                  <li><strong>Zero App Store Waiting:</strong> Bug fixes and stage engine updates bypass Google Play / Apple Store review cycles completely.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-[#0f172a] block">
                  Building the Native Android App:
                </span>
                <div className="p-3 bg-[#0f172a] text-[#38bdf8] rounded-xl overflow-x-auto text-[11px] space-y-1">
                  <div># 1. Build the production web bundle</div>
                  <div className="text-white">npm run build</div>
                  <div className="mt-2"># 2. Sync to Android native shell</div>
                  <div className="text-white">npx cap sync android</div>
                  <div className="mt-2"># 3. Open Android Studio to compile APK / AAB</div>
                  <div className="text-white">npx cap open android</div>
                </div>
              </div>

              <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1.5">
                <span className="font-bold text-[#0f172a] flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-[#0284c7]" />
                  <span>Option A: Live Netlify Streaming Shell</span>
                </span>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  You can set <code>CAPACITOR_SERVER_URL=https://your-site.netlify.app</code> in your build environment. The native app will instantly render your live Netlify deployment with full native device API capabilities.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#94a3b8]">
            MERL MAGIC CAD • Netlify OTA Engine
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-[#b8d4e3] hover:bg-[#f0f8ff] text-[#334155] rounded-lg text-xs font-mono font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
