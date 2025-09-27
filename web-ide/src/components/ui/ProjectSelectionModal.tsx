'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Globe, Box, Terminal, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TemplateId = 'react' | 'node' | 'vanilla' | 'angular';

interface TemplateOption {
  id: TemplateId;
  name: string;
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  disabled?: boolean;
}

const templates: TemplateOption[] = [
  {
    id: 'react',
    name: 'React',
    description: 'Modern UI library with Vite for fast HMR.',
    icon: <Zap className="w-6 h-6 text-blue-400" />,
    popular: true
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'Server-side JavaScript runtime environment.',
    icon: <Terminal className="w-6 h-6 text-green-400" />
  },
  {
    id: 'vanilla',
    name: 'Vanilla JS',
    description: 'Standard HTML, CSS, and JavaScript.',
    icon: <Globe className="w-6 h-6 text-yellow-400" />
  },
  {
    id: 'angular',
    name: 'Angular',
    description: 'Platform for building mobile and desktop web apps.',
    icon: <Box className="w-6 h-6 text-red-500" />,
    disabled: true
  }
];

export function ProjectSelectionModal({ isOpen, onClose }: ProjectSelectionModalProps) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('react');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    setIsCreating(true);
    // Simulate a small delay for better UX before navigation
    setTimeout(() => {
      router.push(`/editor/new?template=${selectedTemplate}&room=true`);
      onClose();
      setIsCreating(false);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl bg-[#0A0A0A] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-900/30">
            <div>
              <h2 className="text-lg font-semibold text-white">Choose your stack</h2>
              <p className="text-sm text-zinc-500">Select a template to initialize your environment</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => !template.disabled && setSelectedTemplate(template.id)}
                disabled={template.disabled}
                className={`relative group flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 outline-none
                  ${template.disabled 
                    ? 'opacity-50 cursor-not-allowed border-zinc-900 bg-zinc-900/20' 
                    : selectedTemplate === template.id
                      ? 'bg-zinc-900/80 border-blue-500/50 ring-1 ring-blue-500/20'
                      : 'bg-zinc-900/20 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
                  }
                `}
              >
                <div className={`p-3 rounded-lg ${template.disabled ? 'bg-zinc-800' : 'bg-zinc-900 shadow-inner'}`}>
                  {template.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${template.disabled ? 'text-zinc-500' : 'text-zinc-200 group-hover:text-white'}`}>
                      {template.name}
                    </span>
                    {template.popular && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        POPULAR
                      </span>
                    )}
                    {template.disabled && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                        SOON
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {template.description}
                  </p>
                </div>
                
                {selectedTemplate === template.id && !template.disabled && (
                  <div className="absolute top-4 right-4">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-900 bg-zinc-900/30">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-2.5 bg-white hover:bg-zinc-200 text-black text-sm font-semibold rounded-lg shadow-lg shadow-white/10 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Project
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
