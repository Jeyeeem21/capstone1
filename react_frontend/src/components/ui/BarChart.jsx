import { useState, useEffect } from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Helper to get CSS variable value
const getCSSVariable = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const BarChart = ({ 
  title, 
  subtitle,
  data, 
  bars = [],
  xAxisKey = 'name',
  height = 300,
  showLegend = true,
  layout = 'vertical' // 'vertical' or 'horizontal'
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
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-gradient-to-br from-primary-50 via-primary-100/30 to-primary-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-xl border-2 border-primary-400 shadow-lg shadow-primary-100/50 outline-none [&_*]:outline-none p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart 
          data={data} 
          layout={layout}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            </>
          ) : (
            <>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
            </>
          )}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          {showLegend && <Legend />}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color || themeColors[index % themeColors.length]}
              radius={[4, 4, 4, 4]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
