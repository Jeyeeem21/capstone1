import { useState, useEffect } from 'react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// Helper to get CSS variable value
const getCSSVariable = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const LineChart = ({ 
  title, 
  subtitle,
  data, 
  lines = [],
  xAxisKey = 'name',
  height = 300,
  showLegend = true,
  tabs = null,
  activeTab = null,
  onTabChange = null,
  summaryStats = null,
  areaChart = false
}) => {
  // Get theme colors from CSS variables
  const [themeColors, setThemeColors] = useState(['#84cc16', '#eab308', '#22c55e', '#3b82f6', '#f97316']);
  
  useEffect(() => {
    const updateColors = () => {
      const primary500 = getCSSVariable('--color-primary-500') || '#84cc16';
      const primary400 = getCSSVariable('--color-primary-400') || '#a3e635';
      const primary600 = getCSSVariable('--color-primary-600') || '#65a30d';
      const button500 = getCSSVariable('--color-button-500') || '#22c55e';
      const button400 = getCSSVariable('--color-button-400') || '#4ade80';
      setThemeColors([primary500, button500, primary400, primary600, button400]);
    };
    
    updateColors();
    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => observer.disconnect();
  }, []);

  const ChartComponent = areaChart ? AreaChart : RechartsLineChart;

  return (
    <div className="bg-gradient-to-br from-primary-50 via-primary-100/30 to-primary-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-xl border-2 border-primary-400 shadow-lg shadow-primary-100/50 outline-none [&_*]:outline-none p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        
        {/* Tabs */}
        {tabs && (
          <div className="flex bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm border border-primary-200">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onTabChange?.(tab.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab.value
                    ? 'bg-button-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-button-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && lines.length > 0 && (
        <div className="flex items-center justify-center gap-6 mb-4">
          {lines.map((line, index) => (
            <div key={line.dataKey} className="flex items-center gap-2">
              <div 
                className="w-8 h-3 rounded"
                style={{ backgroundColor: line.color || themeColors[index % themeColors.length] }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">{line.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => `${value} kg`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          {lines.map((line, index) => (
            areaChart ? (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color || themeColors[index % themeColors.length]}
                fill={line.color || themeColors[index % themeColors.length]}
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray={line.dashed ? '5 5' : undefined}
              />
            ) : (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color || themeColors[index % themeColors.length]}
                strokeWidth={2}
                strokeDasharray={line.dashed ? '5 5' : undefined}
                dot={{ fill: line.color || themeColors[index % themeColors.length], strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            )
          ))}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-primary-200">
          {summaryStats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color || 'text-primary-600'}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LineChart;
