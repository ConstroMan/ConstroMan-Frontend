import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';

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

type Scenario = {
  id: string;
  description: string;
  probability: number;
  impact: 'High' | 'Medium' | 'Low';
  insights: string[];
  dashboards: Dashboard[];
}

interface ScenarioSectionProps {
  scenarios: Scenario[];
  theme: string;
}

export const ScenarioSection: React.FC<ScenarioSectionProps> = ({ scenarios, theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!scenarios.length) return null;

  return (
    <div className="mt-6 w-full">
      <div className={`rounded-xl shadow-lg ${
        theme === 'light' ? 'bg-[#F0F4F8]' : 'bg-[#1A1A1A]'
      } p-4 border-2 ${
        theme === 'light' ? 'border-[#8DCE84]' : 'border-[#375A43]'
      }`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-2 hover:bg-opacity-10 transition-colors rounded-lg p-2"
        >
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              theme === 'light' ? 'bg-[#8DCE84]' : 'bg-[#375A43]'
            }`}>
              <svg 
                className={`w-4 h-4 ${
                  theme === 'light' ? 'text-white' : 'text-[#8DCE84]'
                }`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 className={`text-lg font-semibold ${
              theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'
            }`}>
              Possible Scenarios
            </h3>
          </div>
          <ChevronDown
            className={`w-5 h-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            } ${theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'}`}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="space-y-6">
                {scenarios.map((scenario, index) => (
                  <div key={scenario.id} className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${
                          theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'
                        }`}>
                          {scenario.description}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                            theme === 'light' ? 'bg-[#8DCE84]/10' : 'bg-[#375A43]/10'
                          }`}>
                            <svg 
                              className={`w-4 h-4 ${
                                theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'
                              }`} 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <span className={`text-sm ${
                              theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'
                            }`}>
                              {(scenario.probability * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            scenario.impact === 'High' 
                              ? 'bg-[#CE261E]/20 text-[#CE261E]' 
                              : scenario.impact === 'Medium'
                                ? 'bg-[#BCB44D]/20 text-[#BCB44D]'
                                : 'bg-[#8DCE84]/20 text-[#8DCE84]'
                          }`}>
                            {scenario.impact} Impact
                          </span>
                        </div>
                      </div>
                      
                      <div className="pl-4 space-y-1">
                        {scenario.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full mt-2 ${
                              theme === 'light' ? 'bg-[#8DCE84]' : 'bg-[#375A43]'
                            }`} />
                            <p className={`text-sm ${
                              theme === 'light' ? 'text-[#375A43]' : 'text-[#8DCE84]'
                            }`}>
                              {insight}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {scenario.dashboards?.map((dashboard, i) => (
                      <div key={i} className="mt-4">
                        <ChartRenderer
                          dashboard={dashboard}
                          hideDownload={false}
                        />
                      </div>
                    ))}
                    
                    {index < scenarios.length - 1 && (
                      <div className={`border-b ${
                        theme === 'light' ? 'border-[#8DCE84]/30' : 'border-[#375A43]/30'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 