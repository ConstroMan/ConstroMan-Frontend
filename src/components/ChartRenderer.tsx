import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Dashboard } from '../types/dashboard';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import jsPDF from 'jspdf';
import LightLogo from '../assets/images/Logo_Full_Light_mode-removebg-preview.png';
import DarkLogo from '../assets/images/Logo_Full_Dark_Mode-removebg-preview.png';

interface ChartRendererProps {
  dashboard: Dashboard;
  hideDownload?: boolean;
  dimensions?: { width: number; height: number };
  onResize?: () => void;
  downloadType?: 'image' | 'excel' | 'pdf';
}

const addWatermark = async (canvas: HTMLCanvasElement, isDarkMode: boolean): Promise<HTMLCanvasElement> => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Load the appropriate logo
  const logoPath = isDarkMode ? DarkLogo : LightLogo;
  
  return new Promise((resolve) => {
    const logo = new Image();
    logo.onload = () => {
      // Calculate logo dimensions (30% of canvas width)
      const logoWidth = canvas.width * 0.3;
      const logoHeight = (logo.height / logo.width) * logoWidth;

      // Calculate center position
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      // Save current context state
      ctx.save();
      
      // Set composite operation to draw on top
      ctx.globalCompositeOperation = 'source-over';
      
      // Set transparency
      ctx.globalAlpha = 0.1;
      
      // Draw logo in center
      ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      
      // Restore context state
      ctx.restore();

      resolve(canvas);
    };
    logo.src = logoPath;
  });
};

const downloadChartAsPNG = async (chartId: string, fileName: string, isDarkMode: boolean) => {
  const chartElement = document.getElementById(chartId);
  if (chartElement) {
    try {
      let canvas = await html2canvas(chartElement);
      canvas = await addWatermark(canvas, isDarkMode);
      
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
    const rowData = dashboard.Row_data || [];
    const worksheet = XLSX.utils.aoa_to_sheet([dashboard.Column_headers || [], ...rowData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Error downloading table:', error);
  }
};

const downloadChartAsPDF = async (chartId: string, fileName: string, isDarkMode: boolean) => {
  const chartElement = document.getElementById(chartId);
  if (chartElement) {
    try {
      let canvas = await html2canvas(chartElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      canvas = await addWatermark(canvas, isDarkMode);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  }
};

const getChartColors = (isDarkMode: boolean) => ({
  primary: [
    isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(54, 162, 235, 0.7)',   // Blue
    isDarkMode ? 'rgba(45, 212, 191, 0.5)' : 'rgba(75, 192, 192, 0.7)',   // Teal
    isDarkMode ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255, 159, 64, 0.7)',   // Orange
    isDarkMode ? 'rgba(139, 92, 246, 0.5)' : 'rgba(153, 102, 255, 0.7)',  // Purple
    isDarkMode ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 99, 132, 0.7)',    // Pink
    isDarkMode ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 206, 86, 0.7)',    // Yellow
    isDarkMode ? 'rgba(34, 197, 94, 0.5)' : 'rgba(46, 204, 113, 0.7)',    // Green
    isDarkMode ? 'rgba(239, 68, 68, 0.5)' : 'rgba(231, 76, 60, 0.7)',     // Red
  ],
  primaryBorder: [
    isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(54, 162, 235)',     // Blue
    isDarkMode ? 'rgb(45, 212, 191)' : 'rgb(75, 192, 192)',     // Teal
    isDarkMode ? 'rgb(249, 115, 22)' : 'rgb(255, 159, 64)',     // Orange
    isDarkMode ? 'rgb(139, 92, 246)' : 'rgb(153, 102, 255)',    // Purple
    isDarkMode ? 'rgb(244, 63, 94)' : 'rgb(255, 99, 132)',      // Pink
    isDarkMode ? 'rgb(234, 179, 8)' : 'rgb(255, 206, 86)',      // Yellow
    isDarkMode ? 'rgb(34, 197, 94)' : 'rgb(46, 204, 113)',      // Green
    isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(231, 76, 60)',       // Red
  ],
  background: isDarkMode ? '#1e1e1e' : '#ffffff',
  text: isDarkMode ? '#e2e8f0' : '#1e293b',
  grid: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  tooltip: {
    background: isDarkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#e2e8f0' : '#1e293b'
  },
  doubleBar: {
    primary: {
      background: isDarkMode ? 'rgba(59, 130, 246, 0.5)' : 'rgba(54, 162, 235, 0.7)',
      border: isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(54, 162, 235)'
    },
    secondary: {
      background: isDarkMode ? 'rgba(45, 212, 191, 0.5)' : 'rgba(75, 192, 192, 0.7)',
      border: isDarkMode ? 'rgb(45, 212, 191)' : 'rgb(75, 192, 192)'
    }
  }
});

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
    easing: 'easeInOutQuad' as const
  },
  resizeDelay: 0,
  elements: {
    line: {
      tension: 0.4
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: '',  // Will be set dynamically
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      ticks: {
        padding: 5,
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    },
    x: {
      title: {
        display: true,
        text: '',  // Will be set dynamically
        font: {
          size: 12,
          weight: 'bold' as const
        }
      },
      ticks: {
        padding: 5,
        autoSkip: false,
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  },
  plugins: {
    legend: {
      position: 'right' as const,
      display: true,
      labels: {
        padding: 20,
        font: {
          size: 11
        },
        usePointStyle: true,
        generateLabels: (chart: any) => {
          const datasets = chart.data.datasets;
          
          // For single dataset charts (like line charts), hide legend if all colors are the same
          if (datasets.length === 1 && 
              !(datasets[0].backgroundColor instanceof Array) && 
              !(datasets[0].borderColor instanceof Array)) {
            return [];
          }

          // For charts with labels property (like pie charts)
          if (chart.data.labels) {
            return chart.data.labels.map((label: string, i: number) => ({
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

          // For multi-dataset charts
          return datasets.map((dataset: any, i: number) => ({
            text: `${dataset.label} (${dataset.data[i]})`,
            fillStyle: dataset.backgroundColor,
            strokeStyle: dataset.borderColor,
            lineWidth: 1,
            hidden: false,
            index: i
          }));
        }
      }
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: {
        size: 12,
        weight: 'bold' as const
      },
      bodyFont: {
        size: 11
      },
      padding: 10,
      callbacks: {
        label: (context: any) => {
          const label = context.dataset.label || '';
          const value = context.raw;
          return `${label}: ${value}`;
        }
      }
    }
  }
};

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
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label
      );
    case 'DualLineChart':
      return Boolean(
        dashboard.X_axis_data &&
        dashboard.Y_axis_data &&
        dashboard.X_axis_label &&
        dashboard.Y_axis_label &&
        // Forecasted data is optional for DualLineChart
        (dashboard.Forecasted_Y_axis_data === null || Array.isArray(dashboard.Forecasted_Y_axis_data))
      );
    default:
      return false;
  }
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  dashboard, 
  hideDownload = false, 
  dimensions,
  onResize,
  downloadType = 'image'
}) => {
  const { currentTheme } = useTheme();
  const { showToast } = useToast();
  const isDarkMode = currentTheme === 'dark';
  const chartId = `chart-${dashboard.Name.replace(/\s+/g, '-')}`;
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const chartColors = useMemo(() => getChartColors(isDarkMode), [isDarkMode]);
  const isValid = useMemo(() => isValidDashboardData(dashboard), [dashboard]);
  
  useEffect(() => {
    if (!isValid) {
      showToast('Invalid chart data', 'error');
    }
  }, [isValid, showToast]);

  const handleChartError = (err: any) => {
    showToast(ERROR_MESSAGES.SERVER_ERROR, 'error');
    console.error('Chart rendering error:', err);
  };

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    setIsResizing(true);
    
    resizeTimeoutRef.current = setTimeout(() => {
      setIsResizing(false);
      if (onResize) onResize();
    }, 150); // Adjust debounce delay as needed
  }, [onResize]);

  useEffect(() => {
    const chartContainer = document.getElementById(chartId);
    if (!chartContainer || !onResize) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainer);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [chartId, onResize, handleResize]);

  const chartOptions = useMemo(() => ({
    ...commonOptions,
    responsive: true,
    maintainAspectRatio: false,
    color: isDarkMode ? '#ffffff' : '#1e293b',
    scales: {
      y: {
        ...commonOptions.scales.y,
        grid: {
          color: chartColors.grid,
          borderColor: chartColors.grid
        },
        ticks: {
          color: isDarkMode ? '#ffffff' : '#1e293b'
        },
        title: {
          ...commonOptions.scales.y.title,
          color: isDarkMode ? '#ffffff' : '#1e293b'
        }
      },
      x: {
        ...commonOptions.scales.x,
        grid: {
          color: chartColors.grid,
          borderColor: chartColors.grid
        },
        ticks: {
          color: isDarkMode ? '#ffffff' : '#1e293b'
        },
        title: {
          ...commonOptions.scales.x.title,
          color: isDarkMode ? '#ffffff' : '#1e293b'
        }
      }
    },
    plugins: {
      ...commonOptions.plugins,
      legend: {
        ...commonOptions.plugins.legend,
        labels: {
          ...commonOptions.plugins.legend.labels,
          color: isDarkMode ? '#ffffff' : '#1e293b',
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        ...commonOptions.plugins.tooltip,
        backgroundColor: chartColors.tooltip.background,
        titleColor: chartColors.tooltip.text,
        bodyColor: chartColors.tooltip.text,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1
      }
    }
  }), [dimensions, isResizing, isDarkMode, chartColors]);

  const handleDownload = async () => {
    switch (downloadType) {
      case 'image':
        if (dashboard.Type === 'Table') {
          await downloadTableAsXLSX(dashboard, dashboard.Name);
        } else {
          await downloadChartAsPNG(chartId, dashboard.Name, isDarkMode);
        }
        break;
      case 'excel':
        await downloadTableAsXLSX(dashboard, dashboard.Name);
        break;
      case 'pdf':
        await downloadChartAsPDF(chartId, dashboard.Name, isDarkMode);
        break;
    }
  };

  if (!isValid) {
    return null;
  }

  return (
    <div className="w-full relative" style={{ height: dimensions ? '100%' : '400px' }}>
      <div 
        id={chartId} 
        className={`p-4 rounded-lg overflow-x-auto relative h-full ${
          isDarkMode ? 'bg-#1A1A1A' : 'bg-white'
        }`}
        style={{
          boxShadow: isDarkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        {!hideDownload && (
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={handleDownload}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-white/80 hover:bg-white text-gray-600 hover:text-teal-600'
              } shadow-sm`}
              title={`Download ${downloadType === 'pdf' ? 'PDF' : downloadType === 'excel' ? 'Excel' : 'Image'}`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
        {(() => {
          const chartContainerStyle = {
            position: 'relative' as const,
            width: '100%',
            height: '100%'
          };

          switch (dashboard.Type) {
            case 'LineChart':
              return (
                <div style={chartContainerStyle}>
                  <Line
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.Y_axis_data,
                        borderColor: isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(13, 148, 136)',
                        backgroundColor: (context) => {
                          const chart = context.chart;
                          const {ctx, chartArea} = chart;
                          if (!chartArea) return isDarkMode ? 'rgba(94, 234, 212, 0.1)' : 'rgba(13, 148, 136, 0.1)';
                          
                          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                          if (isDarkMode) {
                            gradient.addColorStop(0, 'rgba(94, 234, 212, 0.1)');
                            gradient.addColorStop(1, 'rgba(94, 234, 212, 0.4)');
                          } else {
                            gradient.addColorStop(0, 'rgba(13, 148, 136, 0.1)');
                            gradient.addColorStop(1, 'rgba(13, 148, 136, 0.4)');
                          }
                          return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          title: {
                            ...chartOptions.scales.y.title,
                            text: dashboard.Y_axis_label
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          title: {
                            ...chartOptions.scales.x.title,
                            text: dashboard.X_axis_label
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'BarChart':
              return (
                <div style={chartContainerStyle}>
                  <Bar
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.Y_axis_data,
                        backgroundColor: dashboard.X_axis_data.map((_, i) => chartColors.primary[i % chartColors.primary.length]),
                        borderColor: dashboard.X_axis_data.map((_, i) => chartColors.primaryBorder[i % chartColors.primaryBorder.length]),
                        borderWidth: 1,
                        borderRadius: 4,
                        barPercentage: 0.8,
                        categoryPercentage: 0.7
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          ...chartOptions.scales.y,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawOnChartArea: true,
                            display: true
                          },
                          title: {
                            ...chartOptions.scales.y.title,
                            text: dashboard.Y_axis_label
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          grid: {
                            display: false
                          },
                          border: {
                            display: false
                          }
                        }
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'top' as const,
                          align: 'start' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'PieChart':
            case 'DonutChart':
              return (
                <div style={chartContainerStyle}>
                  <Pie
                    data={{
                      labels: dashboard.labels,
                      datasets: [{
                        data: dashboard.Values,
                        backgroundColor: chartColors.primary,
                        borderColor: chartColors.primaryBorder,
                        borderWidth: 1,
                        spacing: 5
                      }]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {},
                      cutout: '70%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'bottom' as const,
                          labels: {
                            color: isDarkMode ? '#ffffff' : '#1e293b',
                            padding: 20,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'Table':
              return (
                <div className={dimensions ? "h-full overflow-auto" : "max-h-[400px] overflow-auto"}>
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={isDarkMode ? 'bg-#1A1A1A' : 'bg-gray-50'}>
                      <tr>
                        {dashboard.Column_headers?.map((header, i) => (
                          <th 
                            key={i} 
                            className={`px-6 py-3 text-left text-xs font-medium ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-500'
                            } uppercase tracking-wider`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? '#1A1A1A' : 'bg-white'} divide-y ${
                      isDarkMode ? 'divide-gray-500' : 'divide-white'
                    }`}>
                      {dashboard.Row_data?.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex} 
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-500'
                              }`}
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
                <div style={chartContainerStyle}>
                  <Bar
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [
                        {
                          label: dashboard.Y_axis_label,
                          data: dashboard.Y_axis_data,
                          backgroundColor: chartColors.doubleBar.primary.background,
                          borderColor: chartColors.doubleBar.primary.border,
                          borderWidth: 1,
                          borderRadius: 4,
                          barPercentage: 0.8,
                          categoryPercentage: 0.7
                        },
                        {
                          label: dashboard.Y_axis_label + ' Secondary',
                          data: dashboard.Y_axis_data_secondary,
                          backgroundColor: chartColors.doubleBar.secondary.background,
                          borderColor: chartColors.doubleBar.secondary.border,
                          borderWidth: 1,
                          borderRadius: 4,
                          barPercentage: 0.8,
                          categoryPercentage: 0.7
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawOnChartArea: true,
                            drawTicks: true,
                            display: true
                          },
                          title: {
                            ...chartOptions.scales.y.title,
                            text: dashboard.Y_axis_label
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          grid: {
                            display: false
                          },
                          title: {
                            ...chartOptions.scales.x.title,
                            text: dashboard.X_axis_label
                          }
                        }
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'top' as const,
                          align: 'start' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            case 'DualLineChart':
              return (
                <div style={chartContainerStyle}>
                  <Line
                    data={{
                      labels: dashboard.X_axis_data.map(String),
                      datasets: [
                        {
                          label: 'Cumulative Probable P2 Budgeted Cost',
                          data: dashboard.Y_axis_data,
                          borderColor: isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(13, 148, 136)',
                          backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return isDarkMode ? 'rgba(94, 234, 212, 0.1)' : 'rgba(13, 148, 136, 0.1)';
                            
                            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            if (isDarkMode) {
                              gradient.addColorStop(0, 'rgba(94, 234, 212, 0.1)');
                              gradient.addColorStop(1, 'rgba(94, 234, 212, 0.4)');
                            } else {
                              gradient.addColorStop(0, 'rgba(13, 148, 136, 0.1)');
                              gradient.addColorStop(1, 'rgba(13, 148, 136, 0.4)');
                            }
                            return gradient;
                          },
                          fill: true,
                          tension: 0.4,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                        },
                        {
                          label: 'Cumulative Actual Cost',
                          data: dashboard.Y_axis_data_secondary,
                          borderColor: isDarkMode ? 'rgb(244, 63, 94)' : 'rgb(225, 29, 72)',
                          backgroundColor: (context) => {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return isDarkMode ? 'rgba(244, 63, 94, 0.1)' : 'rgba(225, 29, 72, 0.1)';
                            
                            const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            if (isDarkMode) {
                              gradient.addColorStop(0, 'rgba(244, 63, 94, 0.1)');
                              gradient.addColorStop(1, 'rgba(244, 63, 94, 0.4)');
                            } else {
                              gradient.addColorStop(0, 'rgba(225, 29, 72, 0.1)');
                              gradient.addColorStop(1, 'rgba(225, 29, 72, 0.4)');
                            }
                            return gradient;
                          },
                          fill: true,
                          tension: 0.4,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'right' as const,
                          align: 'start' as const,
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                              size: 11
                            },
                            color: isDarkMode ? '#ffffff' : '#1e293b',
                            generateLabels: (chart) => {
                              const datasets = chart.data.datasets;
                              return datasets.map((dataset) => ({
                                text: dataset.label || '',
                                fillStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : undefined,
                                strokeStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : undefined,
                                lineWidth: 1,
                                hidden: false
                              }));
                            }
                          }
                        }
                      },
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          title: {
                            ...chartOptions.scales.y.title,
                            text: 'Cost (Lacs)'
                          }
                        },
                        x: {
                          ...chartOptions.scales.x,
                          title: {
                            ...chartOptions.scales.x.title,
                            text: dashboard.X_axis_label
                          }
                        }
                      }
                    }}
                  />
                </div>
              );

            default:
              return <div>Unsupported chart type</div>;
          }
        })()}
      </div>
    </div>
  );
}; 