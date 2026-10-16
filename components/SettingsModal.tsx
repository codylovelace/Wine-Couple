'use client';

import React, { useState, useEffect } from 'react';
import { UserSettings, Wine } from '@/lib/types';
import { 
  X, User, Key, Download, Upload, 
  Check, Heart, DollarSign
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  wines: Wine[];
  onImportWines: (imported: Wine[]) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  wines,
  onImportWines,
}: SettingsModalProps) {
  const [partner1Name, setPartner1Name] = useState(settings.partner1Name);
  const [partner2Name, setPartner2Name] = useState(settings.partner2Name);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency || '£');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setPartner1Name(settings.partner1Name);
    setPartner2Name(settings.partner2Name);
    setDefaultCurrency(settings.defaultCurrency || '£');
    setGeminiApiKey(settings.geminiApiKey || '');
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      partner1Name: partner1Name.trim() || 'Partner 1',
      partner2Name: partner2Name.trim() || 'Partner 2',
      partner1Avatar: partner1Name.trim() ? partner1Name.trim().charAt(0) : 'C',
      partner2Avatar: partner2Name.trim() ? partner2Name.trim().charAt(0) : 'J',
      defaultCurrency,
      geminiApiKey: geminiApiKey.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ wines, settings }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vino-couple-journal-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.wines && Array.isArray(parsed.wines)) {
          onImportWines(parsed.wines);
          if (parsed.settings) onSaveSettings(parsed.settings);
          alert(`Successfully imported ${parsed.wines.length} wines.`);
          onClose();
        } else if (Array.isArray(parsed)) {
          onImportWines(parsed);
          alert(`Successfully imported ${parsed.length} wines.`);
          onClose();
        }
      } catch (err) {
        alert('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md max-h-[90vh] bg-[#0f0a0d] border border-champagne-500/25 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-champagne-500/15 flex items-center justify-between bg-[#0f0a0d]/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-wine-900/70 border border-champagne-500/35 flex items-center justify-center text-champagne-gold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-semibold text-lg text-stone-100 tracking-wide">
                Couple & Cellar Preferences
              </h2>
              <p className="text-xs text-stone-300 font-sans">
                Personalize partner names, currency, and AI features
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-900 text-stone-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {/* Couple Profiles */}
          <div className="p-4 rounded-3xl luxury-card space-y-3">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-champagne-gold" />
              <span>Partner Profiles</span>
            </h3>

            {/* Partner 1 */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Your Name</label>
              <input
                type="text"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
                placeholder="e.g. Cody"
                className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
              />
            </div>

            {/* Partner 2 */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] text-stone-300 uppercase font-sans font-medium tracking-wider">Partner's Name</label>
              <input
                type="text"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
                placeholder="e.g. Jess"
                className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-sans"
              />
            </div>
          </div>

          {/* Default Currency */}
          <div className="p-4 rounded-3xl luxury-card space-y-2">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-champagne-gold" />
              <span>Cellar Currency</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {['£', '$', '€', 'A$'].map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setDefaultCurrency(curr)}
                  className={`py-2.5 rounded-xl text-xs font-sans font-bold border transition-all ${
                    defaultCurrency === curr
                      ? 'bg-champagne-950 text-champagne-accent border-champagne-500/50 shadow-sm'
                      : 'bg-black/70 border-white/10 text-stone-300 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          {/* AI Vision Configuration */}
          <div className="p-4 rounded-3xl luxury-card space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-champagne-gold" />
                <span>Google Gemini AI Vision Key</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-900 text-champagne-200 font-sans font-medium">
                Optional
              </span>
            </div>
            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              The app includes an intelligent sommelier label parser out-of-the-box. Add your Gemini API key for live multimodal cloud scanning.
            </p>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-champagne-gold font-mono"
            />
          </div>

          {/* Backup & Export */}
          <div className="p-4 rounded-3xl luxury-card space-y-2.5">
            <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-champagne-300">
              Cellar Vault & Backup
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportData}
                className="p-2.5 rounded-xl bg-black/70 hover:bg-stone-900 border border-white/10 text-xs font-sans font-semibold text-stone-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-champagne-300" />
                <span>Export Vault</span>
              </button>

              <label className="p-2.5 rounded-xl bg-black/70 hover:bg-stone-900 border border-white/10 text-xs font-sans font-semibold text-stone-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-champagne-300" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-champagne-500/15 bg-[#0f0a0d] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-sans font-semibold text-stone-200 border border-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-wine-900 via-wine-800 to-black hover:from-wine-800 hover:to-wine-900 text-champagne-100 border border-champagne-500/35 text-xs font-sans font-bold tracking-wide shadow-lg shadow-wine-950 flex items-center justify-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-champagne-gold" />
                <span>Saved Preferences</span>
              </>
            ) : (
              <span>Save Preferences</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
