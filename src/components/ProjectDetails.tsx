import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import { MessageSquare, Trash2, Loader2, Plus, Edit, BarChart2, FileSpreadsheet, ChevronLeft, Sun, Moon, DownloadIcon, Download, FileEdit, X, LineChart } from 'lucide-react';
import { getProjectDetails, uploadFile, getProjectPL, getProjectFiles, deleteProjectFile, toggleChartPin, Dashboard, getProjectCharts, getProjectDashboardCharts, removeChartFromDashboard, downloadProjectFile } from '../services/api';
import { LineChart as RechartsLineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card.tsx';
import { Dialog } from './ui/Dialog';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Theme, themes } from '../utils/theme'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ChartRenderer } from './ChartRenderer.tsx';
import { NavBar } from './NavBar';
import { useToast } from '../contexts/ToastContext';


interface ProjectFile {
  id: number;
  name: string;
  path: string;
  relative_path: string;
  addedBy: string;
  dateAdded: string;
  lastUpdated: string;
  size: number;
}

interface ProjectDetails {
  id: number;
  name: string;
  description: string;
  files: ProjectFile[];
}

interface ProjectPL {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

interface PLDataPoint {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface ProjectDashboardChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
}

interface SavedChart {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
}

const samplePLData: PLDataPoint[] = [
  { month: 'Jan', revenue: 50000, costs: 30000, profit: 20000 },
  { month: 'Feb', revenue: 55000, costs: 32000, profit: 23000 },
  { month: 'Mar', revenue: 48000, costs: 31000, profit: 17000 },
  { month: 'Apr', revenue: 60000, costs: 35000, profit: 25000 },
  { month: 'May', revenue: 58000, costs: 34000, profit: 24000 },
  { month: 'Jun', revenue: 65000, costs: 38000, profit: 27000 },
];

export function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProjectPL | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [isUpdateFileDialogOpen, setIsUpdateFileDialogOpen] = useState(false);
  const [fileToUpdate, setFileToUpdate] = useState<ProjectFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false); // State to manage hover effect
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fileBeingDeleted, setFileBeingDeleted] = useState<number | null>(null);
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme];
  const [processingFiles, setProcessingFiles] = useState<Set<number>>(new Set());
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'files'>('dashboard');
  const [pinnedCharts, setPinnedCharts] = useState<SavedChart[]>([]);
  const [updatingFiles, setUpdatingFiles] = useState<Set<number>>(new Set());
  const [isLoadingPinnedCharts, setIsLoadingPinnedCharts] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const currentProjectId = projectId; // Capture current ID
    
    if (!currentProjectId) return;
    
    fetchProjectDetails();
    
    // Only re-run if projectId actually changes
  }, [projectId?.toString()]);

  useEffect(() => {
    const fetchPinnedCharts = async () => {
      if (!projectId) return;
      try {
        setIsLoadingPinnedCharts(true);
        const charts = await getProjectDashboardCharts(Number(projectId));
        console.log('Fetched pinned charts:', charts);
        setPinnedCharts(charts);
      } catch (error) {
        console.error('Error fetching pinned charts:', error);
        setError('Failed to load pinned charts');
      } finally {
        setIsLoadingPinnedCharts(false);
      }
    };
    
    fetchPinnedCharts();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    if (!projectId) {
      setError('No project ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const numericProjectId = parseInt(projectId);
      
      // Get project details first
      const details = await getProjectDetails(numericProjectId);
      if (!details) {
        throw new Error('Failed to load project details');
      }
      setProject(details);

      // Only fetch PL data and files if we have project details
      const [plData, filesData] = await Promise.all([
        getProjectPL(numericProjectId),
        getProjectFiles(numericProjectId, (message, type) => showToast(message, type as "success" | "error" | "warning" | "info"))
      ]);
      
      setProfitLoss(plData);
      
      // Update project files if they exist
      if (filesData) {
        setProject(prev => prev ? { ...prev, files: filesData } : null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project details. Please try again later.');
      // Reset states on error
      setProject(null);
      setProfitLoss(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    // Check file size before uploading
    const maxSize = 10 * 1024 * 1024; // 10MB
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        showToast('File size exceeds 10MB limit. Please upload smaller files.', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }

    try {
      setIsUploading(true);
      // Add temporary IDs for loading state
      const tempIds = Array.from(files).map((_, i) => -1 - i);
      setProcessingFiles(new Set(tempIds));
      
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], parseInt(projectId), false);
      }
      await fetchProjectDetails();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      if (error.response?.status === 413) {
        showToast('File size exceeds 10MB limit. Please upload smaller files.', 'error');
      } else {
        setError('Failed to upload files');
      }
    } finally {
      setIsUploading(false);
      setProcessingFiles(new Set());
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!projectId) return;
    try {
      setIsDeleting(true);
      setFileBeingDeleted(fileId);
      setDeleteError(null);
      
      // Continue with backend deletion
      await deleteProjectFile(parseInt(projectId), fileId);
      
      // Show success toast
      showToast('File deleted successfully', 'success');
      
      // Now remove from UI after successful deletion
      setProject(prev => prev ? {
        ...prev,
        files: prev.files.filter(file => file.id !== fileId)
      } : null);
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      
      // Clear file being deleted after animation completes (500ms)
      setTimeout(() => setFileBeingDeleted(null), 500);
    } catch (error) {
      console.error('Error deleting file:', error);
      setDeleteError('Failed to delete file. Please try again.');
      showToast('Failed to delete file', 'error');
      setFileBeingDeleted(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMultipleFileUpload = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0 || !projectId) return;

    try {
      setIsUploading(true);
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], parseInt(projectId), false);
      }
      await fetchProjectDetails();
      setIsAddFileDialogOpen(false);
    } catch (error) {
      setError('Failed to upload files');
      console.error('Error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleChatTransition = () => {
    // Trigger left swipe animation then navigate
    const transition = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate(`/chat/${projectId}`);
    };
    transition();
  };

  const handleFileUpdate = async (e: React.ChangeEvent<HTMLInputElement>, fileId: number) => {
    const files = e.target.files;
    if (!files || !projectId) return;

    // Close dialog immediately
    setIsUpdateFileDialogOpen(false);
    
    // Add file to updating state
    setUpdatingFiles(prev => new Set([...prev, fileId]));

    try {
      await uploadFile(files[0], parseInt(projectId), false, true);
      await fetchProjectDetails();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error updating file:', error);
      setError('Failed to update file');
    } finally {
      // Remove file from updating state
      setUpdatingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const handleRemoveFromDashboard = async (chartId: number) => {
    if (!projectId) return;
    
    try {
      await removeChartFromDashboard(Number(projectId), chartId);
      // Update local state to remove the chart
      setPinnedCharts(prev => prev.filter(chart => chart.id !== chartId));
      
      // Show a success message (optional)
      // You can add a toast notification here if you have a toast system
    } catch (error) {
      console.error('Error removing chart from dashboard:', error);
      // Show error message (optional)
    }
  };

  const getProjectFilesList = () => {
    if (!project) return [];
    // project.files is already the array we need
    const files = project.files;
    if (!Array.isArray(files)) {
      console.warn('Project files is not an array:', files);
      return [];
    }
    return files;
  };

  const handleDownloadFile = async (file: ProjectFile) => {
    if (!projectId) return;
    
    try {
      const response = await downloadProjectFile(parseInt(projectId), file.id);
      
      // Create a blob from the response data
      const blob = new Blob([response], { type: 'application/octet-stream' });
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name; // Use the original filename
      document.body.appendChild(a);
      
      // Trigger the download
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('File download started', 'success');
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100/50 to-teal-100/50 backdrop-blur-sm">
        <div className={`${themeStyles.cardBg} p-8 rounded-xl shadow-lg flex items-center space-x-3`}>
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <span className={`${themeStyles.text} text-sm font-medium`}>Loading project...</span>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="sync">
      <motion.div 
        key={`project-${projectId}`}
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -300 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={`min-h-screen ${themeStyles.background} p-8`}
        style={{ 
          backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        {/* Update Logo section */}
        <div className="fixed top-4 left-0 w-72">
          <img 
            src={currentTheme === 'dark' 
              ? '/images/Logo_Full_Dark_Mode-removebg-preview.png'
              : '/images/Logo_Full_Light_mode-removebg-preview.png'
            } 
            alt="ConstroMan Logo" 
            className="w-full h-auto"
          />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/projects')}
                className={`p-2 ${themeStyles.cardBg} shadow-lg ${themeStyles.text} rounded-full hover:bg-opacity-90 transition-colors duration-200`}
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
              <h1 className={`text-4xl font-semibold ${themeStyles.text}`}>
                {project?.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <motion.div className={`rounded-full shadow-lg overflow-hidden ${themeStyles.cardBg}`}>
                <button
                  onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
                  className="w-10 h-10 relative flex items-center justify-center"
                  title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      rotate: currentTheme === 'light' ? 0 : 180,
                      scale: currentTheme === 'light' ? 1 : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                  >
                    <Sun className={themeStyles.subtext} />
                  </motion.div>
                  <motion.div
                    initial={false}
                    animate={{
                      rotate: currentTheme === 'light' ? -180 : 0,
                      scale: currentTheme === 'light' ? 0 : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute"
                  >
                    <Moon className={themeStyles.subtext} />
                  </motion.div>
                </button>
              </motion.div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className={`${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} rounded-full flex items-center gap-2 shadow-lg transition-all duration-200 min-w-[140px] px-4 py-2`}
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Files</span>
              </Button>
              <Button 
                onClick={handleChatTransition}
                className={`${themeStyles.buttonBg} ${themeStyles.buttonText} ${themeStyles.buttonHoverBg} rounded-full flex items-center gap-2 shadow-lg transition-all duration-200 min-w-[100px] px-4 py-2`}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Chat</span>
              </Button>
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'dashboard' | 'files')}
            className="space-y-4"
          >
            <TabsList className={`inline-flex h-10 items-center justify-center rounded-full p-1 
              ${currentTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-white'} shadow-lg`}>
              <TabsTrigger 
                value="dashboard"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-1.5 text-sm font-medium 
                  transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 
                  data-[state=active]:bg-teal-500 data-[state=active]:text-white
                  data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-100
                  ${currentTheme === 'dark' ? 'data-[state=inactive]:text-white data-[state=inactive]:hover:bg-slate-800/50' : ''}`}
              >
                <LineChart className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="files"
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-1.5 text-sm font-medium 
                  transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 
                  data-[state=active]:bg-teal-500 data-[state=active]:text-white
                  data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-100
                  ${currentTheme === 'dark' ? 'data-[state=inactive]:text-white data-[state=inactive]:hover:bg-slate-800/50' : ''}`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent 
              value="dashboard"
              className="mt-4 relative"
              style={{
                animation: "fadeIn 0.5s ease-out"
              }}
            >
              {isLoadingPinnedCharts ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                  {pinnedCharts.map((chart) => (
                    <Card key={chart.id || `chart-${chart.id}`} className={`${themeStyles.cardBg} shadow-lg overflow-hidden`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
                        <CardTitle className={`text-base font-medium ${themeStyles.text}`}>
                          {chart.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemoveFromDashboard(chart.id)}
                            className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 
                              transition-colors text-gray-500 hover:text-red-600`}
                            title="Remove from dashboard"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4 pb-2">
                        <div className="h-[300px] w-full">
                          <ChartRenderer
                            dashboard={chart.chart_data}
                            hideDownload={true}
                            dimensions={{ width: 100, height: 300 }}
                          />
                        </div>
                        <div className={`text-xs mt-2 ${themeStyles.text} border-t pt-2`}>
                          {chart.query}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {pinnedCharts.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <BarChart2 className={`h-12 w-12 ${themeStyles.subtext} mb-4`} />
                      <h3 className={`text-lg font-medium ${themeStyles.text}`}>
                        No charts pinned yet
                      </h3>
                      <p className={`text-sm ${themeStyles.subtext} mt-2 text-center max-w-md`}>
                        Pin charts from your analysis to create a custom dashboard view
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent 
              value="files"
              className="mt-4"
              style={{
                animation: "fadeIn 0.5s ease-out"
              }}
            >
              {/* Files Section */}
              <div className="space-y-4">
                <Card className="shadow-md overflow-hidden">
                  <CardContent className="p-4">
                    <div className={`${themeStyles.cardBg} rounded-lg shadow-lg overflow-hidden`}>
                      <div className="overflow-x-auto">
                        <table className={`min-w-full divide-y ${themeStyles.borderColor}`}>
                          <thead>
                            <tr>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Name
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Added By
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Date Added
                              </th>
                              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Last Updated
                              </th>
                              <th scope="col" className={`px-6 py-3 text-right text-xs font-medium ${themeStyles.text} uppercase tracking-wider`}>
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${themeStyles.borderColor} border-t ${themeStyles.borderColor}`}>
                            {getProjectFilesList().length === 0 && processingFiles.size === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-4">
                                    <FileSpreadsheet className={`h-12 w-12 ${themeStyles.subtext}`} />
                                    <div className={`text-lg font-medium ${themeStyles.text}`}>
                                      No files have been added to this project yet
                                    </div>
                                    <div className={`text-sm ${themeStyles.subtext}`}>
                                      To begin, click on "Add Files" button above
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <>
                                {getProjectFilesList().map((file, index) => (
                                  <motion.tr 
                                    key={file.id || `file-${file.id}`} 
                                    className={`border-b ${themeStyles.borderColor}`}
                                    initial={fileBeingDeleted === file.id ? { scale: 1 } : {}}
                                    animate={fileBeingDeleted === file.id ? 
                                      { scale: [1, 0.95, 0.9, 0.85, 0], opacity: [1, 0.8, 0.6, 0.4, 0] } : 
                                      {}
                                    }
                                    transition={{ duration: 0.5 }}
                                  >
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.text}`}>
                                      {updatingFiles.has(file.id) ? (
                                        <div className="flex items-center">
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          <span>Updating file...</span>
                                        </div>
                                      ) : (
                                        file.name
                                      )}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {file.addedBy}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {new Date(file.dateAdded).toLocaleDateString()}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>
                                      {new Date(file.lastUpdated).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <div className="flex justify-end space-x-2">
                                        <button 
                                          onClick={() => {
                                            setFileToUpdate(file);
                                            setIsUpdateFileDialogOpen(true);
                                          }}
                                          className={`${themeStyles.text} hover:${themeStyles.linkHoverColor}`}
                                          disabled={updatingFiles.has(file.id)}
                                        >
                                          <FileEdit className="h-5 w-5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDownloadFile(file)}
                                          className={`${themeStyles.text} hover:${themeStyles.linkHoverColor}`}
                                        >
                                          <Download className="h-5 w-5" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            setFileToDelete(file);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          className={`${themeStyles.text} hover:text-red-600`}
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </div>
                                    </td>
                                  </motion.tr>
                                ))}
                                {/* Add loading rows */}
                                {Array.from(processingFiles).map((tempId) => (
                                  <tr key={tempId} className={`border-b ${themeStyles.borderColor} animate-pulse`}>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.text}`}>
                                      <div className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span>Uploading file...</span>
                                      </div>
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${themeStyles.subtext}`}>-</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">-</td>
                                  </tr>
                                ))}
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NavBar />
      </motion.div>

      <Dialog open={isUpdateFileDialogOpen} onOpenChange={setIsUpdateFileDialogOpen}>
        <Dialog.Content className={`${themeStyles.cardBg} sm:max-w-[425px] p-6 rounded-lg shadow-xl`}>
          <Dialog.Header className="mb-4">
            <Dialog.Title className={`text-xl font-semibold ${themeStyles.text}`}>
              Update File
            </Dialog.Title>
            <Dialog.Description className={`${themeStyles.subtext} mt-1.5`}>
              Upload a new version of "{fileToUpdate?.name}"
            </Dialog.Description>
          </Dialog.Header>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="updateFile" className={`text-right ${themeStyles.text}`}>
                File
              </Label>
              <div className="col-span-3">
                <Input
                  id="updateFile"
                  type="file"
                  onChange={(e) => fileToUpdate && handleFileUpdate(e, fileToUpdate.id)}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 
                    file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 
                    hover:file:bg-teal-100 text-sm text-gray-600 w-full cursor-pointer
                    border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
          <Dialog.Footer className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsUpdateFileDialogOpen(false)}
              className={`${themeStyles.buttonBg} ${themeStyles.buttonText} px-4 py-2 rounded-md hover:opacity-90`}
            >
              Cancel
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Content className={`${themeStyles.cardBg} sm:max-w-[425px] p-6 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700`}>
          <Dialog.Header className="mb-4">
            <Dialog.Title className={`text-xl font-semibold ${themeStyles.text}`}>
              Confirm Deletion
            </Dialog.Title>
            <Dialog.Description className={`${themeStyles.subtext} mt-1.5`}>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </Dialog.Description>
          </Dialog.Header>
          {deleteError && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">
              <p className="text-sm">{deleteError}</p>
            </div>
          )}
          <Dialog.Footer className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow border border-gray-200"
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={() => fileToDelete && handleDeleteFile(fileToDelete.id)}
              disabled={isDeleting}
              className="bg-red-600 text-white px-5 py-2.5 rounded-full hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center min-w-[80px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </AnimatePresence>
  );
}
