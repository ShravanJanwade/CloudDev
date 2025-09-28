'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Monitor, Keyboard, Palette, Save, RotateCcw, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  theme: string;
}

const defaultSettings: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  theme: 'github-dark',
};

const SETTINGS_KEY = 'clouddev_editor_settings';

function loadSettings(): EditorSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore errors
  }
  return defaultSettings;
}

function saveSettings(settings: EditorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore errors
  }
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'theme' | 'shortcuts' | 'account'>('editor');
  const [settings, setSettings] = useState<EditorSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setHasChanges(false);
    }
  }, [isOpen]);

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    // Dispatch custom event for Monaco to pick up
    window.dispatchEvent(new CustomEvent('clouddev:settings-changed', { detail: settings }));
    onClose();
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'editor' as const, label: 'Editor', icon: Monitor },
    { id: 'theme' as const, label: 'Theme', icon: Palette },
    { id: 'shortcuts' as const, label: 'Shortcuts', icon: Keyboard },
    { id: 'account' as const, label: 'Account', icon: User },
  ];

  const shortcuts = [
    { keys: ['Ctrl', 'S'], action: 'Save file' },
    { keys: ['Ctrl', 'P'], action: 'Quick open file' },
    { keys: ['Ctrl', 'Shift', 'P'], action: 'Command palette' },
    { keys: ['Ctrl', 'F'], action: 'Find in file' },
    { keys: ['Ctrl', 'H'], action: 'Find and replace' },
    { keys: ['Ctrl', '`'], action: 'Toggle terminal' },
    { keys: ['Ctrl', 'B'], action: 'Toggle sidebar' },
    { keys: ['Ctrl', '/'], action: 'Toggle comment' },
    { keys: ['Alt', '↑/↓'], action: 'Move line up/down' },
    { keys: ['Ctrl', 'D'], action: 'Add selection' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-[#0d1117] rounded-2xl border border-[#30363d] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="text-xs text-gray-500">Customize your editor experience</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-48 border-r border-[#21262d] p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 h-[500px] overflow-y-auto">
              {activeTab === 'editor' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Font Size: {settings.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      value={settings.fontSize}
                      onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tab Size: {settings.tabSize} spaces
                    </label>
                    <div className="flex gap-2">
                      {[2, 4, 8].map((size) => (
                        <button
                          key={size}
                          onClick={() => updateSetting('tabSize', size)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            settings.tabSize === size
                              ? 'bg-blue-600 text-white'
                              : 'bg-[#21262d] text-gray-400 hover:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'wordWrap' as const, label: 'Word Wrap' },
                      { key: 'lineNumbers' as const, label: 'Line Numbers' },
                      { key: 'minimap' as const, label: 'Minimap' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          {label}
                        </span>
                        <button
                          onClick={() => updateSetting(key, !settings[key])}
                          className={`w-11 h-6 rounded-full transition-colors relative ${
                            settings[key] ? 'bg-blue-600' : 'bg-[#21262d]'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                              settings[key] ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'theme' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 mb-4">Select a color theme for the editor</p>
                  {[
                    { id: 'github-dark' as const, name: 'GitHub Dark', preview: 'bg-[#0d1117]' },
                    { id: 'github-dark-dimmed' as const, name: 'GitHub Dark Dimmed', preview: 'bg-[#22272e]' },
                    { id: 'monokai' as const, name: 'Monokai', preview: 'bg-[#272822]' },
                    { id: 'dracula', name: 'Dracula', preview: 'bg-[#282a36]' },
                    { id: 'nord', name: 'Nord', preview: 'bg-[#2e3440]' },
                    { id: 'synthwave', name: 'SynthWave 84', preview: 'bg-[#2b213a]' },
                    { id: 'night-owl', name: 'Night Owl', preview: 'bg-[#011627]' },
                    { id: 'solarized-dark', name: 'Solarized Dark', preview: 'bg-[#002b36]' },
                    { id: 'one-dark-pro', name: 'One Dark Pro', preview: 'bg-[#282c34]' },
                    { id: 'material-theme', name: 'Material Theme', preview: 'bg-[#263238]' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => updateSetting('theme', theme.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        settings.theme === theme.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[#30363d] hover:border-[#484f58] bg-[#161b22]'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg ${theme.preview} border border-[#30363d]`} />
                      <div className="text-left">
                        <p className="font-medium text-white">{theme.name}</p>
                        <p className="text-xs text-gray-500">Preview colors may vary</p>
                      </div>
                      {settings.theme === theme.id && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 mb-4">Keyboard shortcuts reference</p>
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#21262d] transition-colors"
                    >
                      <span className="text-sm text-gray-300">{shortcut.action}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span
                            key={keyIndex}
                            className="px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-xs text-gray-400 font-mono"
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-[#161b22] rounded-xl border border-[#30363d]">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                      {user?.name?.[0]?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{user?.name || 'Guest User'}</h3>
                      <p className="text-sm text-gray-400">{user?.email || 'Not signed in'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">Session Management</p>
                    <button
                      onClick={() => {
                        logout();
                        onClose();
                        router.push('/');
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#21262d] bg-[#010409]">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export settings loader for use in Monaco
export { loadSettings, type EditorSettings };
