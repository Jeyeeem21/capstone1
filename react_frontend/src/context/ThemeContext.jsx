import { createContext, useContext, useState, useEffect, useRef } from 'react';

// API base URL - try both localhost and 127.0.0.1
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Track if API is available (shared across all components)
let apiAvailable = null; // null = unknown, true = available, false = unavailable

// Default theme colors (fallback if API fails)
const defaultTheme = {
  // Mode
  mode: 'light',
  
  // Primary color (used for active sidebar, main actions)
  primary_color: '#22c55e',
  
  // Button colors
  button_primary: '#7f0518',
  button_secondary: '#eab308',
  
  // Border color
  border_color: '#da2b2b',
  
  // Hover color for tables, buttons, interactive elements
  hover_color: '#b22e5c',
  
  // Background colors
  bg_primary: '#ffffff',
  bg_secondary: '#f0fdf4',
  bg_sidebar: '#ffffff',
  bg_body: '#f3f4f6',
  bg_content: '#ffffff',
  bg_footer: '#111827',
  
  // Pagination colors
  pagination_bg: '#7f0518',
  pagination_text: '#ffffff',
  
  // Text colors
  text_primary: '#1f2937',
  text_secondary: '#6b7280',
  text_sidebar: '#374151',
  text_content: '#1f2937',
  
  // Font sizes
  font_size_base: '12',
  font_size_sidebar: '12',
};

// Dark mode default colors - better contrast
const darkModeColors = {
  bg_primary: '#0f172a',
  bg_secondary: '#1e293b',
  text_primary: '#f1f5f9',
  text_secondary: '#cbd5e1',
};

// Generate color palette from a base color
const generateColorPalette = (hex) => {
  const hexToHSL = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };
  
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };
  
  const { h, s } = hexToHSL(hex);
  
  return {
    50: hslToHex(h, Math.min(s, 30), 97),
    100: hslToHex(h, Math.min(s, 40), 94),
    200: hslToHex(h, Math.min(s, 50), 86),
    300: hslToHex(h, Math.min(s, 60), 74),
    400: hslToHex(h, s, 60),
    500: hex,
    600: hslToHex(h, s, 40),
    700: hslToHex(h, s, 32),
    800: hslToHex(h, s, 26),
    900: hslToHex(h, s, 20),
  };
};

const ThemeContext = createContext();

// Get initial theme from localStorage synchronously
const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('kjp-theme');
    if (savedTheme) {
      try {
        return { ...defaultTheme, ...JSON.parse(savedTheme) };
      } catch (e) {
        return defaultTheme;
      }
    }
  }
  return defaultTheme;
};

export const ThemeProvider = ({ children }) => {
  // Initialize with localStorage theme immediately - no flash!
  const [theme, setTheme] = useState(getInitialTheme);
  // If theme was preloaded in index.html, skip loading state entirely
  const [loading, setLoading] = useState(() => !window.__THEME_PRELOADED__);
  const [saving, setSaving] = useState(false);

  // Sync with API in background (no loading state shown)
  useEffect(() => {
    const syncThemeWithAPI = async () => {
      // Skip API call if we already know it's unavailable
      if (apiAvailable === false) {
        setLoading(false);
        return;
      }

      // Try to fetch from API in background (only if online)
      if (navigator.onLine) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // Faster timeout
          
          const response = await fetch(`${API_BASE_URL}/appearance`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          apiAvailable = true;
          const data = await response.json();
          if (data.success && data.data) {
            // Only update if different from current theme
            const newThemeStr = JSON.stringify(data.data);
            const currentThemeStr = localStorage.getItem('kjp-theme');
            if (newThemeStr !== currentThemeStr) {
              setTheme(data.data);
              localStorage.setItem('kjp-theme', newThemeStr);
            }
          }
        } catch (error) {
          // Mark API as unavailable to skip future attempts
          apiAvailable = false;
        }
      }
      
      setLoading(false);
    };
    syncThemeWithAPI();
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme.mode === 'dark';
    
    // Generate palettes
    // IMPORTANT: Use border_color for the primary palette since all borders use border-primary-* classes
    const borderColor = theme.border_color || theme.borderColor || defaultTheme.border_color;
    const buttonPrimary = theme.button_primary || theme.buttonPrimary || defaultTheme.button_primary;
    
    const primaryPalette = generateColorPalette(borderColor);
    const buttonPrimaryPalette = generateColorPalette(buttonPrimary);
    
    // Set primary colors (used by border-primary-* classes throughout the app)
    Object.entries(primaryPalette).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color);
      // Also set border variables for consistency
      root.style.setProperty(`--color-border-${shade}`, color);
    });
    
    // Set button colors
    Object.entries(buttonPrimaryPalette).forEach(([shade, color]) => {
      root.style.setProperty(`--color-button-${shade}`, color);
    });
    
    // Set individual colors
    root.style.setProperty('--color-button-secondary', theme.button_secondary || theme.buttonSecondary || defaultTheme.button_secondary);
    
    // Handle dark mode colors
    if (isDark) {
      root.style.setProperty('--color-bg-primary', darkModeColors.bg_primary);
      root.style.setProperty('--color-bg-secondary', darkModeColors.bg_secondary);
      root.style.setProperty('--color-bg-sidebar', '#1e293b');
      root.style.setProperty('--color-bg-body', '#0f172a');
      root.style.setProperty('--color-bg-content', '#1e293b');
      root.style.setProperty('--color-bg-footer', '#0f172a');
      root.style.setProperty('--color-text-primary', darkModeColors.text_primary);
      root.style.setProperty('--color-text-secondary', darkModeColors.text_secondary);
      root.style.setProperty('--color-text-sidebar', '#e2e8f0');
      root.style.setProperty('--color-text-content', '#f1f5f9');
      document.documentElement.classList.add('dark');
    } else {
      root.style.setProperty('--color-bg-primary', theme.bg_primary || theme.bgPrimary || defaultTheme.bg_primary);
      root.style.setProperty('--color-bg-secondary', theme.bg_secondary || theme.bgSecondary || defaultTheme.bg_secondary);
      root.style.setProperty('--color-bg-sidebar', theme.bg_sidebar || theme.bgSidebar || defaultTheme.bg_sidebar);
      root.style.setProperty('--color-bg-body', theme.bg_body || theme.bgBody || defaultTheme.bg_body);
      root.style.setProperty('--color-bg-content', theme.bg_content || theme.bgContent || defaultTheme.bg_content);
      root.style.setProperty('--color-bg-footer', theme.bg_footer || theme.bgFooter || defaultTheme.bg_footer);
      root.style.setProperty('--color-text-primary', theme.text_primary || theme.textPrimary || defaultTheme.text_primary);
      root.style.setProperty('--color-text-secondary', theme.text_secondary || theme.textSecondary || defaultTheme.text_secondary);
      root.style.setProperty('--color-text-sidebar', theme.text_sidebar || theme.textSidebar || defaultTheme.text_sidebar);
      root.style.setProperty('--color-text-content', theme.text_content || theme.textContent || defaultTheme.text_content);
      document.documentElement.classList.remove('dark');
    }
    
    root.style.setProperty('--color-pagination-bg', theme.pagination_bg || theme.paginationBg || defaultTheme.pagination_bg);
    root.style.setProperty('--color-pagination-text', theme.pagination_text || theme.paginationText || defaultTheme.pagination_text);
    
    // Set hover color for tables and interactive elements
    const hoverColor = theme.hover_color || theme.hoverColor || defaultTheme.hover_color;
    root.style.setProperty('--color-hover', hoverColor);
    root.style.setProperty('--color-hover-light', hoverColor + '80'); // 50% opacity version
    
    // Set font sizes
    const baseFontSize = theme.font_size_base || theme.fontSizeBase || defaultTheme.font_size_base;
    const sidebarFontSize = theme.font_size_sidebar || theme.fontSizeSidebar || defaultTheme.font_size_sidebar;
    root.style.setProperty('--font-size-base', `${baseFontSize}px`);
    root.style.setProperty('--font-size-sidebar', `${sidebarFontSize}px`);
    root.style.setProperty('--font-size-sm', `${Math.max(12, parseInt(baseFontSize) - 2)}px`);
    root.style.setProperty('--font-size-xs', `${Math.max(10, parseInt(baseFontSize) - 4)}px`);
    root.style.setProperty('--font-size-lg', `${parseInt(baseFontSize) + 2}px`);
    root.style.setProperty('--font-size-xl', `${parseInt(baseFontSize) + 4}px`);
    root.style.setProperty('--font-size-2xl', `${parseInt(baseFontSize) + 8}px`);
    root.style.setProperty('--font-size-3xl', `${parseInt(baseFontSize) + 14}px`);
    
    // Apply font size directly to html element for rem-based sizing
    root.style.fontSize = `${baseFontSize}px`;
    
    // Apply text colors directly to document body
    const textContent = isDark ? '#f1f5f9' : (theme.text_content || theme.textContent || defaultTheme.text_content);
    document.body.style.color = textContent;
    
    // Save to localStorage immediately when mode changes
    localStorage.setItem('kjp-theme', JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  // Save theme to API
  const saveTheme = async () => {
    setSaving(true);
    
    // Always save to localStorage first
    localStorage.setItem('kjp-theme', JSON.stringify(theme));
    
    // Skip API if unavailable or offline
    if (apiAvailable === false || !navigator.onLine) {
      setSaving(false);
      return { success: true, message: 'Theme saved locally' };
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const settings = Object.entries(theme).map(([key, value]) => ({ key, value: String(value) }));
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/appearance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ settings }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      apiAvailable = true;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        return { success: true, message: 'Theme saved successfully' };
      }
      return { success: false, message: data.message || 'Failed to save theme' };
    } catch (error) {
      apiAvailable = false;
      return { success: true, message: 'Theme saved locally' };
    } finally {
      setSaving(false);
    }
  };

  // Reset theme to defaults from API
  const resetTheme = async () => {
    setSaving(true);
    
    // Skip API if unavailable or offline - just reset locally
    if (apiAvailable === false || !navigator.onLine) {
      setTheme(defaultTheme);
      localStorage.setItem('kjp-theme', JSON.stringify(defaultTheme));
      setSaving(false);
      return { success: true, message: 'Theme reset to defaults' };
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/appearance/reset`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      apiAvailable = true;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setTheme(data.data);
        localStorage.setItem('kjp-theme', JSON.stringify(data.data));
        return { success: true, message: 'Theme reset to defaults' };
      }
      return { success: false, message: 'Failed to reset theme' };
    } catch (error) {
      // Fallback to local defaults
      apiAvailable = false;
      setTheme(defaultTheme);
      localStorage.setItem('kjp-theme', JSON.stringify(defaultTheme));
      return { success: true, message: 'Theme reset to defaults' };
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, saveTheme, resetTheme, defaultTheme, loading, saving }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
