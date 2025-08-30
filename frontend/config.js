// Frontend Configuration for Global Deployment
const config = {
  // Development
  development: {
    API_BASE_URL: 'http://localhost:5001',
    FIREBASE_CONFIG: {
      apiKey: "AIzaSyCEUX19EIV2tKsqRZiYPiQ64Wfgb6QLvwo",
      authDomain: "neex-57c2e.firebaseapp.com",
      projectId: "neex-57c2e",
      databaseURL: "https://neex-57c2e-default-rtdb.firebaseio.com/",
      storageBucket: "neex-57c2e.firebasestorage.app",
      messagingSenderId: "996705907990",
      appId: "1:996705907990:web:47602beb05a5fd9d514c37",
      measurementId: "G-90K6GVY92F"
    }
  },
  
  // Production (Railway + Netlify)
  production: {
    API_BASE_URL: 'https://neex-backend.up.railway.app', // Replace with your Railway URL
    FIREBASE_CONFIG: {
      apiKey: "AIzaSyCEUX19EIV2tKsqRZiYPiQ64Wfgb6QLvwo",
      authDomain: "neex-57c2e.firebaseapp.com",
      projectId: "neex-57c2e",
      databaseURL: "https://neex-57c2e-default-rtdb.firebaseio.com/",
      storageBucket: "neex-57c2e.firebasestorage.app",
      messagingSenderId: "996705907990",
      appId: "1:996705907990:web:47602beb05a5fd9d514c37",
      measurementId: "G-90K6GVY92F"
    }
  }
};

// Auto-detect environment
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1' &&
                     !window.location.hostname.includes('192.168');

const currentConfig = isProduction ? config.production : config.development;

// Global configuration object
window.APP_CONFIG = currentConfig;

console.log('🌍 NEEX Config Loaded:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('📡 API Base URL:', currentConfig.API_BASE_URL);
