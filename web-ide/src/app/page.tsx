'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Github, 
  Code2, 
  Terminal, 
  Zap,
  Users,
  MessageSquare,
  Cpu,
  ArrowRight,
  Globe,
  Layers,
  Command,
  Sparkles,
  CheckCircle2,
  Box,
  LogOut,
  User,
  ChevronDown,
  Settings
} from 'lucide-react';
import { templates, TemplateKey } from '@/lib/utils/templates';
import { ProjectSelectionModal } from '@/components/ui/ProjectSelectionModal';
import { AuthModal } from '@/components/ui/AuthModal';
import { JoinRoomModal } from '@/components/collaboration/JoinRoomModal';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

export default function Home() {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [mounted, setMounted] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Auth state
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    // Check authentication on mount
    checkAuth();
  }, [checkAuth]);

  const openAuthModal = (tab: 'login' | 'register') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleStartCoding = () => {
    setProjectModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-white/20 selection:text-white">
      {/* Technical Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center shadow-lg shadow-white/10">
               <Command className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold tracking-tight text-lg">CloudDev</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
            ) : isAuthenticated && user ? (
              // Authenticated user menu
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {getUserInitials(user.name)}
                  </div>
                  <span className="text-white">{user.name}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showUserMenu && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-2 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => { setShowUserMenu(false); router.push('/editor/new?template=react'); }}
                        className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                        My Projects
                      </button>
                      <button 
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="border-t border-zinc-800 mt-2 pt-2">
                        <button 
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-left flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // Not authenticated - show login/register buttons
              <>
                <button onClick={() => openAuthModal('login')} className="hover:text-white transition-colors">Sign In</button>
                <button 
                  onClick={() => openAuthModal('register')}
                  className="px-4 py-2 bg-white text-black rounded hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-24 px-6 max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center gap-16 mb-32">
           <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 mb-8 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  v3.0 Now Available
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold leading-[0.95] tracking-tighter mb-8">
                  Ship software <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-600">instantly.</span>
                </h1>
                <p className="text-xl text-zinc-500 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-10">
                  Full-stack development environment in your browser. <br className="hidden lg:block" />
                  No setup. No config. Just code.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                   <button 
                      onClick={handleStartCoding}
                      className="group relative h-14 px-8 bg-white text-black font-semibold text-lg rounded-xl hover:bg-zinc-100 transition-all flex items-center gap-3 shadow-xl shadow-white/10 overflow-hidden"
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 z-0" />
                      <div className="relative z-10 flex items-center gap-2">
                         <Zap className="w-5 h-5 fill-current" />
                         <span>Start Coding</span>
                      </div>
                      <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                   </button>
                   <button 
                      onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
                      className="h-14 px-8 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white font-medium rounded-xl transition-all flex items-center gap-2"
                   >
                      View Templates
                   </button>
                   <button 
                      onClick={() => setJoinModalOpen(true)}
                      className="h-14 px-8 bg-transparent border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white font-medium rounded-xl transition-all flex items-center gap-2"
                   >
                      <Users className="w-5 h-5" />
                      Join Room
                   </button>
                </div>

                <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-zinc-600 font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-zinc-500" /> Free for everyone
                    </div>
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4 text-zinc-500" /> No credit card
                    </div>
                </div>
              </motion.div>
           </div>

           {/* Hero Visual - Code Terminal */}
           <div className="flex-1 w-full max-w-xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative rounded-xl bg-[#0A0A0A] border border-zinc-800 shadow-2xl overflow-hidden group"
              >
                 {/* Glow effect */}
                 <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                 
                 <div className="relative bg-[#0A0A0A] rounded-xl">
                   <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                      <div className="flex gap-1.5">
                         <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                         <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                         <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                      </div>
                      <div className="ml-4 text-xs text-zinc-500 font-mono">clouddev — bash — 80x24</div>
                   </div>
                   <div className="p-6 font-mono text-sm leading-relaxed text-zinc-300">
                      <div className="mb-4">
                         <span className="text-green-400">➜</span> <span className="text-blue-400">~</span> <span className="text-yellow-400">git</span> clone https://github.com/clouddev/next-starter <br/>
                         <span className="text-zinc-500">Cloning into 'next-starter'...</span>
                      </div>
                      <div className="mb-4">
                         <span className="text-green-400">➜</span> <span className="text-blue-400">~/next-starter</span> <span className="text-yellow-400">npm</span> install <br/>
                         <span className="text-zinc-500">added 142 packages in 2s</span>
                      </div>
                       <div>
                         <span className="text-green-400">➜</span> <span className="text-blue-400">~/next-starter</span> <span className="text-yellow-400">npm</span> run dev <br/>
                         <span className="text-green-500">ready</span> started server on 0.0.0.0:3000, url: http://localhost:3000 <br/>
                         <span className="animate-pulse">_</span>
                      </div>
                   </div>
                 </div>
              </motion.div>
           </div>
        </section>

        {/* Bento Grid Features */}
        <section className="mb-32">
           <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Production Grade</h2>
              <p className="text-zinc-400">Everything you need to build world-class applications.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[250px]">
              {/* Large Feature */}
              <div className="md:col-span-2 row-span-2 rounded-xl bg-zinc-900/30 border border-white/5 p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
                 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Cpu className="w-48 h-48" />
                 </div>
                 <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                         <Zap className="w-5 h-5 text-blue-400" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Instant Environment</h3>
                      <p className="text-zinc-400 max-w-sm">Powered by WebContainers, CloudDev spins up a full Node.js environment directly in your browser. No remote servers, no latency.</p>
                    </div>
                    <div className="rounded-lg bg-black/50 border border-white/5 p-4 font-mono text-xs text-zinc-400">
                        Top-tier performance with local execution speed.
                    </div>
                 </div>
              </div>

              {/* Box 2 */}
              <div className="rounded-xl bg-zinc-900/30 border border-white/5 p-6 hover:border-white/10 transition-colors flex flex-col justify-between">
                 <Users className="w-8 h-8 text-purple-400 mb-4" />
                 <div>
                    <h3 className="text-xl font-bold mb-1">Real-time Collab</h3>
                    <p className="text-sm text-zinc-400">Room-based coding with live cursors and chat.</p>
                 </div>
              </div>

              {/* Box 3 */}
              <div className="rounded-xl bg-zinc-900/30 border border-white/5 p-6 hover:border-white/10 transition-colors flex flex-col justify-between">
                 <Globe className="w-8 h-8 text-green-400 mb-4" />
                 <div>
                    <h3 className="text-xl font-bold mb-1">Live Preview</h3>
                    <p className="text-sm text-zinc-400">Hot-reloading preview panel side-by-side.</p>
                 </div>
              </div>

              {/* Wide Bottom Box */}
              <div className="md:col-span-3 rounded-xl bg-zinc-900/30 border border-white/5 p-8 hover:border-white/10 transition-colors flex items-center justify-between gap-8">
                  <div className="max-w-xl">
                       <h3 className="text-2xl font-bold mb-2">Monaco Editor</h3>
                       <p className="text-zinc-400">The same powerful editor that powers VS Code. IntelliSense, Syntax Highlighting, and complete type safety out of the box.</p>
                  </div>
                  <div className="hidden md:flex gap-2">
                      <div className="px-4 py-2 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">TypeScript</div>
                      <div className="px-4 py-2 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">React</div>
                      <div className="px-4 py-2 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">Node.js</div>
                  </div>
              </div>
           </div>
        </section>

        {/* Templates Section */}
        <section id="templates" className="mb-32">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-bold tracking-tight">Quick Start Templates</h2>
               <div className="h-px flex-1 bg-zinc-800 ml-8"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(templates).map(([key, template]) => (
                 <button 
                  key={key}
                  onClick={() => router.push(`/editor/new?template=${key}`)}
                  className="group p-4 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-900/20 hover:bg-zinc-900/50 text-left transition-all"
                >
                   <div className="text-3xl mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                      {template.icon}
                   </div>
                   <div className="font-medium text-zinc-200 group-hover:text-white">{template.name}</div>
                   <div className="text-xs text-zinc-500 mt-1">Start Project &rarr;</div>
                 </button>
              ))}
            </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-900 pt-16 flex flex-col md:flex-row items-start justify-between gap-8 text-sm text-zinc-500">
           <div>
              <div className="flex items-center gap-2 mb-4">
                 <Command className="w-5 h-5 text-white" />
                 <span className="font-bold text-white text-base">CloudDev</span>
              </div>
              <p>Built by Shravankumar Janawade</p>
           </div>
           
           <div className="flex gap-16">
              <div className="flex flex-col gap-3">
                 <span className="font-medium text-white mb-1">Product</span>
                 <a href="#" className="hover:text-white transition-colors">Editor</a>
                 <a href="#" className="hover:text-white transition-colors">Collaboration</a>
                 <a href="#" className="hover:text-white transition-colors">Preview</a>
              </div>
              <div className="flex flex-col gap-3">
                 <span className="font-medium text-white mb-1">Resources</span>
                 <a href="#" className="hover:text-white transition-colors">Documentation</a>
                 <a href="#" className="hover:text-white transition-colors">GitHub</a>
                 <a href="#" className="hover:text-white transition-colors">Changelog</a>
              </div>
           </div>
        </footer>

      </main>

      {/* Background Noise/Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultTab={authModalTab}
      />

      <ProjectSelectionModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />

      <JoinRoomModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />
    </div>
  );
}
