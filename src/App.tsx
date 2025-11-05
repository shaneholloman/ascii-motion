import './App.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { CanvasProvider, useCanvasContext } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useCloudProject } from '@ascii-motion/premium'
import { ThemeToggle } from './components/common/ThemeToggle'
import { AccountButton } from './components/features/AccountButton'
import { HamburgerMenu } from './components/features/HamburgerMenu'
import { ExportImportButtons } from './components/features/ExportImportButtons'
import { useCloudDialogState } from './hooks/useCloudDialogState'
import { useCloudProjectActions } from './hooks/useCloudProjectActions'
import { useAuth, usePasswordRecoveryCallback, UpdatePasswordDialog } from '@ascii-motion/premium'
import { InlineProjectNameEditor } from './components/features/InlineProjectNameEditor'
import { SaveToCloudDialog } from './components/features/SaveToCloudDialog'
import { ProjectsDialog } from './components/features/ProjectsDialog'
import { SilentSaveHandler } from './components/features/SilentSaveHandler'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { MobileDialog } from './components/features/MobileDialog'
import { BrushSizePreviewOverlay } from './components/features/BrushSizePreviewOverlay'
import { PublishToGalleryDialogWrapper } from './components/features/PublishToGalleryDialogWrapper'
import { PerformanceOverlay } from './components/common/PerformanceOverlay'
import { EditorPage } from './pages/EditorPage'
import { CommunityPage } from './pages/CommunityPage'

/**
 * Inner component that uses auth hooks
 * This component is rendered inside AuthProvider
 * Fixed: Moved useAuth hook inside AuthProvider context
 */
function AppContent() {
  // Get typography callbacks from CanvasContext
  const { setFontSize, setCharacterSpacing, setLineSpacing, setSelectedFontId } = useCanvasContext()
  
  // Cloud storage state and actions
  const { user } = useAuth()
  const { loadFromCloud } = useCloudProject()
  const { 
    showSaveToCloudDialog, 
    showProjectsDialog,
    setShowSaveToCloudDialog,
    setShowProjectsDialog,
  } = useCloudDialogState()
  const {
    handleLoadFromCloud: loadFromCloudBase,
    handleDownloadProject,
  } = useCloudProjectActions()

  // Wrapper that includes typography callbacks
  const handleLoadFromCloud = useCallback(
    async (projectId: string, sessionData: unknown) => {
      await loadFromCloudBase(projectId, sessionData, {
        setFontSize,
        setCharacterSpacing,
        setLineSpacing,
        setSelectedFontId,
      });
    },
    [loadFromCloudBase, setFontSize, setCharacterSpacing, setLineSpacing, setSelectedFontId]
  );

  // Track if we've already processed URL parameters (prevents infinite loop)
  const processedUrlRef = useRef(false);

  // Handle URL parameters for remix flow
  useEffect(() => {
    // Skip if already processed
    if (processedUrlRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search)
    const projectId = params.get('project')
    const isRemix = params.get('remix') === 'true'
    const manageProjects = params.get('manage-projects') === 'true'

    // Open "My Projects" dialog if requested
    if (manageProjects && user) {
      processedUrlRef.current = true;
      setShowProjectsDialog(true)
      // Clean up URL immediately
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      return
    }

    // Auto-load project if specified
    if (projectId && user && isRemix) {
      processedUrlRef.current = true;
      // Clean up URL IMMEDIATELY to prevent re-triggers
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Fetch project data then load it
      const loadRemixedProject = async () => {
        try {
          const cloudProject = await loadFromCloud(projectId)
          if (cloudProject) {
            await handleLoadFromCloud(projectId, cloudProject.sessionData)
          }
        } catch (error) {
          console.error('Failed to load remixed project:', error)
        }
      }
      
      loadRemixedProject()
    }
  }, [user, handleLoadFromCloud, loadFromCloud, setShowProjectsDialog])

  // Password recovery callback detection
  const { isRecovery, resetRecovery } = usePasswordRecoveryCallback()
  const [showUpdatePasswordDialog, setShowUpdatePasswordDialog] = useState(isRecovery)

  // Navigation
  const navigate = useNavigate()
  const location = useLocation()
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  // Check if we're on community routes
  const isCommunityRoute = location.pathname.startsWith('/community')

  // Update dialog visibility when recovery state changes
  useEffect(() => {
    setShowUpdatePasswordDialog(isRecovery)
  }, [isRecovery])

  const handleUpdatePasswordClose = (open: boolean) => {
    setShowUpdatePasswordDialog(open)
    if (!open) {
      resetRecovery()
    }
  }

  return (
    <div className="h-screen grid grid-rows-[auto_1fr] bg-background text-foreground">
        {/* Header - compact */}
        <header className="flex-shrink-0 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 relative items-center">
                {/* Show hamburger menu only on editor routes */}
                {!isCommunityRoute && (
                  <HamburgerMenu 
                    onOpenGallery={() => navigate('/community')}
                    onOpenPublish={() => setShowPublishDialog(true)}
                  />
                )}
                <div
                  onClick={() => navigate('/')}
                  className="ascii-logo ascii-logo-selectable font-mono tracking-tighter whitespace-pre hover:opacity-80 transition-opacity cursor-pointer"
                  aria-label="ASCII Motion logo"
                >
                  <span className="text-purple-500">----▗▄▖  ▗▄▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖    ▗▖  ▗▖ ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖</span>
                  <span className="text-purple-400"> --▐▌ ▐▌▐▌   ▐▌     █    █      ▐▛▚▞▜▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▛▚▖▐▌</span>
                  <span className="text-purple-400">  -▐▛▀▜▌ ▝▀▚▖▐▌     █    █      ▐▌  ▐▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▌ ▝▜▌</span>
                  <span className="text-purple-300">  -▐▌ ▐▌▗▄▄▞▘▝▚▄▄▖▗▄█▄▖▗▄█▄▖    ▐▌  ▐▌▝▚▄▞▘ █  ▗▄█▄▖▝▚▄▞▘▐▌  ▐▌</span>
                </div>
              </div>
              {/* Show project editor only on editor routes */}
              {!isCommunityRoute && (
                <div className="flex-1 flex justify-center">
                  <InlineProjectNameEditor />
                </div>
              )}
              {isCommunityRoute && <div className="flex-1" />}
              <div className="flex items-center gap-2">
                {/* Show export/import only on editor routes */}
                {!isCommunityRoute && <ExportImportButtons />}
                <ThemeToggle />
                <AccountButton />
              </div>
            </div>
          </div>
        </header>

        {/* Routes - Main app vs Community gallery */}
        <Routes>
          <Route path="/" element={<EditorPage />} />
          <Route path="/community/*" element={<CommunityPage />} />
        </Routes>
        
        {/* Global Dialogs - Available on all routes */}
          {user && (
            <>
              {/* Silent Save Handler - Handles Ctrl+S for already-saved projects */}
              <SilentSaveHandler />
              
              <SaveToCloudDialog 
                open={showSaveToCloudDialog} 
                onOpenChange={setShowSaveToCloudDialog} 
              />
              <ProjectsDialog
                open={showProjectsDialog}
                onOpenChange={setShowProjectsDialog}
                onLoadProject={handleLoadFromCloud}
                onDownloadProject={handleDownloadProject}
              />
              
              {/* Publish to Gallery Dialog - Community feature */}
              <PublishToGalleryDialogWrapper
                isOpen={showPublishDialog}
                onOpenChange={setShowPublishDialog}
                onPublishSuccess={(projectId) => {
                  console.log('Published project:', projectId)
                  setShowPublishDialog(false)
                  
                  // Show success toast with link to gallery
                  toast.success('Published to community gallery', {
                    description: 'Your project is now live!',
                    action: {
                      label: 'Go to gallery',
                      onClick: () => {
                        window.location.href = '/community'
                      }
                    },
                    duration: 5000,
                  })
                }}
              />
            </>
          )}
          
          {/* Password Recovery Dialog - Shows when user clicks email reset link */}
          <UpdatePasswordDialog 
            open={showUpdatePasswordDialog} 
            onOpenChange={handleUpdatePasswordClose}
          />
          
          {/* Mobile Dialog - Shows on mobile devices to inform about desktop-only support */}
          <MobileDialog />
          
          {/* Brush Size Preview Overlay - Shows when adjusting brush size */}
          <BrushSizePreviewOverlay />
        
        {/* Performance Overlay for Development */}
        <PerformanceOverlay />
        
        {/* Toast Notifications */}
        <Toaster />
        
        {/* Vercel Analytics */}
        <Analytics />
      </div>
  )
}

/**
 * App wrapper component
 * Provides AuthProvider, ThemeProvider, CanvasProvider, and BrowserRouter context
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <CanvasProvider>
            <AppContent />
          </CanvasProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
