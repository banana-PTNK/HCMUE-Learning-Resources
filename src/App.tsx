import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { QuickContributeModal } from './components/QuickContributeModal';
import { LookupProgressModal } from './components/LookupProgressModal';
import { SettingsModal } from './components/SettingsModal';
import { CategoryPage } from './pages/CategoryPage';
import { SubjectDetailPage } from './pages/SubjectDetailPage';
import { AiSchedulePage } from './pages/AiSchedulePage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { ContributePage } from './pages/ContributePage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { ToastProvider, useToast } from './context/ToastContext';
import { GoogleWorkspaceProvider } from './context/GoogleWorkspaceContext';
import { GoogleSheetProvider } from './context/GoogleSheetContext';
import { ScheduleProvider } from './context/ScheduleContext';
import { SubjectCategory } from './types';
import { initAppTheme, toggleAppTheme } from './utils/theme';

function getNormalizedCurrentPath(): string {
  if (typeof window === 'undefined') return '/';

  // 1. Check hash route fallback (e.g. #/admin or #admin)
  if (window.location.hash) {
    const cleanHash = window.location.hash.replace(/^#\/?/, '/');
    if (cleanHash && cleanHash !== '/') {
      return cleanHash.length > 1 && cleanHash.endsWith('/') ? cleanHash.slice(0, -1) : cleanHash;
    }
  }

  // 2. Check query parameter fallback (e.g. ?page=admin or ?path=/admin)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page') || urlParams.get('path');
    if (pageParam) {
      const formatted = pageParam.startsWith('/') ? pageParam : `/${pageParam}`;
      return formatted.length > 1 && formatted.endsWith('/') ? formatted.slice(0, -1) : formatted;
    }
  } catch (e) {
    // Ignore URLSearchParams error in legacy environments
  }

  // 3. Standard pathname normalized
  let p = window.location.pathname || '/';
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => getNormalizedCurrentPath());

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fit_studyvault_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickContributeOpen, setIsQuickContributeOpen] = useState(false);
  const [isLookupProgressOpen, setIsLookupProgressOpen] = useState(false);
  const [lookupInitialQuery, setLookupInitialQuery] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contributeDefaultCode, setContributeDefaultCode] = useState<string | undefined>(undefined);
  const [contributeInitialTab, setContributeInitialTab] = useState<'submit' | 'lookup'>('submit');
  const { toast } = useToast();

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fit_studyvault_sidebar_open', String(next));
      }
      return next;
    });
  };

  // Initialize theme once on mount without creating reactive re-render dependencies
  useEffect(() => {
    initAppTheme();
  }, []);

  // Sync with browser back/forward and hash navigation
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentPath(getNormalizedCurrentPath());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Navigate handler with pushState
  const handleNavigate = (path: string) => {
    let target = path || '/';
    if (target.length > 1 && target.endsWith('/')) {
      target = target.slice(0, -1);
    }
    setCurrentPath(target);
    window.history.pushState({}, '', target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenContributeWithCode = (code?: string, tab: 'submit' | 'lookup' = 'submit') => {
    setContributeDefaultCode(code);
    setContributeInitialTab(tab);
    setIsQuickContributeOpen(true);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. ESC: Close all modals, palettes and drawers
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsQuickContributeOpen(false);
        setIsLookupProgressOpen(false);
        setIsSettingsOpen(false);
        setIsSidebarOpen(false);
        return;
      }

      // 2. Ctrl + K / Cmd + K: Open Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 3. Ctrl + B / Cmd + B: Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // Check if user is typing in an editable field
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (isInputActive) return;

      // 4. 'T' or 't': Toggle Dark / Light Theme (Direct DOM toggle, zero React re-renders)
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleAppTheme();
        return;
      }

      // 5. 'C' or 'c': Open Quick Contribute modal
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsQuickContributeOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Router View Renderer
  const renderCurrentView = () => {
    if (currentPath === '/' || currentPath === '/home') {
      return (
        <HomePage
          onNavigate={handleNavigate}
          onOpenContributeModal={handleOpenContributeWithCode}
        />
      );
    }

    if (currentPath.startsWith('/category/')) {
      const cat = currentPath.replace('/category/', '') as SubjectCategory;
      return (
        <CategoryPage
          category={cat || 'foundation'}
          onNavigate={handleNavigate}
          onOpenContributeModal={handleOpenContributeWithCode}
        />
      );
    }

    if (currentPath.startsWith('/subject/')) {
      const code = currentPath.replace('/subject/', '');
      return (
        <SubjectDetailPage
          code={code}
          onNavigate={handleNavigate}
          onOpenContributeModal={handleOpenContributeWithCode}
        />
      );
    }

    if (currentPath === '/ai-schedule' || currentPath === '/schedule-parser') {
      return <AiSchedulePage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/ai-assistant') {
      return <AiAssistantPage onNavigate={handleNavigate} />;
    }

    if (currentPath === '/contribute' || currentPath === '/drive' || currentPath === '/forms') {
      return (
        <ContributePage
          onNavigate={handleNavigate}
          onOpenContributeModal={handleOpenContributeWithCode}
          onOpenLookupModal={(query?: string) => {
            setLookupInitialQuery(query || '');
            setIsLookupProgressOpen(true);
          }}
        />
      );
    }

    if (currentPath.startsWith('/announcements/') || currentPath === '/announcements') {
      const annId = currentPath.startsWith('/announcements/') ? currentPath.replace('/announcements/', '') : undefined;
      return <AnnouncementsPage onNavigate={handleNavigate} initialAnnouncementId={annId} />;
    }

    if (currentPath === '/admin' || currentPath === '/quantri') {
      return <AdminPage onNavigate={handleNavigate} />;
    }

    // Fallback: Default to Home page
    return (
      <HomePage
        onNavigate={handleNavigate}
        onOpenContributeModal={handleOpenContributeWithCode}
      />
    );
  };

  const isAdminPath = currentPath === '/admin' || currentPath === '/quantri';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-white flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenQuickContribute={() => setIsQuickContributeOpen(true)}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onNavigate={handleNavigate}
      />

      {/* Main Layout Body */}
      <div className={`flex-1 flex w-full mx-auto ${isAdminPath ? 'max-w-7xl' : 'max-w-[1600px]'}`}>
        {/* Left Sidebar - Hidden on Admin Page */}
        {!isAdminPath && (
          <Sidebar
            currentPath={currentPath}
            onNavigate={handleNavigate}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Content Main Arena */}
        <main className={`flex-1 min-w-0 overflow-y-auto ${isAdminPath ? 'p-4 sm:p-6' : 'p-4 sm:p-6 lg:p-8'}`}>
          {renderCurrentView()}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />

      <QuickContributeModal
        isOpen={isQuickContributeOpen}
        onClose={() => {
          setIsQuickContributeOpen(false);
          setContributeDefaultCode(undefined);
          setContributeInitialTab('submit');
        }}
        defaultSubjectCode={contributeDefaultCode}
        initialTab={contributeInitialTab}
      />

      <LookupProgressModal
        isOpen={isLookupProgressOpen}
        initialQuery={lookupInitialQuery}
        onClose={() => {
          setIsLookupProgressOpen(false);
          setLookupInitialQuery('');
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <GoogleWorkspaceProvider>
        <GoogleSheetProvider>
          <ScheduleProvider>
            <AppContent />
          </ScheduleProvider>
        </GoogleSheetProvider>
      </GoogleWorkspaceProvider>
    </ToastProvider>
  );
}

export default App;
