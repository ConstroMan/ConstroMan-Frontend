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
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS, registerables } from 'chart.js';

// Register the required Chart.js components and the datalabels plugin
ChartJS.register(...registerables, ChartDataLabels);

interface ChartRendererProps {
  dashboard: Dashboard;
  hideDownload?: boolean;
  dimensions?: { width: number; height: number };
  onResize?: () => void;
  downloadType?: 'image' | 'excel' | 'pdf';
}


const downloadChartAsPNG = async (chartId: string, fileName: string, isDarkMode: boolean) => {
  const chartElement = document.getElementById(chartId);
  if (chartElement) {
    try {
      let canvas = await html2canvas(chartElement);
      
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
    },
    layout: {
      padding: {
        top: 30
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
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        datalabels: {
                          color: isDarkMode ? '#ffffff' : '#1e293b',
                          anchor: 'end' as const,
                          align: 'top' as const,
                          font: {
                            weight: 'bold' as const,
                            size: 11
                          },
                          formatter: (value) => {
                            if (typeof value === 'number') {
                              return value.toLocaleString(undefined, { 
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              });
                            }
                            return value;
                          },
                          padding: 6
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
                          position: 'bottom' as const,
                          align: 'center' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: {
                              size: 11
                            }
                          }
                        },
                        datalabels: {
                          color: isDarkMode ? '#ffffff' : '#1e293b',
                          anchor: 'end' as const,
                          align: 'top' as const,
                          offset: 4,
                          font: {
                            weight: 'bold' as const,
                            size: 11
                          },
                          formatter: (value) => {
                            if (typeof value === 'number') {
                              return value.toLocaleString(undefined, { 
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              });
                            }
                            return value;
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
                        },
                        datalabels: {
                          color: '#ffffff',
                          anchor: 'center' as const,
                          align: 'center' as const,
                          font: {
                            weight: 'bold' as const,
                            size: 12
                          },
                          formatter: (value, context) => {
                            if (typeof value === 'number') {
                              return value.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              });
                            }
                            return value;
                          },
                          offset: 0,
                          borderWidth: 2,
                          borderRadius: 4,
                          borderColor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.75)'
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
                          label: dashboard.Y_axis_label_secondary,
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
                          position: 'bottom' as const,
                          align: 'center' as const,
                          labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                          }
                        },
                        datalabels: {
                          color: isDarkMode ? '#ffffff' : '#1e293b',
                          anchor: (context) => {
                            return context.datasetIndex === 0 ? 'end' : 'end';
                          },
                          align: (context) => {
                            // For the first dataset (primary values)
                            if (context.datasetIndex === 0) {
                              return 'top';
                            }
                            // For the second dataset (secondary values)
                            return 'top';
                          },
                          offset: (context) => {
                            // Offset primary values above the bar
                            if (context.datasetIndex === 0) {
                              return 6;
                            }
                            // Offset secondary values above the bar with more space
                            return 6;
                          },
                          rotation: (context) => {
                            // Rotate first dataset labels slightly
                            if (context.datasetIndex === 0) {
                              return 0;
                            }
                            return 0;
                          },
                          font: {
                            weight: 'bold' as const,
                            size: 10
                          },
                          formatter: (value) => {
                            if (typeof value === 'number') {
                              // Format large numbers using Indian system (crores and lakhs)
                              if (value >= 10000000) {
                                return (value / 10000000).toFixed(1) + 'Cr';
                              } else if (value >= 100000) {
                                return (value / 100000).toFixed(1) + 'L';
                              } else if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                              }
                              return value.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                              });
                            }
                            return value;
                          },
                          backgroundColor: (context) => {
                            // Add background color to help readability
                            return context.datasetIndex === 0 ? 
                              'rgba(255, 255, 255, 0.7)' : 
                              'rgba(255, 255, 255, 0.7)';
                          },
                          borderRadius: 3,
                          padding: { top: 2, bottom: 2, left: 4, right: 4 },
                          // Show all labels
                          display: true
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
                        },
                        {
                          label: dashboard.Y_axis_label_secondary,
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
                        },
                        datalabels: {
                          color: (context) => {
                            const datasetIndex = context.datasetIndex;
                            // First dataset - blue/teal, Second dataset - red/pink
                            return datasetIndex === 0 
                              ? (isDarkMode ? 'rgb(94, 234, 212)' : 'rgb(13, 148, 136)')
                              : (isDarkMode ? 'rgb(244, 63, 94)' : 'rgb(225, 29, 72)');
                          },
                          anchor: 'end' as const,
                          align: 'top' as const,
                          offset: 0,
                          font: {
                            weight: 'bold' as const,
                            size: 11
                          },
                          formatter: (value) => {
                            if (typeof value === 'number') {
                              return value.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 1
                              });
                            }
                            return value;
                          },
                          padding: 6,
                          // Show labels on every other point to avoid overcrowding
                          display: (context) => {
                            return context.dataIndex % 2 === 0;
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

            case 'ScatterPlot':
              return (
                <div style={chartContainerStyle}>
                  <Scatter
                    data={{
                      datasets: [{
                        label: dashboard.Y_axis_label,
                        data: dashboard.X_axis_data.map((x, i) => ({
                          x: x,
                          y: dashboard.Y_axis_data[i]
                        })),
                        backgroundColor: chartColors.primary[0],
                        borderColor: chartColors.primaryBorder[0],
                        borderWidth: 1,
                        pointRadius: 6,
                        pointHoverRadius: 8,
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
                      },
                      plugins: {
                        ...chartOptions.plugins,
                        datalabels: {
                          color: isDarkMode ? '#ffffff' : '#1e293b',
                          anchor: 'end' as const,
                          align: 'top' as const,
                          offset: 5,
                          font: {
                            weight: 'bold' as const,
                            size: 10
                          },
                          formatter: (value) => {
                            if (value && typeof value.y === 'number') {
                              return `(${value.x}, ${value.y.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })})`;
                            }
                            return '';
                          },
                          padding: 4
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