import React, { useState, useEffect, useRef, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from "./ui/Button.tsx"
import { Send, User, Atom, ArrowLeft, ChevronDown, LayoutDashboard, X, Plus, Minus, ChevronLeft, ChevronRight, Sun, Moon, Download, Bookmark, Trash2, MoreVertical, ZoomIn, ZoomOut, Copy, BookmarkCheck } from 'lucide-react'
import { motion, AnimatePresence} from 'framer-motion'
import { saveProjectChart, getProjectCharts, sendMessage, sendStreamingMessage, SavedChart, deleteProjectChart, savePrompt, getSavedPrompts, SavedPrompt } from '../services/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme } from '../contexts/ThemeContext';
import './gridLayoutTheme.css'; // Add this import at the top
import DashboardView from './DashboardView';
import { ChartRenderer } from '../components/ChartRenderer'
import { NavBar } from './NavBar';
import { Menu, Transition } from '@headlessui/react'
import SavedPromptsDialog from './SavedPromptsDialog'
import { ScenarioSection } from './ScenarioSection'
import Logo from './Logo';
import { useToast } from '../contexts/ToastContext';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

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
  is_prediction?: boolean;
}

// Update Scenario type to match new schema
type Scenario = {
  id: string;
  description: string;
  probability: number;
  impact: 'High' | 'Medium' | 'Low';
  insights: string[];
  dashboards: Dashboard[];
}

// Update Message type to include scenarios
type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  dashboards?: Dashboard[];
  scenarios?: Scenario[]; // Add scenarios field
  isWaitingForDashboard?: boolean; // Add this flag
}

type DashboardItem = {
  dashboardData: Dashboard;
  query: string;
  selected: boolean;
}

type DashboardLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};



// Update formatMessage function to handle new scenario format
const formatMessage = (content: any) => {
  let parsedContent: string = '';
  let dashboards: Dashboard[] = [];
  let scenarios: Scenario[] = [];

  // Handle null or undefined content
  if (!content) {
    return {
      textContent: <div className="space-y-2 w-full [caret-color:transparent]"></div>,
      dashboards: [],
      scenarios: []
    };
  }

  // If it's the initial message or any non-API response, use it directly
  if (typeof content === 'string' && !content.includes('response":')) {
    parsedContent = content;
  } else {
    try {
      // Parse the nested response structure
      let jsonData;
      
      if (typeof content === 'object') {
        // If content is already an object
        if (content.Dashboard) {
          // Direct dashboard access without wrapper
          jsonData = content;
          parsedContent = content.Answer || ''; // Use empty string if Answer is missing
        } else if (content.response) {
          // Wrapped in response field, need to parse
          try {
            jsonData = JSON.parse(content.response);
            parsedContent = jsonData.Answer || '';
          } catch (parseError) {
            // If not valid JSON, use the response field directly
            parsedContent = content.response || '';
            jsonData = { Answer: parsedContent };
          }
        } else {
          // Unknown object structure
          parsedContent = JSON.stringify(content);
          jsonData = { Answer: parsedContent };
        }
      } else {
        // Try to parse as JSON string
        try {
          const wrapper = JSON.parse(content);
          if (wrapper.response) {
            try {
              jsonData = JSON.parse(wrapper.response);
              parsedContent = jsonData.Answer || '';
            } catch (parseError) {
              // If nested response is not valid JSON
              parsedContent = wrapper.response || '';
              jsonData = { Answer: parsedContent };
            }
          } else {
            // Direct JSON without wrapper
            jsonData = wrapper;
            parsedContent = wrapper.Answer || '';
          }
        } catch (parseError) {
          // If content is not a valid JSON string
          parsedContent = String(content);
          jsonData = { Answer: parsedContent };
        }
      }

      // Extract Dashboards if they exist
      if (jsonData.Dashboard && Array.isArray(jsonData.Dashboard)) {
        dashboards = jsonData.Dashboard.map(dashboardData => ({
          Name: dashboardData.Name || 'Unnamed Chart',
          Type: dashboardData.Type as Dashboard['Type'] || 'BarChart',
          X_axis_label: dashboardData.X_axis_label || '',
          Y_axis_label: dashboardData.Y_axis_label || '',
          Y_axis_label_secondary: dashboardData.Y_axis_label_secondary,
          X_axis_data: dashboardData.X_axis_data || [],
          Y_axis_data: dashboardData.Y_axis_data || [],
          labels: dashboardData.Labels || [],
          Values: dashboardData.Values || [],
          Column_headers: dashboardData.Column_headers || [],
          Row_data: dashboardData.Row_data || [],
          Forecasted_X_axis_data: dashboardData.Forecasted_X_axis_data || [],
          Forecasted_Y_axis_data: dashboardData.Forecasted_Y_axis_data || [],
          Y_axis_data_secondary: dashboardData.Y_axis_data_secondary || [],
          is_prediction: dashboardData.is_prediction || false
        }));
      }

      // Handle scenarios from response
      if (jsonData.Scenarios && Array.isArray(jsonData.Scenarios)) {
        scenarios = jsonData.Scenarios.map(scenario => ({
          id: scenario.id || String(Math.random()),
          description: scenario.description || 'Unnamed Scenario',
          probability: scenario.probability || 0,
          impact: scenario.impact || 'Medium',
          insights: scenario.insights || [],
          dashboards: Array.isArray(scenario.Dashboard) ? scenario.Dashboard.map(dashboardData => ({
            Name: dashboardData.Name || 'Unnamed Chart',
            Type: dashboardData.Type as Dashboard['Type'] || 'BarChart',
            X_axis_label: dashboardData.X_axis_label || '',
            Y_axis_label: dashboardData.Y_axis_label || '',
            Y_axis_label_secondary: dashboardData.Y_axis_label_secondary || '',
            X_axis_data: dashboardData.X_axis_data || [],
            Y_axis_data: dashboardData.Y_axis_data || [],
            labels: dashboardData.Labels || [],
            Values: dashboardData.Values || [],
            Column_headers: dashboardData.Column_headers || [],
            Row_data: dashboardData.Row_data || [],
            Forecasted_X_axis_data: dashboardData.Forecasted_X_axis_data || [],
            Forecasted_Y_axis_data: dashboardData.Forecasted_Y_axis_data || [],
            Y_axis_data_secondary: dashboardData.Y_axis_data_secondary || [],
            is_prediction: dashboardData.is_prediction || false
          })) : []
        }));
      }
    } catch (e) {
      console.error('Error parsing message:', e);
      parsedContent = String(content);
    }
  }

  // Ensure parsedContent is always a string
  parsedContent = String(parsedContent);

  return {
    textContent: (
      <div className="space-y-2 w-full [caret-color:transparent]">
        {parsedContent.split('\n').map((rawLine, index) => {
          const line = rawLine.replace(/\t/g, '    '); // replace tabs with spaces
          const trimmed = line.trim();
          // Empty line
          if (!trimmed) return <div key={index} className="h-2" />;

          // Header: **Header Text**
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            const headerText = trimmed.slice(2, -2).trim();
            return (
              <p key={index} className="font-bold text-lg mt-4 mb-1">
                {headerText}
              </p>
            );
          }

          // Bold inline
          if (trimmed.includes('**')) {
            const parts = trimmed.split('**');
            return (
              <p key={index} className="min-w-0">
                {parts.map((part, pi) =>
                  pi % 2 === 0 ? <span key={pi}>{part}</span> : <span key={pi} className="font-bold">{part}</span>
                )}
              </p>
            );
          }

          // Quoted text
          if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
            return (
              <p key={index} className="italic bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                {trimmed.slice(1, -1)}
              </p>
            );
          }

          // Numbered list
          if (/^\d+\./.test(trimmed)) {
            return (
              <p key={index} className="ml-4 list-decimal list-inside">
                {trimmed}
              </p>
            );
          }

          // Bullet list (single dash)
          if (/^-\s+/.test(trimmed)) {
            return (
              <p key={index} className="ml-4 list-disc list-inside">
                {trimmed.slice(2).trim()}
              </p>
            );
          }

          // Sub-bullet (double dash)
          if (/^--\s+/.test(trimmed)) {
            return (
              <p key={index} className="ml-8 list-disc list-inside">
                {trimmed.slice(3).trim()}
              </p>
            );
          }

          // Default paragraph
          return (
            <p key={index} className="min-w-0">
              {trimmed}
            </p>
          );
        })}
      </div>
    ),
    dashboards,
    scenarios
  };
};

// Add helper function to validate dashboard data
const isValidDashboardData = (dashboard: Dashboard): boolean => {
  switch (dashboard.Type) {
    case 'LineChart':
    case 'BarChart':
    case 'ScatterPlot':
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label
      );
    case 'PieChart':
    case 'DonutChart':
      return Boolean(
        dashboard.labels &&
        dashboard.Values &&
        dashboard.labels.length === dashboard.Values.length
      );
    case 'Table':
      return Boolean(
        dashboard.Column_headers &&
        dashboard.Row_data
      );
    case 'DoubleBarChart':
    case 'DualColorLineChart':
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.Y_axis_data_secondary &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label
      );
    default:
      return false;
  }
};

// Add this professional color palette constant
const chartColors = {
  primary: [
    'rgba(54, 162, 235, 0.7)',   // Blue
    'rgba(75, 192, 192, 0.7)',   // Teal
    'rgba(153, 102, 255, 0.7)',  // Purple
    'rgba(255, 159, 64, 0.7)',   // Orange
    'rgba(255, 99, 132, 0.7)',   // Pink
    'rgba(255, 205, 86, 0.7)',   // Yellow
    'rgba(83, 166, 157, 0.7)',   // Sea Green
    'rgba(156, 39, 176, 0.7)',   // Deep Purple
  ],
  primaryBorder: [
    'rgb(54, 162, 235)',     // Blue
    'rgb(75, 192, 192)',     // Teal
    'rgb(153, 102, 255)',    // Purple
    'rgb(255, 159, 64)',     // Orange
    'rgb(255, 99, 132)',     // Pink
    'rgb(255, 205, 86)',     // Yellow
    'rgb(83, 166, 157)',     // Sea Green
    'rgb(156, 39, 176)',     // Deep Purple
  ],
  // Single color for line charts
  line: {
    background: 'rgba(54, 162, 235, 0.7)',
    border: 'rgb(54, 162, 235)'
  }
};

// Separate the chart rendering logic into its own function
const renderChart = (dashboard: Dashboard, hideDownload: boolean = false, dimensions?: { width: number; height: number }) => {
  if (!isValidDashboardData(dashboard)) {
    console.error('Invalid dashboard data:', dashboard);
    return null;
  }

  const chartId = `chart-${dashboard.Name.replace(/\s+/g, '-')}`;

  return (
    <div className="w-full relative">
      {!hideDownload && dashboard.Type !== 'Table' && (
        <div className="absolute -top-4 -right-4 z-10">
          <button
            onClick={() => downloadChartAsPNG(chartId, dashboard.Name)}
            className="p-6 text-gray-600 hover:text-teal-600 transition-colors"
            title="Download PNG"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      )}
      {!hideDownload && dashboard.Type === 'Table' && (
        <div className="absolute -top-4 -right-4 z-10">
          <button
            onClick={() => downloadTableAsXLSX(dashboard, dashboard.Name)}
            className="p-6 text-gray-600 hover:text-teal-600 transition-colors"
            title="Download Excel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      )}
      <div id={chartId} className="bg-white p-4 rounded-lg overflow-x-auto" style={{ height: '400px' }}>
        {(() => {
          switch (dashboard.Type) {
            case 'LineChart':
              return (
                <Line
                  data={{
                    labels: dashboard.X_axis_data.map(String),
                    datasets: [{
                      label: dashboard.Y_axis_label,
                      data: dashboard.Y_axis_data,
                      borderColor: 'rgb(13, 148, 136)',
                      backgroundColor: 'rgba(13, 148, 136, 0.5)',
                      tension: 0.1,
                      pointRadius: 5,
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 0,
                      easing: 'easeInOutQuad'
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: dashboard.Y_axis_label
                        },
                        ticks: {
                          padding: 5,
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: dashboard.X_axis_label
                        },
                        ticks: {
                          padding: 5,
                          autoSkip: false
                        }
                      }
                    }
                  }}
                />
              );

            case 'BarChart':
              return (
                <Bar
                  data={{
                    labels: dashboard.X_axis_data.map((_, i) => `Item ${i + 1}`),
                    datasets: [{
                      label: dashboard.Name,
                      data: dashboard.Y_axis_data,
                      backgroundColor: [
                        'rgba(13, 148, 136, 0.5)',  // Teal
                        'rgba(59, 130, 246, 0.5)',  // Blue
                        'rgba(147, 51, 234, 0.5)',  // Purple
                        'rgba(239, 68, 68, 0.5)',   // Red
                        'rgba(245, 158, 11, 0.5)',  // Amber
                        'rgba(16, 185, 129, 0.5)',  // Emerald
                        'rgba(236, 72, 153, 0.5)',  // Pink
                        'rgba(59, 130, 246, 0.5)',  // Light Blue
                      ],
                      borderColor: [
                        'rgb(13, 148, 136)',    // Teal
                        'rgb(59, 130, 246)',    // Blue
                        'rgb(147, 51, 234)',    // Purple
                        'rgb(239, 68, 68)',     // Red
                        'rgb(245, 158, 11)',    // Amber
                        'rgb(16, 185, 129)',    // Emerald
                        'rgb(236, 72, 153)',    // Pink
                        'rgb(59, 130, 246)',    // Light Blue
                      ],
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 0,
                      easing: 'easeInOutQuad'
                    },
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: dashboard.Y_axis_label
                        },
                        ticks: {
                          padding: 5,
                        },
                        grid: {
                          display: true
                        },
                        min: 0,
                        suggestedMax: Math.max.apply(null, dashboard.Y_axis_data) * 1.1
                      },
                      x: {
                        display: false,
                        grid: {
                          display: true
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: true,
                        position: 'right',
                        labels: {
                          padding: 20,
                          generateLabels: () => {
                            return dashboard.X_axis_data.map((label, i) => ({
                              text: `${label} (${dashboard.Y_axis_data[i]})`,
                              fillStyle: ['rgba(13, 148, 136, 0.5)', 'rgba(59, 130, 246, 0.5)', 'rgba(147, 51, 234, 0.5)', 
                                'rgba(239, 68, 68, 0.5)', 'rgba(245, 158, 11, 0.5)', 'rgba(16, 185, 129, 0.5)', 
                                'rgba(236, 72, 153, 0.5)', 'rgba(59, 130, 246, 0.5)'][i % 8],
                              strokeStyle: ['rgb(13, 148, 136)', 'rgb(59, 130, 246)', 'rgb(147, 51, 234)', 
                                'rgb(239, 68, 68)', 'rgb(245, 158, 11)', 'rgb(16, 185, 129)', 
                                'rgba(236, 72, 153)', 'rgb(59, 130, 246)'][i % 8],
                              lineWidth: 1,
                              hidden: false,
                              index: i
                            }));
                          }
                        }
                      },
                      tooltip: {
                        callbacks: {
                          title: (context) => {
                            const index = context[0].dataIndex;
                            return dashboard.X_axis_data[index].toString();
                          },
                          label: (context) => `${context.raw}`
                        }
                      }
                    }
                  }}
                />
              );

            case 'PieChart':
            case 'DonutChart':
              const pieChartColors = {
                backgroundColor: [
                  'rgba(13, 148, 136, 0.7)',    // Teal
                  'rgba(37, 99, 235, 0.7)',     // Blue
                  'rgba(147, 51, 234, 0.7)',    // Purple
                  'rgba(239, 68, 68, 0.7)',     // Red
                  'rgba(245, 158, 11, 0.7)',    // Amber
                  'rgba(16, 185, 129, 0.7)',    // Emerald
                  'rgba(236, 72, 153, 0.7)',    // Pink
                  'rgba(59, 130, 246, 0.7)',    // Light Blue
                  'rgba(168, 85, 247, 0.7)',    // Violet
                  'rgba(251, 146, 60, 0.7)',    // Orange
                ],
                borderColor: [
                  'rgb(13, 148, 136)',      // Teal
                  'rgb(37, 99, 235)',       // Blue
                  'rgb(147, 51, 234)',      // Purple
                  'rgb(239, 68, 68)',       // Red
                  'rgb(245, 158, 11)',      // Amber
                  'rgb(16, 185, 129)',      // Emerald
                  'rgb(236, 72, 153)',      // Pink
                  'rgb(59, 130, 246)',      // Light Blue
                  'rgb(168, 85, 247)',      // Violet
                  'rgb(251, 146, 60)',      // Orange
                ]
              };

              return (
                <Pie
                  data={{
                    labels: dashboard.labels,
                    datasets: [{
                      data: dashboard.Values,
                      backgroundColor: pieChartColors.backgroundColor,
                      borderColor: pieChartColors.borderColor,
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 0,
                      easing: 'easeInOutQuad'
                    },
                    scales: {
                      x: {
                        display: false,
                      },
                      y: {
                        display: false,
                      }
                    },
                    maintainAspectRatio: false,
                    cutout: dashboard.Type === 'DonutChart' ? '50%' : undefined,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                        display: true,
                        labels: {
                          padding: 20,
                          generateLabels: () => {
                            return dashboard.labels.map((label, i) => ({
                              text: `${label} (${dashboard.Values[i]})`,
                              fillStyle: pieChartColors.backgroundColor[i % pieChartColors.backgroundColor.length],
                              strokeStyle: pieChartColors.borderColor[i % pieChartColors.borderColor.length],
                              lineWidth: 1,
                              hidden: false,
                              index: i
                            }));
                          }
                        }
                      },
                      tooltip: {
                        enabled: true,
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.raw as number;
                            const total = context.dataset.data.reduce((acc: number, curr: number) => acc + curr, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              );

            case 'ScatterPlot':
              const points = (dashboard.X_axis_data as number[]).map((x, i) => ({
                x,
                y: (dashboard.Y_axis_data as number[])[i]
              }));

              return (
                <Scatter
                  data={{
                    datasets: [{
                      label: dashboard.Name,
                      data: points,
                      backgroundColor: 'rgba(13, 148, 136, 0.5)',
                      borderColor: 'rgb(13, 148, 136)',
                    }]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 300,
                      easing: 'easeInOutQuad'
                    }
                  }}
                />
              );

            case 'Histogram':
              // For histogram, we'll use Bar chart with specific options
              return (
                <Bar
                  data={{
                    labels: dashboard.X_axis_data.map(String),
                    datasets: [{
                      label: dashboard.Y_axis_label,
                      data: dashboard.Y_axis_data,
                      backgroundColor: 'rgba(13, 148, 136, 0.5)',
                      borderColor: 'rgb(13, 148, 136)',
                      borderWidth: 1,
                      barPercentage: 1,
                      categoryPercentage: 1,
                    }]
                  }}
                />
              );

            case 'Table':
              return (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {dashboard.Column_headers?.map((header, index) => (
                          <th
                            key={index}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboard.Row_data?.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

            case 'DoubleBarChart':
              return (
                <Bar
                  data={{
                    labels: dashboard.X_axis_data.map(String),
                    datasets: [
                      {
                        label: 'Project 1',
                        data: dashboard.Y_axis_data,
                        backgroundColor: 'rgba(13, 148, 136, 0.5)',  // Teal
                        borderColor: 'rgb(13, 148, 136)',
                        borderWidth: 1,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                      },
                      {
                        label: 'Project 2',
                        data: dashboard.Y_axis_data_secondary,
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',  // Blue
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                      }
                    ]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 0,
                      easing: 'easeInOutQuad'
                    },
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: dashboard.Y_axis_label
                        },
                        ticks: {
                          callback: (value) => `₹${value}L`
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: dashboard.X_axis_label
                        },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.dataset.label}: ₹${context.raw}L`
                        }
                      }
                    }
                  }}
                />
              );
            case 'DualColorLineChart':
              return (
                <Line
                  data={{
                    labels: dashboard.X_axis_data.map(String),
                    datasets: [
                      {
                        label: 'Current Cost',
                        data: dashboard.Y_axis_data,
                        borderColor: 'rgb(13, 148, 136)',  // Teal
                        backgroundColor: 'rgba(13, 148, 136, 0.5)',
                        tension: 0.1,
                        pointRadius: 4,
                        borderWidth: 2
                      },
                      {
                        label: 'Forecasted Cost',
                        data: dashboard.Y_axis_data_secondary,
                        borderColor: 'rgb(59, 130, 246)',  // Blue
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        tension: 0.1,
                        pointRadius: 4,
                        borderWidth: 2,
                        fill: true
                      }
                    ]
                  }}
                  options={{
                    ...commonOptions,
                    animation: {
                      duration: 0,
                      easing: 'easeInOutQuad'
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: dashboard.Y_axis_label
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: dashboard.X_axis_label
                        },
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20
                        }
                      }
                    }
                  }}
                />
              );
          }
        })()}
      </div>
    </div>
  );
};

// Replace the LoadingMessage component with the original "ConstroMan is thinking" animation
const LoadingMessage = () => {
  const text = "ConstroMan is thinking...";
  const { currentTheme } = useTheme();
  
  return (
    <div className="flex flex-col items-start gap-3 w-full">
      <div className="text-sm font-medium flex whitespace-pre">
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            className={`${
              currentTheme === 'light' ? 'text-teal-600' : 'text-teal-400'
            } inline-block`}
            animate={{ 
              y: [0, -5, 0],
              transition: {
                repeat: Infinity,
                duration: 1.2,
                delay: index * 0.06,
                ease: "easeInOut"
              }
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

// First add a simple dashboard loading component
const DashboardLoadingIndicator = () => {
  const { currentTheme } = useTheme();
  
  return (
    <div className={`text-center py-2 ${
      currentTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
    } text-sm`}>
      Creating dashboard...
    </div>
  );
};

// Add a Welcome component to replace the first message
const WelcomeSection = ({ onSendMessage }) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  
  const suggestedPrompts = [
    "Compare cost performance across different projects",
    "Analyze material procurement trends",
    "Show a monthly breakdown of construction delays",
    "Project completion time estimates for ongoing projects" 
  ];

  return (
    <div className={`w-full max-w-4xl mx-auto ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
      <div className="text-center mb-12">
        <div className="mx-auto w-28 h-28 mb-6">
          <Logo size="lg" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Welcome to ConstroMan</h1>
        <p className="text-lg opacity-80 max-w-md mx-auto">
          Your AI assistant for data analysis and visualization in construction and real estate
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {suggestedPrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSendMessage(prompt)}
            className={`text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
              isDark 
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="text-sm">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Initialize a counter for unique message IDs
let messageIdCounter = 2; // Starting from 2 since the initial message has id '1'

// Add this near the top of the file with other constants
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0, // Disable animations completely
    easing: 'easeInOutQuad'
  },
  resizeDelay: 0, // Remove resize delay
  elements: {
    line: {
      tension: 0.4, // Smoother line charts
      hoverBorderWidth: 3, // Add hover effect
    },
    point: {
      radius: 5, // Default point radius
      hoverRadius: 7, // Increase radius on hover
    },
    bar: {
      hoverBackgroundColor: 'rgba(75, 192, 192, 0.8)', // Change color on hover
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        padding: 5,
      },
      grid: {
        drawBorder: true,
        display: true
      }
    },
    x: {
      ticks: {
        padding: 5,
      },
      grid: {
        drawBorder: true,
        display: true
      }
    }
  },
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        generateLabels: (chart) => {
          const datasets = chart.data.datasets;
          const labels = chart.data.labels || [];
          
          return labels.map((label, i) => ({
            text: `${label} (${datasets[0].data[i]})`,
            fillStyle: datasets[0].backgroundColor instanceof Array 
              ? datasets[0].backgroundColor[i] 
              : datasets[0].backgroundColor,
            strokeStyle: datasets[0].borderColor instanceof Array 
              ? datasets[0].borderColor[i] 
              : datasets[0].borderColor,
            lineWidth: 1,
            hidden: false,
            index: i
          }));
        }
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark background for tooltips
      titleColor: '#fff', // White title color
      bodyColor: '#fff', // White body color
      borderColor: '#fff', // White border color
      borderWidth: 1, // Border width for tooltips
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || '';
          const value = context.raw as number;
          return `${label}: ${value}`;
        }
      }
    }
  }
};

const downloadChartAsPNG = async (chartId: string, fileName: string) => {
  const chartElement = document.getElementById(chartId);
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${fileName}.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
    }
  }
};

const downloadTableAsXLSX = (dashboard: Dashboard, fileName: string) => {
  try {
    const rowData = dashboard.Row_data || []; // Ensure Row_data is defined
    const worksheet = XLSX.utils.aoa_to_sheet([dashboard.Column_headers || [], ...rowData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error downloading table:', error);
  }
};

// Add theme type and interface
type Theme = 'light' | 'dark';

interface ThemeStyles {
  background: string;
  backgroundImage?: string;
  messageUserBg: string;
  messageAiBg: string;
  messageUserText: string;
  messageAiText: string;
  iconBg: string;
}

// Add theme configurations
const themes: Record<Theme, ThemeStyles> = {
  light: {
    background: '#E8E0D5',
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    messageUserBg: '#8B7355',
    messageAiBg: '#F5F1EA',
    messageUserText: 'text-white',
    messageAiText: 'text-gray-800',
    iconBg: '#8B7355'
  },
  dark: {
    background: '#1A1A1A',
    messageUserBg: '#2A2A2A',
    messageAiBg: '#323232',
    messageUserText: 'text-gray-200',
    messageAiText: 'text-gray-200',
    iconBg: '#2A2A2A'
  }
};

function downloadDashboard() {
  // Implement the logic to download the dashboard data
  console.log("Downloading dashboard...");
  // Example: You might want to convert the dashboard data to a file format and trigger a download
}

// Near the top of your file, update the shimmer styles
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -100% center;
    }
    100% {
      background-position: 200% center;
    }
  }
`;

export default function Chat() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedDashboardIndices, setSelectedDashboardIndices] = useState<{[messageId: string]: number}>({});
  const [showDashboardView, setShowDashboardView] = useState(false);
  const [availableDashboards, setAvailableDashboards] = useState<DashboardItem[]>([]);

  const handleBack = () => {
    navigate(`/project/${projectId}`);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hello! I'm ConstroMan, your AI assistant for data analysis and visualization in construction and real estate. How can I help you today?",
      timestamp: new Date()
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isAIResponding, setIsAIResponding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [isFirstVisit, setIsFirstVisit] = useState(true);

  const handleSendMessage = async (e: React.FormEvent | string) => {
    if (e && typeof e !== 'string') e.preventDefault();
    
    const messageText = typeof e === 'string' ? e : inputMessage;
    
    if (messageText.trim() && !isAIResponding) {
      // Check for duplicate messages - prevent sending the same query twice in a row
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user' && lastMessage.content === messageText) {
        return; // Don't send duplicate message
      }
      
      const newUserMessage: Message = {
        id: (messageIdCounter++).toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date()
      };
      
      // Update messages with user message
      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);
      setInputMessage('');
      setIsFirstVisit(false);

      // Add an empty AI message with loading state
      const aiMessageId = (messageIdCounter++).toString();
      const newAiMessage: Message = {
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: new Date(),
        isLoading: true,
        isWaitingForDashboard: false
      };
      
      setMessages([...updatedMessages, newAiMessage]);
      
      // Set loading states
      setIsAIResponding(true);
      
      let textStreamComplete = false;
      let dashboardsReceived = false;

      try {
        // Start streaming response for immediate feedback
        const streamPromise = sendStreamingMessage(
          messageText, 
          projectId || 'default',
          (textChunk) => {
            // Update the AI message as chunks arrive
            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (msg.id === aiMessageId) {
                  return {
                    ...msg,
                    content: textChunk,
                    isLoading: false,
                  };
                }
                return msg;
              });
            });
          }
        ).finally(() => {
          textStreamComplete = true;
          // If text is done but dashboards aren't, show dashboard loading
          setMessages((prevMessages) =>
            prevMessages.map((msg) => {
              if (msg.id === aiMessageId && !dashboardsReceived) {
                return { ...msg, isWaitingForDashboard: true };
              }
              return msg;
            })
          );
        });
        
        // In parallel, fetch structured data (dashboards, scenarios)
        const structuredPromise = sendMessage(messageText, projectId || 'default')
          .catch(error => {
            console.warn('Error fetching structured data:', error);
            // Return null instead of throwing to allow stream to continue
            return null;
          }).finally(() => {
            dashboardsReceived = true;
            // Ensure the waiting flag is turned off when structured promise finishes
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg.id === aiMessageId) {
                  return { ...msg, isWaitingForDashboard: false };
                }
                return msg;
              })
            );
          });
        
        // Wait for both to complete
        const [streamResponse, structuredResponse] = await Promise.all([
          streamPromise.catch(error => {
            console.error('Stream error:', error);
            textStreamComplete = true;
            // Return the error message
            return `I'm sorry, there was an error with the streaming response: ${error.message || 'Unknown error'}`;
          }),
          structuredPromise
        ]);
        
        // Parse structured data for dashboards, scenarios
        if (structuredResponse) {
          try {
            // Parse dashboard data but don't modify the streamed text content
            const dashboardData = formatMessage(structuredResponse);
            
            // Update the AI message with structured data only, preserving the streamed text
            setMessages((prevMessages) => {
              return prevMessages.map((msg) => {
                if (msg.id === aiMessageId) {
                  return {
                    ...msg,
                    // Don't replace the content, just add dashboards and scenarios
                    dashboards: dashboardData.dashboards || [],
                    scenarios: dashboardData.scenarios || [],
                    isLoading: false,
                    isWaitingForDashboard: false
                  };
                }
                return msg;
              });
            });
            
            // Add dashboards if available
            if (dashboardData.dashboards && dashboardData.dashboards.length > 0) {
              const newDashboardItems = dashboardData.dashboards.map(dashboard => ({
                dashboardData: dashboard,
                query: messageText,
                selected: false
              }));
              setAvailableDashboards(prev => [...prev, ...newDashboardItems]);
            }
          } catch (formatError) {
            console.error('Error formatting structured response:', formatError);
          }
        }
      } catch (error) {
        console.error('Error in message handling:', error);
        
        // Update with error message
        setMessages(prevMessages => 
          prevMessages.map((msg) => {
            if (msg.id === aiMessageId) {
              return {
                ...msg,
                content: error.response?.data?.message || 
                         "I'm sorry, there was an error processing your request. Please try again.",
                isLoading: false,
                isWaitingForDashboard: false
              };
            }
            return msg;
          })
        );
      } finally {
        setIsAIResponding(false);
      }
    }
  };

  const toggleDashboardSelection = (index: number) => {
    setAvailableDashboards(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const { currentTheme, setCurrentTheme } = useTheme();

  // Add theme toggle button to the top buttons group
  const themeStyles = themes[currentTheme];
  
  const [dashboardLayouts, setDashboardLayouts] = useState<{ [key: string]: DashboardLayout[] }>(() => {
    const savedLayouts = localStorage.getItem('dashboardLayouts');
    return savedLayouts ? JSON.parse(savedLayouts) : {};
  });

  const [savedPrompts, setSavedPrompts] = useState<Set<string>>(new Set());

  const handleSavePrompt = async (content: string) => {
    // Check if prompt is already saved
    if (savedPrompts.has(content)) {
      showToast("Prompt already saved", "info");
      return;
    }

    try {
      await savePrompt({ 
        content, 
        project_id: Number(projectId)
      });
      setSavedPrompts(prev => new Set(prev).add(content));
      showToast("Prompt saved successfully", "success");
    } catch (error) {
      console.error('Error saving prompt:', error);
      showToast("Failed to save prompt", "error");
    }
  }

  const handleCopyPrompt = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const [isSavedPromptsOpen, setIsSavedPromptsOpen] = useState(false)

  const handleSelectPrompt = (prompt: SavedPrompt) => {
    setInputMessage(prompt.content)
    // Optionally, scroll to input or trigger sending automatically
  }

  useEffect(() => {
    // Add shimmer animation styles to document head
    const styleTag = document.createElement('style');
    styleTag.innerHTML = shimmerStyles;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex h-screen [&_*]:caret-transparent"
        style={{ 
          backgroundColor: themeStyles.background,
          backgroundImage: themeStyles.backgroundImage,
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <motion.div
            initial={{ width: 40 }}
            whileHover={{ width: 240 }}
            className={`${currentTheme === 'light' ? 'bg-white' : 'bg-[#2A2A2A]'} rounded-full shadow-lg overflow-hidden`}
          >
            <button
              onClick={handleBack}
              className={`w-full h-10 flex items-center px-3 gap-2 ${
                currentTheme === 'light' 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-[#323232]'
              }`}
            >
              <ArrowLeft className={`w-5 h-5 flex-shrink-0 ${
                currentTheme === 'light' 
                  ? 'text-gray-600' 
                  : 'text-gray-200'
              }`} />
              <span className={`whitespace-nowrap ${
                currentTheme === 'light' 
                  ? 'text-gray-600' 
                  : 'text-gray-200'
              }`}>Back to Project Dashboard</span>
            </button>
          </motion.div>
        </div>

        {/* Vertical Navbar - With tooltips */}
        <div className={`absolute top-20 left-4 z-20 flex flex-col gap-2 rounded-full ${
          currentTheme === 'light' ? 'bg-white' : 'bg-[#2A2A2A]'
        } shadow-lg p-2`}>
          {/* Dashboard View Button */}
          <div className="relative group">
            <button
              onClick={() => setShowDashboardView(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                currentTheme === 'light' 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-[#323232]'
              } transition-colors`}
            >
              <LayoutDashboard className={`w-5 h-5 ${
                currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
              }`} />
            </button>
            <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`${
                currentTheme === 'light' ? 'bg-white' : 'bg-[#2A2A2A]'
              } rounded-lg shadow-lg px-3 py-1.5 whitespace-nowrap`}>
                <span className={`${
                  currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
                }`}>Dashboard View</span>
              </div>
            </div>
          </div>

          {/* Saved Prompts Button */}
          <div className="relative group">
            <button
              onClick={() => setIsSavedPromptsOpen(true)}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                currentTheme === 'light' 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-[#323232]'
              } transition-colors`}
            >
              <BookmarkCheck className={`w-5 h-5 ${
                currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
              }`} />
            </button>
            <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`${
                currentTheme === 'light' ? 'bg-white' : 'bg-[#2A2A2A]'
              } rounded-lg shadow-lg px-3 py-1.5 whitespace-nowrap`}>
                <span className={`${
                  currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
                }`}>Saved Prompts</span>
              </div>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <div className="relative group">
            <button
              onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                currentTheme === 'light' 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-[#323232]'
              } transition-colors`}
            >
              <div className="relative w-5 h-5">
                <motion.div
                  initial={false}
                  animate={{
                    rotate: currentTheme === 'light' ? 0 : 180,
                    scale: currentTheme === 'light' ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Sun className={`w-5 h-5 ${
                    currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
                  }`} />
                </motion.div>
                <motion.div
                  initial={false}
                  animate={{
                    rotate: currentTheme === 'light' ? -180 : 0,
                    scale: currentTheme === 'light' ? 0 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Moon className={`w-5 h-5 ${
                    currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
                  }`} />
                </motion.div>
              </div>
            </button>
            <div className="absolute left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`${
                currentTheme === 'light' ? 'bg-white' : 'bg-[#2A2A2A]'
              } rounded-lg shadow-lg px-3 py-1.5 whitespace-nowrap`}>
                <span className={`${
                  currentTheme === 'light' ? 'text-gray-600' : 'text-gray-200'
                }`}>Switch to {currentTheme === 'light' ? 'dark' : 'light'} mode</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col relative [&_*]:caret-transparent">
          <div className="flex-1 overflow-y-auto p-4 px-6">
            <div className="max-w-4xl mx-auto space-y-6 pt-6">
              {/* Welcome section shown on first visit instead of first message */}
              {isFirstVisit ? (
                <WelcomeSection onSendMessage={handleSendMessage} />
              ) : (
                <>
                  {messages.map((message, index) => {
                    // Skip the first welcome message if needed
                    if (index === 0 && message.role === 'ai') return null;
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 30, 
                          mass: 1
                        }}
                        className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start w-full'}`}
                      >
                        {/* Message Bubble - Text Only */}
                        <div className="flex items-start gap-3 max-w-[95%]">
                          {message.role === 'ai' && (
                            <div className={`w-14 h-14 rounded-full ${currentTheme === 'light' ? 'bg-white/90' : 'bg-gray-800/90'} border-2 border-[${themeStyles.iconBg}] flex items-center justify-center flex-shrink-0 mt-1 p-1 overflow-hidden`}>
                              <Logo size="sm" className="drop-shadow-md" />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl shadow-lg ${
                              message.role === 'user' 
                                ? `bg-[${themeStyles.messageUserBg}] ${themeStyles.messageUserText}`
                                : `bg-[${themeStyles.messageAiBg}] ${themeStyles.messageAiText}`
                            } p-4 flex-1`}
                          >
                            {message.isLoading ? (
                              <LoadingMessage />
                            ) : (
                              <div className="whitespace-pre-wrap">
                                {formatMessage(message.content).textContent}
                              </div>
                            )}
                          </div>
                          {message.role === 'user' && (
                            <div className={`w-9 h-9 rounded-full bg-[${themeStyles.iconBg}] flex items-center justify-center flex-shrink-0 mt-1`}>
                              <User className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Action Icons - Below Message */}
                        {message.role === 'user' && (
                          <div className="flex gap-2 mt-1 mr-16">
                            <button
                              onClick={() => handleCopyPrompt(message.content)}
                              className="p-1 hover:bg-gray-700/10 rounded-full transition-colors"
                              title="Copy message"
                            >
                              <Copy className={`w-4 h-4 ${
                                currentTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                              }`} />
                            </button>
                            <button
                              onClick={() => handleSavePrompt(message.content)}
                              className="p-1 hover:bg-gray-700/10 rounded-full transition-colors"
                              title={savedPrompts.has(message.content) ? "Already saved" : "Save prompt"}
                            >
                              {savedPrompts.has(message.content) ? (
                                <BookmarkCheck className={`w-4 h-4 ${
                                  currentTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                                }`} />
                              ) : (
                                <Bookmark className={`w-4 h-4 ${
                                  currentTheme === 'light' ? 'text-gray-600' : 'text-gray-400'
                                }`} />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Dashboard container outside the message bubble - wider and centered */}
                        {message.dashboards && message.dashboards.length > 0 && message.role === 'ai' && (
                          <div className="mt-8 mb-8 w-full flex justify-center">
                            <div className="w-[90%] bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 border border-gray-200 dark:border-gray-700">
                              <div className="relative w-full flex flex-col">
                                {/* Header section with right-aligned dropdown */}
                                <div className="w-full flex justify-between items-center mb-4">
                                  <h3 className="text-base font-medium text-gray-700 dark:text-gray-200">
                                    {message.dashboards[selectedDashboardIndices[message.id] || 0].Name}
                                  </h3>
                                  <div className="relative inline-block w-64">
                                    <select
                                      value={selectedDashboardIndices[message.id] || 0}
                                      onChange={(e) => {
                                        const index = Number(e.target.value);
                                        setSelectedDashboardIndices(prev => ({
                                          ...prev,
                                          [message.id]: index
                                        }));
                                      }}
                                      className={`rounded-full p-1.5 pl-5 pr-10 text-sm appearance-none 
                                      ${currentTheme === 'light' 
                                        ? 'bg-white border-gray-300 text-gray-800' 
                                        : 'bg-gray-800 border-gray-600 text-gray-200'} 
                                      border shadow-sm w-full`}
                                    >
                                      {message.dashboards.map((dashboard, idx) => (
                                        <option key={idx} value={idx}>
                                          {dashboard.Name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none w-4 h-4 text-gray-500" />
                                  </div>
                                </div>

                                {/* Chart section */}
                                <div className="w-full">
                                  <ChartRenderer 
                                    dashboard={message.dashboards[selectedDashboardIndices[message.id] || 0]}
                                    hideDownload={false}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Scenario container outside the message bubble - wider and centered */}
                        {message.scenarios && message.scenarios.length > 0 && message.role === 'ai' && (
                          <div className="mt-8 mb-8 w-full flex justify-center">
                            <div className="w-[90%]">
                              <ScenarioSection scenarios={message.scenarios} theme={currentTheme} />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />

              {/* Show dashboard loading indicator below messages if any message is waiting */}
              {messages.some(msg => msg.isWaitingForDashboard) && (
                <div className="flex justify-center mt-4">
                  <div className={`text-lg font-medium ${currentTheme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    Creating dashboard...
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Input Area with disabled state while loading */}
          <div className="p-4 pb-7 flex justify-center">
            <form 
              onSubmit={handleSendMessage} 
              className={`flex items-center space-x-2 ${
                currentTheme === 'light' 
                  ? 'bg-white' 
                  : 'bg-[#2A2A2A]'
              } rounded-full shadow-lg p-2 max-w-4xl w-full border-none`}
            >
              <textarea
                placeholder="Type your queries here..."
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAIResponding) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={isAIResponding}
                className={`flex-1 border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full bg-transparent resize-none overflow-hidden min-h-[36px] max-h-[150px] py-2 px-4 outline-none ${
                  isAIResponding ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  currentTheme === 'light' 
                    ? 'text-gray-800 placeholder-gray-500' 
                    : 'text-gray-200 placeholder-gray-400'
                }`}
                rows={1}
                style={{ caretColor: currentTheme === 'light' ? 'black' : 'white' }}
              />
              <Button
                type="submit"
                disabled={isAIResponding}
                className={`rounded-full transition-colors duration-200 w-10 h-10 flex items-center justify-center p-0.5 ${
                  isAIResponding 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                } ${
                  currentTheme === 'light'
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
                size="icon"
              >
                <Send className="h-5 w-5 text-white" />
              </Button>
            </form>
          </div>
        </div>

        {/* Dashboard view, NavBar, and SavedPromptsDialog (unchanged) */}
        <AnimatePresence>
          {showDashboardView && (
            <DashboardView
              projectId={projectId || ''}
              availableDashboards={availableDashboards}
              onClose={() => setShowDashboardView(false)}
              layouts={dashboardLayouts}
              onLayoutChange={(newLayouts) => {
                setDashboardLayouts(newLayouts);
                localStorage.setItem('dashboardLayouts', JSON.stringify(newLayouts));
              }}
            />
          )}
        </AnimatePresence>

        <NavBar />

        <SavedPromptsDialog
          isOpen={isSavedPromptsOpen}
          onClose={() => setIsSavedPromptsOpen(false)}
          onSelectPrompt={handleSelectPrompt}
          projectId={Number(projectId)}
          onPromptSelected={(content) => setSavedPrompts(prev => new Set(prev).add(content))}
        />
      </motion.div>
    </AnimatePresence>
  );
}

