import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    mode === 'development' &&
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large libraries
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-router': ['react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['pdfjs-dist', 'react-pdf'],
          // Admin pages in separate chunk
          'admin': [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/admin/UserManagement.tsx',
            './src/pages/admin/Analytics.tsx',
            './src/pages/admin/Settings.tsx',
            './src/pages/admin/MedicalData.tsx',
            './src/pages/admin/SystemHealth.tsx',
            './src/pages/admin/AuditLogs.tsx',
            './src/pages/admin/ContentManagement.tsx',
            './src/pages/admin/CustomPrompts.tsx',
            './src/pages/admin/AIChatMonitoring.tsx',
            './src/pages/admin/SosMonitoring.tsx'
          ]
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: mode === 'development'
  },
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    exclude: ['@capacitor/core', '@capacitor/camera', '@capacitor/geolocation']
  }
}));
