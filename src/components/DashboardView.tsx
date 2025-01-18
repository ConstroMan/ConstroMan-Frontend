import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useTheme } from '../contexts/ThemeContext';
import { X, Plus, Minus, ChevronLeft, ChevronRight, Download, MoreVertical, Pin, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './gridLayoutTheme.css';
import { ChartRenderer } from './ChartRenderer'; 
import { DashboardLayout } from '../types/dashboard';
import { getProjectCharts, saveProjectChart, toggleChartPin, addChartToProjectDashboard, getProjectDashboardCharts, saveDashboardLayout, getDashboardLayouts, loadDashboardLayout, DashboardLayoutConfig, DashboardLayoutItem, updateDashboardLayout, removeChartFromDashboard } from '../services/api';
import debounce from 'lodash/debounce';
import { SaveLayoutDialog } from './SaveLayoutDialog';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import { DashboardItem } from '../types/dashboard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ResponsiveGridLayout = WidthProvider(Responsive) as unknown as React.ComponentType<{
  className: string;
  layouts: Layouts;
  breakpoints?: { [key: string]: number };
  cols?: { [key: string]: number };
  rowHeight?: number;
  onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  margin?: [number, number];
  containerPadding?: [number, number];
  children?: React.ReactNode;
  useCSSTransforms?: boolean;
  transformScale?: number;
  style?: React.CSSProperties;
  minW?: number;
  minH?: number;
}>;

type Dashboard = {
  Name: string;
  Type: 'LineChart' | 'BarChart' | 'PieChart' | 'DonutChart' | 'ScatterPlot' | 'Histogram' | 'Table' | 'DoubleBarChart' | 'DualColorLineChart';
  X_axis_label: string;
  Y_axis_label: string;
  X_axis_data: string[] | number[];
  Y_axis_data: string[] | number[];
  labels: string[];
  Values: number[];
  Column_headers?: string[];
  Row_data?: string[][];
  Forecasted_X_axis_data?: string[];
  Forecasted_Y_axis_data?: number[];
  Y_axis_data_secondary?: number[];
};

type SavedChart = {
  id: number;
  name: string;
  query: string;
  chart_data: Dashboard;
  is_pinned: boolean;
  created_at: string;
  created_by: number;
};

interface DashboardViewProps {
  projectId: string;
  availableDashboards: DashboardItem[];
  onClose: () => void;
  layouts: { [key: string]: DashboardLayout[] };
  onLayoutChange: (layouts: { [key: string]: DashboardLayout[] }) => void;
}

type Layout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
};

type Layouts = {
  [P: string]: Layout[];
};

// Add new interfaces for tab management
interface DashboardTab {
  id: string;
  name: string;
  isEditing?: boolean;
  selectedCharts: SavedChart[];
  layout: Layouts;
  layoutId?: number;        // Track which saved layout this tab is using
  hasUnsavedChanges: boolean; // Track if there are unsaved changes
}

export default function DashboardView({ 
  projectId, 
  availableDashboards, 
  onClose,
  layouts,
  onLayoutChange 
}: DashboardViewProps) {
  const { showToast } = useToast();
  const [selectedDashboards, setSelectedDashboards] = useState<DashboardItem[]>(availableDashboards);
  const [selectedSavedCharts, setSelectedSavedCharts] = useState<SavedChart[]>([]);
  const [visibleCharts, setVisibleCharts] = useState<SavedChart[]>([]);

  // Save selected state when it changes
  useEffect(() => {
    const selectedNames = selectedDashboards
      .filter(d => d.selected)
      .map(d => d.dashboardData.Name);
    localStorage.setItem('selectedDashboards', JSON.stringify(selectedNames));
  }, [selectedDashboards]);

  const toggleDashboardSelection = (index: number) => {
    setSelectedDashboards(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  // Initialize layouts if they don't exist
  useEffect(() => {
    if (!layouts || Object.keys(layouts).length === 0) {
      const selectedCount = selectedDashboards.filter(d => d.selected).length;
      const initialLayouts = {
        lg: Array.from({ length: selectedCount }, (_, i) => ({
          i: `chart-${i}`,
          x: (i % 2) * 6,
          y: Math.floor(i / 2) * 4,
          w: 6,
          h: 4,
          minW: 3,
          minH: 3
        })),
        // ... repeat for other breakpoints
      };
      onLayoutChange(initialLayouts);
    }
  }, [selectedDashboards]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentTheme } = useTheme();
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Save final state when component unmounts
      const selectedNames = selectedDashboards
        .filter(d => d.selected)
        .map(d => d.dashboardData.Name);
      localStorage.setItem('selectedDashboards', JSON.stringify(selectedNames));
      localStorage.setItem('dashboardLayouts', JSON.stringify(layouts));
    };
  }, [selectedDashboards, layouts]);

  const [activeTab, setActiveTab] = useState<'available' | 'saved'>('available');
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);

  useEffect(() => {
    const fetchSavedCharts = async () => {
      try {
        const charts = await getProjectCharts(Number(projectId));
        setSavedCharts(charts);
      } catch (error) {
        console.error('Error fetching saved charts:', error);
      }
    };
    fetchSavedCharts();
  }, [projectId]);

  const handleSaveChart = async (chart: DashboardItem) => {
    try {
      await saveProjectChart(Number(projectId), {
        name: chart.dashboardData.Name,
        query: chart.query,
        chart_data: chart.dashboardData
      });
      // Refresh saved charts
      const charts = await getProjectCharts(Number(projectId));
      setSavedCharts(charts);
    } catch (error) {
      console.error('Error saving chart:', error);
    }
  };

  const handleDownloadChart = (chart: DashboardItem) => {
    // Implement chart download logic here
    console.log('Downloading chart:', chart);
  };

  const toggleSavedChartSelection = (chart: SavedChart) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        const isSelected = tab.selectedCharts.some(c => c.id === chart.id);
        const newSelectedCharts = isSelected
          ? tab.selectedCharts.filter(c => c.id !== chart.id)
          : [...tab.selectedCharts, chart];
        
        let newLayout = { ...tab.layout };
        if (!isSelected) {
          newLayout.lg = [
            ...(tab.layout.lg || []),
            {
              i: `chart-${chart.id}`,
              x: (tab.layout.lg?.length || 0) % 2 * 6,
              y: Math.floor((tab.layout.lg?.length || 0) / 2) * 4,
              w: 6,
              h: 4,
              minW: 3,
              minH: 3
            }
          ];
        } else {
          newLayout.lg = tab.layout.lg?.filter(item => item.i !== `chart-${chart.id}`) || [];
        }

        return {
          ...tab,
          selectedCharts: newSelectedCharts,
          layout: newLayout,
          hasUnsavedChanges: true
        };
      }
      return tab;
    }));
  };

  useEffect(() => {
    const savedSelection = localStorage.getItem('selectedSavedCharts');
    if (savedSelection) {
      const savedChartIds = JSON.parse(savedSelection);
      setSelectedSavedCharts(
        savedCharts.filter(chart => savedChartIds.includes(chart.id))
      );
    }
  }, [savedCharts]);

  useEffect(() => {
    const selectedIds = selectedSavedCharts.map(chart => chart.id);
    localStorage.setItem('selectedSavedCharts', JSON.stringify(selectedIds));
  }, [selectedSavedCharts]);

  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdownId]);

  // Get the dashboard button position for the animation origin
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Find the dashboard button element
    const button = document.querySelector('[data-dashboard-button]');
    if (button) {
      const rect = button.getBoundingClientRect();
      setButtonPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    }
  }, []);

  const [pinnedCharts, setPinnedCharts] = useState<number[]>([]);

  useEffect(() => {
    const fetchPinnedCharts = async () => {
      try {
        const charts = await getProjectDashboardCharts(Number(projectId));
        // Store the IDs of pinned charts
        setPinnedCharts(charts.map(chart => chart.id));
      } catch (error) {
        console.error('Error fetching pinned charts:', error);
      }
    };

    fetchPinnedCharts();
  }, [projectId]);

  const handleAddToDashboard = async (chart: SavedChart) => {
    try {
      await addChartToProjectDashboard(Number(projectId), chart.id);
      // Update local state
      setSavedCharts(prev => 
        prev.map(c => 
          c.id === chart.id 
            ? { ...c, is_pinned: true }
            : c
        )
      );
      // Add to pinned charts
      setPinnedCharts(prev => [...prev, chart.id]);
    } catch (error) {
      console.error('Error pinning chart:', error);
    }
  };

  // Add new refs and state for optimization
  const gridRef = useRef<HTMLDivElement>(null);

  // Add debounced layout change handler
  const debouncedLayoutChange = useCallback(
    debounce((currentLayout: Layout[], allLayouts: Layouts) => {
      onLayoutChange(allLayouts);
      // Trigger chart rerender only after layout is settled
      const chartElements = document.querySelectorAll('[data-chart-container]');
      chartElements.forEach(element => {
        const chart = element.querySelector('[data-chart]');
        if (chart) {
          (chart as any).__chartist?.update();
        }
      });
    }, 150),
    [onLayoutChange]
  );

  // Add visibility change handler
  const handleVisibilityChange = useCallback((entries: IntersectionObserverEntry[]) => {
    setVisibleCharts(prev => {
      const next = new Set([...prev]);
      entries.forEach(entry => {
        const chartId = entry.target.getAttribute('data-chart-id');
        const chart = savedCharts.find(c => `chart-${c.id}` === chartId);
        if (chart) {
          if (entry.isIntersecting) {
            next.add(chart);
          } else {
            next.delete(chart);
          }
        }
      });
      return Array.from(next);  // Convert Set back to array
    });
  }, [savedCharts]);

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(handleVisibilityChange, {
      root: gridRef.current,
      rootMargin: '100px',
      threshold: 0
    });

    const charts = document.querySelectorAll('[data-chart-container]');
    charts.forEach(chart => observer.observe(chart));

    return () => observer.disconnect();
  }, [handleVisibilityChange]);

  // Add optimized chart rendering function
  const renderChart = useCallback((item: DashboardItem | SavedChart, index: number) => {
    const chartId = `chart-${(item as SavedChart).id || index}`;
    const chartData = (item as SavedChart).chart_data || (item as DashboardItem).dashboardData;
    
    return (
      <div 
        key={chartId}
        data-chart-container
        data-chart-id={chartId}
        className={`chart-wrapper ${currentTheme === 'light' ? 'bg-white' : 'bg-gray-900'}`}
      >
        <ChartRenderer
          dashboard={chartData}
          hideDownload={true}
          dimensions={{
            width: 100,
            height: 100
          }}
          data-chart
        />
      </div>
    );
  }, [currentTheme]);

  const [isSaveLayoutOpen, setIsSaveLayoutOpen] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [savedLayouts, setSavedLayouts] = useState<DashboardLayoutConfig[]>([]);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Fetch saved layouts
  useEffect(() => {
    const fetchLayouts = async () => {
      try {
        const layouts = await getDashboardLayouts(Number(projectId));
        setSavedLayouts(layouts);
      } catch (error) {
        console.error('Error fetching layouts:', error);
      }
    };
    fetchLayouts();
  }, [projectId]);

  // Handle layout save
  const handleSaveLayout = async (name?: string) => {
    try {
      setIsLoadingLayout(true);
      const activeTab = getActiveTab();
      
      const layoutItems = activeTab.layout.lg.map(item => ({
        i: item.i,
        chartId: parseInt(item.i.replace('chart-', '')),
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW || 3,
        minH: item.minH || 3
      }));

      const layoutConfig = {
        name: name || activeTab.name,
        layout_data: {
          lg: layoutItems
        },
        charts: activeTab.selectedCharts
      };

      if (activeTab?.layoutId) {
        // Update existing layout
        await updateDashboardLayout(Number(projectId), activeTab.layoutId, layoutConfig);
      } else {
        // Save as new layout
        await saveDashboardLayout(Number(projectId), layoutConfig);
      }
      
      // Update tab state to reflect saved changes
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId
          ? { ...tab, hasUnsavedChanges: false }
          : tab
      ));

      const updatedLayouts = await getDashboardLayouts(Number(projectId));
      setSavedLayouts(updatedLayouts);
      setIsSaveLayoutOpen(false);
      showToast('Layout saved successfully', 'success');
    } catch (error) {
      console.error('Error saving layout:', error);
      showToast('Failed to save layout', 'error');
    } finally {
      setIsLoadingLayout(false);
    }
  };

  // Handle layout load
  const handleLoadLayout = async (layoutId: number) => {
    try {
      console.log('Current activeTabId:', activeTabId);
      console.log('Current tabs:', tabs);
      
      setIsLoadingLayout(true);
      const layout = await loadDashboardLayout(Number(projectId), layoutId);
      
      if (!layout?.layout_data || !layout?.charts) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND);
      }

      console.log('Loaded layout:', layout);

      // Update the current tab
      const updatedTabs = tabs.map(tab => 
        tab.id === activeTabId
          ? {
              ...tab,
              name: layout.name,
              selectedCharts: layout.charts,
              layout: {
                lg: layout.layout_data.lg.map((item) => ({
                  i: `chart-${item.chartId}`,
                  x: Number(item.x) || 0,
                  y: Number(item.y) || 0,
                  w: Number(item.w) || 6,
                  h: Number(item.h) || 4,
                  minW: Number(item.minW) || 3,
                  minH: Number(item.minH) || 3
                }))
              },
              layoutId: layoutId,
              hasUnsavedChanges: false
            }
          : tab
      );

      console.log('Updated tabs:', updatedTabs);
      setTabs(updatedTabs);

      setIsLayoutMenuOpen(false);
      showToast('Dashboard layout loaded successfully', 'success');
    } catch (err: any) {
      console.error('Error loading layout:', err);
      showToast(err.message || ERROR_MESSAGES.SERVER_ERROR, 'error');
    } finally {
      setIsLoadingLayout(false);
    }
  };

  // State for managing tabs and their associated layouts
  const [tabs, setTabs] = useState<DashboardTab[]>(() => {
    const savedTabs = localStorage.getItem('dashboardTabs');
    return savedTabs ? JSON.parse(savedTabs) : [{
      id: 'default',
      name: 'Default Layout',
      selectedCharts: [],
      layout: { lg: [] },
      hasUnsavedChanges: false
    }];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    return localStorage.getItem('dashboardActiveTab') || 'default';
  });

  // Add this effect to save tabs state
  useEffect(() => {
    localStorage.setItem('dashboardTabs', JSON.stringify(tabs));
  }, [tabs]);

  // Add this effect to save active tab
  useEffect(() => {
    localStorage.setItem('dashboardActiveTab', activeTabId);
  }, [activeTabId]);

  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Save final state when component unmounts
      localStorage.setItem('dashboardTabs', JSON.stringify(tabs));
      localStorage.setItem('dashboardActiveTab', activeTabId);
    };
  }, [tabs, activeTabId]);

  // Add helper function to get active tab
  const getActiveTab = () => tabs.find(tab => tab.id === activeTabId)!;

  // Update addNewTab function
  const addNewTab = () => {
    const newTabId = `tab-${tabs.length + 1}`;
    setTabs([...tabs, {
      id: newTabId,
      name: `Layout ${tabs.length + 1}`,
      selectedCharts: [],
      layout: { lg: [] },
      hasUnsavedChanges: false
    }]);
    setActiveTabId(newTabId);
  };

  // Function to switch tabs
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // Function to remove a tab
  const [tabToClose, setTabToClose] = useState<string | null>(null);

  const ConfirmDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    onSave, 
    title, 
    message 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void;
    onSave: () => void;
    title: string; 
    message: string; 
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className={`${
          currentTheme === 'light' 
            ? 'bg-white' 
            : 'bg-gray-800'
          } rounded-lg p-6 max-w-md w-full mx-4 shadow-xl`}
        >
          <h3 className={`text-lg font-semibold mb-2 ${
            currentTheme === 'light' 
              ? 'text-gray-900' 
              : 'text-gray-100'
          }`}>
            {title}
          </h3>
          <p className={`mb-4 ${
            currentTheme === 'light' 
              ? 'text-gray-600' 
              : 'text-gray-300'
          }`}>
            {message}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentTheme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentTheme === 'light'
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  : 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400'
              }`}
            >
              Save Layout
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            >
              Close Without Saving
            </button>
          </div>
        </div>
      </div>
    );
  };

  const removeTab = (tabId: string) => {
    setTabToClose(null);
    setTabs(tabs.filter(tab => tab.id !== tabId));
    if (activeTabId === tabId && tabs.length > 1) {
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const newIndex = currentIndex > 0 ? currentIndex - 1 : 1;
      setActiveTabId(tabs[newIndex].id);
    }
  };

  // Update layout for the active tab
  const handleLayoutChange = (currentLayout: Layout[], allLayouts: Layouts) => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId
        ? { 
            ...tab, 
            layout: allLayouts,
            hasUnsavedChanges: true 
          }
        : tab
    ));
  };

  // Add these new functions for tab management
  const handleTabNameEdit = (tabId: string, newName: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, name: newName, isEditing: false }
        : tab
    ));
  };

  const startTabEdit = (tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, isEditing: true }
        : { ...tab, isEditing: false }
    ));
  };

  // Update the close tab logic
  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.hasUnsavedChanges) {
      // If no unsaved changes, close immediately
      removeTab(tabId);
    } else {
      // If has unsaved changes, show confirmation
      setTabToClose(tabId);
    }
  };

  // Add this function to handle layout menu item click
  const handleLayoutMenuItemClick = async (layoutId: number) => {
    try {
      console.log('Loading layout into current tab:', activeTabId);
      setIsLoadingLayout(true);
      const layout = await loadDashboardLayout(Number(projectId), layoutId);
      
      if (!layout?.layout_data || !layout?.charts) {
        throw new Error(ERROR_MESSAGES.NOT_FOUND);
      }

      // Update current tab with loaded layout
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId
          ? {
              ...tab,
              name: layout.name,
              selectedCharts: layout.charts,
              layout: {
                lg: layout.layout_data.lg.map((item) => ({
                  i: `chart-${item.chartId}`,
                  x: Number(item.x) || 0,
                  y: Number(item.y) || 0,
                  w: Number(item.w) || 6,
                  h: Number(item.h) || 4,
                  minW: Number(item.minW) || 3,
                  minH: Number(item.minH) || 3
                }))
              },
              layoutId: layoutId,
              hasUnsavedChanges: false
            }
          : tab
      ));

      setIsLayoutMenuOpen(false);
      showToast('Layout loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading layout:', error);
      showToast('Failed to load layout', 'error');
    } finally {
      setIsLoadingLayout(false);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, chart: SavedChart) => {
    e.stopPropagation(); // Prevent chart selection when clicking pin
    try {
      if (pinnedCharts.includes(chart.id)) {
        await removeChartFromDashboard(Number(projectId), chart.id);
        setPinnedCharts(prev => prev.filter(id => id !== chart.id));
      } else {
        await addChartToProjectDashboard(Number(projectId), chart.id);
        setPinnedCharts(prev => [...prev, chart.id]);
      }
    } catch (error) {
      console.error('Error toggling pin status:', error);
    }
  };

  const downloadLayoutAsPDF = async () => {
    const layoutElement = document.querySelector('.layout');
    if (!layoutElement) return;

    try {
      const canvas = await html2canvas(layoutElement as HTMLElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`dashboard-layout.pdf`);
    } catch (error) {
      console.error('Error downloading layout:', error);
      showToast('Error downloading layout', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ 
        clipPath: `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 0 
      }}
      animate={{ 
        clipPath: `circle(${Math.hypot(window.innerWidth, window.innerHeight)}px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 1 
      }}
      exit={{ 
        clipPath: `circle(0px at ${buttonPosition.x}px ${buttonPosition.y}px)`,
        opacity: 0 
      }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 40
      }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ delay: 0.1 }}
        className={`${currentTheme === 'light' ? 'bg-white/80' : 'bg-[#1A1A1A]/80'} rounded-3xl w-[95vw] h-[95vh] flex flex-col overflow-hidden`}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <motion.div
            initial={false}
            animate={{
              width: isSidebarOpen ? "300px" : "0px",
              opacity: isSidebarOpen ? 1 : 0
            }}
            transition={{ duration: 0.2 }}
            className={`h-full border-r flex-shrink-0 ${
              currentTheme === 'light' 
                ? 'border-gray-200 bg-gray-50' 
                : 'border-gray-800 bg-[#141414]'
            }`}
          >
            <div className="h-full overflow-hidden flex flex-col">
              {/* Tab switcher */}
              <div className={`flex border-b ${
                currentTheme === 'light' ? 'border-gray-200' : 'border-gray-800'
              }`}>
                <button
                  onClick={() => setActiveTab('available')}
                  className={`flex-1 p-4 text-center font-medium ${
                    activeTab === 'available'
                      ? currentTheme === 'light'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'border-b-2 border-blue-400 text-blue-400'
                      : currentTheme === 'light'
                        ? 'text-gray-500'
                        : 'text-gray-400'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 p-4 text-center font-medium ${
                    activeTab === 'saved'
                      ? currentTheme === 'light'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'border-b-2 border-blue-400 text-blue-400'
                      : currentTheme === 'light'
                        ? 'text-gray-500'
                        : 'text-gray-400'
                  }`}
                >
                  Saved
                </button>
              </div>

              <div className="p-2 overflow-y-auto flex-1">
                {activeTab === 'available' ? (
                  // Available charts list
                  availableDashboards.map((item, index) => (
                    <div
                      key={item.dashboardData.Name}
                      onClick={() => toggleDashboardSelection(index)}
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer mb-2 transition-colors ${
                        selectedDashboards[index].selected
                          ? currentTheme === 'light'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-blue-900/20 border border-blue-800'
                          : currentTheme === 'light'
                            ? 'hover:bg-gray-100'
                            : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        selectedDashboards[index].selected
                          ? currentTheme === 'light'
                            ? 'bg-blue-100'
                            : 'bg-blue-900/30'
                          : currentTheme === 'light'
                            ? 'bg-gray-100'
                            : 'bg-gray-800'
                      }`}>
                        {selectedDashboards[index].selected ? (
                          <Minus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-blue-600'
                              : 'text-blue-400'
                          }`} />
                        ) : (
                          <Plus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium break-words ${
                          currentTheme === 'light'
                            ? 'text-gray-900'
                            : 'text-gray-100'
                        }`}>
                          {item.dashboardData.Name}
                        </p>
                        <p className={`text-sm break-words whitespace-normal ${
                          currentTheme === 'light'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}>
                          {item.query}
                        </p>
                      </div>
                      {/* Move dropdown menu outside the clickable area */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === index ? null : index);
                          }}
                          className={`p-2 rounded-lg ${
                            currentTheme === 'light'
                              ? 'hover:bg-gray-200 text-gray-600'
                              : 'hover:bg-gray-700 text-gray-200'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openDropdownId === index && (
                          <div 
                            className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg ${
                              currentTheme === 'light'
                                ? 'bg-white'
                                : 'bg-gray-800'
                            } ring-1 ring-black ring-opacity-5 z-10`}
                          >
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveChart(item);
                                  setOpenDropdownId(null);
                                }}
                                className={`block px-4 py-2 text-sm w-full text-left ${
                                  currentTheme === 'light'
                                    ? 'text-gray-700 hover:bg-gray-100'
                                    : 'text-gray-200 hover:bg-gray-700'
                                }`}
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadChart(item);
                                  setOpenDropdownId(null);
                                }}
                                className={`block px-4 py-2 text-sm w-full text-left ${
                                  currentTheme === 'light'
                                    ? 'text-gray-700 hover:bg-gray-100'
                                    : 'text-gray-200 hover:bg-gray-700'
                                }`}
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Saved charts list
                  savedCharts.map((chart) => (
                    <div
                      key={chart.id}
                      onClick={() => toggleSavedChartSelection(chart)}
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer mb-2 transition-colors ${
                        getActiveTab().selectedCharts.some(c => c.id === chart.id)
                          ? currentTheme === 'light'
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-blue-900/20 border border-blue-800'
                          : currentTheme === 'light'
                            ? 'hover:bg-gray-100'
                            : 'hover:bg-gray-800'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${
                        getActiveTab().selectedCharts.some(c => c.id === chart.id)
                          ? currentTheme === 'light'
                            ? 'bg-blue-100'
                            : 'bg-blue-900/30'
                          : currentTheme === 'light'
                            ? 'bg-gray-100'
                            : 'bg-gray-800'
                      }`}>
                        {getActiveTab().selectedCharts.some(c => c.id === chart.id) ? (
                          <Minus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-blue-600'
                              : 'text-blue-400'
                          }`} />
                        ) : (
                          <Plus className={`w-4 h-4 ${
                            currentTheme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium break-words ${
                          currentTheme === 'light'
                            ? 'text-gray-900'
                            : 'text-gray-100'
                        }`}>
                          {chart.name}
                        </p>
                        <p className={`text-sm break-words whitespace-normal ${
                          currentTheme === 'light'
                            ? 'text-gray-500'
                            : 'text-gray-400'
                        }`}>
                          {chart.query}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleTogglePin(e, chart)}
                        className={`p-1.5 rounded-full transition-colors ${
                          pinnedCharts.includes(chart.id)
                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                        title={pinnedCharts.includes(chart.id) ? "Unpin from dashboard" : "Pin to dashboard"}
                      >
                        <Pin 
                          className={`w-4 h-4 ${
                            pinnedCharts.includes(chart.id)
                              ? 'fill-current stroke-2' 
                              : 'stroke-[1.5px]'
                          }`}
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Main dashboard area */}
          <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              currentTheme === 'light'
                ? 'border-gray-200'
                : 'border-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2 rounded-lg transition-colors ${
                    currentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-600'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
                </button>
                <h2 className={`font-semibold ${
                  currentTheme === 'light'
                    ? 'text-gray-900'
                    : 'text-gray-100'
                }`}>Dashboard View</h2>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Add Layout Menu */}
                <div className="relative flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors shadow-lg ${
                      currentTheme === 'light' 
                        ? 'bg-teal/80 text-white hover:bg-teal-700' 
                        : 'bg-[#2A2A2A]/80 text-gray-200 hover:bg-[#2A2A2A] border-gray-800'
                    }`}
                  >
                    <Menu className="w-4 h-4" />
                    Layouts
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={downloadLayoutAsPDF}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors shadow-lg ${
                      currentTheme === 'light' 
                        ? 'bg-teal/80 text-white hover:bg-teal-700' 
                        : 'bg-[#2A2A2A]/80 text-gray-200 hover:bg-[#2A2A2A] border-gray-800'
                    }`}
                    title="Download Layout as PDF"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  
                  {isLayoutMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-md shadow-lg ${
                      currentTheme === 'light' ? 'bg-white' : 'bg-gray-800'
                    } ring-1 ring-black ring-opacity-5 z-10 top-full`}>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsLayoutMenuOpen(false);
                            setIsSaveLayoutOpen(true);
                          }}
                          className={`block px-4 py-2 text-sm w-full text-left ${
                            currentTheme === 'light'
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-200 hover:bg-gray-700'
                          }`}
                        >
                          Save Current Layout
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        {savedLayouts.map((layout) => (
                          <button
                            key={layout.id}
                            onClick={() => layout.id && handleLayoutMenuItemClick(layout.id)}
                            className={`block px-4 py-2 text-sm w-full text-left ${
                              currentTheme === 'light'
                                ? 'text-gray-700 hover:bg-gray-100'
                                : 'text-gray-200 hover:bg-gray-700'
                            }`}
                          >
                            {layout.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className={`p-2 rounded-full transition-colors ${
                    currentTheme === 'light'
                      ? 'hover:bg-gray-100 text-gray-600'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs for layouts */}
            <div className={`flex items-center gap-1 border-b overflow-x-auto ${
              currentTheme === 'light' ? 'border-gray-200' : 'border-gray-800'
            }`}>
              <div className="flex-1 flex items-center">
                {tabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`group flex items-center ${
                      activeTabId === tab.id
                        ? currentTheme === 'light'
                          ? 'border-b-2 border-blue-500'
                          : 'border-b-2 border-blue-400'
                        : ''
                    }`}
                  >
                    {tab.isEditing ? (
                      <input
                        type="text"
                        defaultValue={tab.name}
                        className={`px-4 py-2 bg-transparent focus:outline-none ${
                          currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'
                        }`}
                        onBlur={(e) => handleTabNameEdit(tab.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTabNameEdit(tab.id, e.currentTarget.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => switchTab(tab.id)}
                        onDoubleClick={() => startTabEdit(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg flex items-center justify-between ${
                          activeTabId === tab.id
                            ? currentTheme === 'light'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-blue-900 text-blue-400'
                            : currentTheme === 'light'
                            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        {tab.name}
                        {/* Only show close button if not default tab */}
                        {tab.id !== 'default' && (
                          <X
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTabClose(tab.id);
                            }}
                            className={`ml-2 w-3 h-3 transition-colors ${
                              currentTheme === 'light'
                                ? 'hover:text-gray-600'
                                : 'hover:text-gray-300'
                            }`}
                          />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addNewTab}
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  currentTheme === 'light'
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-blue-400 hover:bg-blue-900/20'
                }`}
              >
                <Plus className="w-4 h-4" />
                New Tab
              </button>
            </div>

            {/* Charts grid */}
            <div className="flex-1 overflow-auto p-4" ref={gridRef}>
              <ResponsiveGridLayout
                className="layout"
                layouts={getActiveTab().layout}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                onLayoutChange={handleLayoutChange}
                isDraggable={true}
                isResizable={true}
                margin={[16, 16]}
                containerPadding={[16, 16]}
                minW={4}
                minH={4}
              >
                {[
                  ...selectedDashboards
                    .filter(d => d.selected)
                    .map((dashboard, index) => ({
                      key: `chart-${index}`,
                      element: (
                        <div 
                          key={`chart-${index}`}
                          data-grid={{
                            i: `chart-${index}`,
                            x: (index % 2) * 6,
                            y: Math.floor(index / 2) * 4,
                            w: 6,
                            h: 4,
                            minW: 4,
                            minH: 4,
                            ...getActiveTab().layout.lg?.find(item => item.i === `chart-${index}`)
                          }}
                          className={`${currentTheme === 'light' ? 'bg-white' : 'bg-gray-900'} p-4 rounded-lg shadow-sm w-full h-full`}
                        >
                          <ChartRenderer
                            dashboard={dashboard.dashboardData}
                            hideDownload={true}
                            dimensions={{
                              width: 100,
                              height: 100
                            }}
                          />
                        </div>
                      )
                    })),
                  ...getActiveTab().selectedCharts.map(chart => ({
                    key: `chart-${chart.id}`,
                    element: (
                      <div 
                        key={`chart-${chart.id}`}
                        data-grid={{
                          i: `chart-${chart.id}`,
                          x: 0,
                          y: 0,
                          w: 6,
                          h: 4,
                          minW: 4,
                          minH: 4,
                          ...getActiveTab().layout.lg?.find(item => item.i === `chart-${chart.id}`)
                        }}
                        className={`${currentTheme === 'light' ? 'bg-white' : 'bg-gray-900'} p-4 rounded-lg shadow-sm w-full h-full`}
                      >
                        <ChartRenderer
                          dashboard={chart.chart_data}
                          hideDownload={true}
                          dimensions={{
                            width: 100,
                            height: 100
                          }}
                        />
                      </div>
                    )
                  }))
                ].map(item => item.element)}
              </ResponsiveGridLayout>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Layout Dialog */}
      <SaveLayoutDialog
        open={isSaveLayoutOpen}
        onOpenChange={setIsSaveLayoutOpen}
        onSave={handleSaveLayout}
        isLoading={isLoadingLayout}
      />

      <ConfirmDialog
        isOpen={tabToClose !== null}
        onClose={() => setTabToClose(null)}
        onConfirm={() => removeTab(tabToClose!)}
        onSave={async () => {
          const tab = tabs.find(t => t.id === tabToClose);
          if (tab?.layoutId) {
            // If this is an existing layout, save directly
            await handleSaveLayout();
            removeTab(tabToClose!);
          } else {
            // If this is a new layout, show the save dialog
            setIsSaveLayoutOpen(true);
            setTabToClose(null);
          }
        }}
        title="Close Tab"
        message="Would you like to save your changes before closing the tab?"
      />
    </motion.div>
  );
}
