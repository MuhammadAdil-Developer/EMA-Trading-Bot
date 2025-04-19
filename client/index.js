// index.js - Main Application Controller

// ==============================================
// Global Variables & DOM References
// ==============================================
let currentSymbol = "TSLA";
let currentTimeframe = "1h";
let pineScriptGenerator = null;
let socket = null;
let klineChart = null;

// DOM Elements
const elements = {
  symbolSelector: document.getElementById("symbol-selector"),
  timeframeSelector: document.getElementById("timeframe-selector"),
  currentSymbolDisplay: document.getElementById("current-symbol"),
  currentTimeframeDisplay: document.getElementById("current-timeframe"),
  modalSymbolDisplay: document.getElementById("modal-symbol"),
  modalTimeframeDisplay: document.getElementById("modal-timeframe"),
  riskPerTradeInput: document.getElementById("risk-per-trade"),
  riskPerTradeValue: document.getElementById("risk-per-trade-value"),
  circuitBreakerCheckbox: document.getElementById("circuit-breaker-checkbox"),
  consecutiveLossesInput: document.getElementById("consecutive-losses"),
  gapProtectionCheckbox: document.getElementById("gap-protection-checkbox"),
  gapThresholdInput: document.getElementById("gap-threshold"),
  doubleOrdersCheckbox: document.getElementById("double-orders-checkbox"),
  shortTermTargetInput: document.getElementById("short-term-target"),
  trailingStopInput: document.getElementById("trailing-stop"),
  pineScriptCode: document.getElementById("pine-script-code"),
  generatePineScriptBtn: document.getElementById("generate-pine-script-btn")
};

// ==============================================
// Main Initialization
// ==============================================
document.addEventListener("DOMContentLoaded", () => {
  try {
    initializePineScriptGenerator();
    initializeSocketConnection();
    initializeChart();
    initializeUIEventListeners();  // <-- Yahan pe naya code add hoga
    initializeRiskManagement();
    loadSettings();
    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Application initialization failed:", error);
    showErrorNotification("Failed to initialize application");
  }
});


function showLoader(message = "Loading data...") {
  const loader = document.getElementById('loader');
  const loaderText = document.getElementById('loader-text');
  if (loader && loaderText) {
    loaderText.textContent = message;
    loader.classList.add('active');
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.remove('active');
  }
}


// ==============================================
// Core Functions
// ==============================================

/**
 * Initialize WebSocket connection
 */
// In index.js, update the socket initialization:

function initializeSocketConnection() {
  // Close existing socket if any
  if (socket) {
    socket.close();
  }
  
  // Show loader when connecting
  showLoader("Connecting to data server...");
  
  socket = io("http://178.156.155.13:4000");
  
  socket.on("connect", () => {
    console.log("Connected to WebSocket server");
    showNotification("Connected to data server", "success");
    
    // Change loader message when requesting data
    showLoader(`Loading ${currentSymbol} data...`);
    
    // Request current symbol data after connection
    socket.emit("symbol-change", currentSymbol, (response) => {
      console.log("Initial data request acknowledged:", response);
    });
  });
  
  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
    showErrorNotification("Disconnected from data server");
    hideLoader();
  });
  
  socket.on("kline", (data) => {
    if (!klineChart) {
      console.error("Chart not initialized");
      return;
    }
    
    if (Array.isArray(data)) {
      console.log(`Received ${data.length} historical klines`);
      klineChart.loadHistoricalData(data);
      showSuccessNotification(`Loaded ${currentSymbol} data successfully`);
      hideLoader(); // Hide loader when data is loaded
    } else {
      // For single updates
      klineChart.updateKline(data);
    }
  });
  
  // Add error handling
  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    showErrorNotification("Failed to connect to data server");
    hideLoader();
  });
}



/**
 * Initialize TradingView chart
 */
function initializeChart() {
  klineChart = new KlineChart("tvchart");
}

/**
 * Initialize Pine Script Generator
 */
function initializePineScriptGenerator() {
  pineScriptGenerator = new PineScriptGenerator(currentSymbol, currentTimeframe);
  updateDisplayElements();
}


// ==============================================
// UI Management
// ==============================================

/**
 * Set up all UI event listeners
 */
function initializeUIEventListeners() {
  // Only add listeners if elements exist
  if (elements.symbolSelector) {
    elements.symbolSelector.addEventListener("change", handleSymbolChange);
  }
  
  if (elements.timeframeSelector) {
    elements.timeframeSelector.addEventListener("change", handleTimeframeChange);
  }

  // Risk management controls - check each one
  const riskControls = [
    'riskPerTradeInput', 'circuitBreakerCheckbox', 'consecutiveLossesInput',
    'gapProtectionCheckbox', 'gapThresholdInput', 'doubleOrdersCheckbox',
    'shortTermTargetInput', 'trailingStopInput'
  ];

  riskControls.forEach(control => {
    if (elements[control]) {
      elements[control].addEventListener("input", handleRiskSettingChange);
      elements[control].addEventListener("change", handleRiskSettingChange);
    }
  });

  // Pine Script generation
  if (elements.generatePineScriptBtn) {
    elements.generatePineScriptBtn.addEventListener("click", handleGeneratePineScript);
  }

  // Modal close handlers
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('pine-script-modal').style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    const modal = document.getElementById('pine-script-modal');
    if (event.target === modal && modal) {
      modal.style.display = 'none';
    }
  });


    // NEW CODE: Copy to Clipboard Button
    document.getElementById('copy-script-btn')?.addEventListener('click', () => {
      const codeElement = document.getElementById('pine-script-code');
      navigator.clipboard.writeText(codeElement.textContent)
        .then(() => showSuccessNotification('Pine Script copied to clipboard!'))
        .catch(() => showErrorNotification('Failed to copy!'));
    });
    
}




function startTradingViewAutomation() {
  console.log("Starting TradingView Automation...");
  
  // Generate the Pine Script
  const generatedScript = pineScriptGenerator.generateScript();
  
  // Send both the start command and the script to content script
  window.postMessage({ 
    type: "FROM_PAGE", 
    action: "startAutomation",
    pineScript: generatedScript
  }, "*");
  
  // Notify user
  showSuccessNotification("TradingView automation started!");
}

document.addEventListener('DOMContentLoaded', () => {
  const autoTradingBtn = document.getElementById('auto-trading-toggle');
  let isAutoTradingActive = false;

  autoTradingBtn.addEventListener('click', () => {
    isAutoTradingActive = !isAutoTradingActive;
    
    // Toggle active class
    autoTradingBtn.classList.toggle('active');
    
    // Add pulse animation when active
    if (isAutoTradingActive) {
      autoTradingBtn.classList.add('pulse');
      showNotification('Auto Trading Activated', 'success');
      
      // Connect to trading API or start strategy
      startAutoTrading();
      
      // NEW: Start TradingView automation
      startTradingViewAutomation();
    } else {
      autoTradingBtn.classList.remove('pulse');
      showNotification('Auto Trading Deactivated', 'warning');
      
      // Disconnect from trading API or stop strategy
      stopAutoTrading();
    }
  });
  
  // Listen for responses from the extension's content script
  window.addEventListener("message", (event) => {
    // Make sure message is from our window (content script will use window.postMessage)
    if (event.source !== window) return;
    
    if (event.data && event.data.type === "FROM_EXTENSION") {
      console.log("Received message from extension:", event.data);
      
      if (event.data.status === "success") {
        showSuccessNotification(event.data.message || "TradingView automation running");
      } else if (event.data.status === "error") {
        showErrorNotification(event.data.message || "Error in TradingView automation");
      }
    }
  });
});

function startAutoTrading() {
  console.log('Auto trading started');
  // Add your auto trading logic here
}

function stopAutoTrading() {
  console.log('Auto trading stopped');
  // Add your auto trading stop logic here
}


/**
 * Handle symbol change event
 */
function handleSymbolChange(event) {
  const newSymbol = event.target.value;
  const oldSymbol = currentSymbol;
  currentSymbol = newSymbol;
  
  // Clear chart data immediately
  if (klineChart) {
    klineChart.clearData();
  }
  
  // Show loading loader and notification
  const isStock = !(newSymbol.endsWith('USDT') || newSymbol.endsWith('BUSD') || newSymbol.endsWith('BTC'));
  const loadingMessage = isStock 
    ? `Loading ${newSymbol} stock data... This may take a few moments.`
    : `Loading ${newSymbol} data...`;
  
  showLoader(loadingMessage);
  
  // Show symbol change notification  
  showNotification(`Switching from ${oldSymbol} to ${newSymbol}`, "info");
  
  updateDisplayElements();
  
  // Request new data from server
  if (socket) {
    socket.emit("symbol-change", newSymbol, (response) => {
      console.log("Symbol change acknowledged:", response);
    });
  }
}





/**
 * Handle timeframe change event
 */
function handleTimeframeChange() {
  currentTimeframe = this.value;
  updateDisplayElements();
  
  // Show loading notification first
  showNotification(`Loading ${currentTimeframe} timeframe...`, "info");
  
  if (socket && socket.connected) {
    // Reset the chart first to indicate loading
    if (klineChart) {
      klineChart.clearData();
    }
    
    // Make sure pineScriptGenerator is updated
    pineScriptGenerator.setTimeframe(currentTimeframe);
    
    // Emit timeframe-change event and add a callback to confirm receipt
    socket.emit("timeframe-change", currentTimeframe, (response) => {
      console.log("Server acknowledged timeframe change:", response);
    });
    
    // Save settings after server confirms
    saveSettings();
  } else {
    console.error("Socket not connected, cannot change timeframe");
    showErrorNotification("Connection error. Please refresh the page.");
  }
}


/**
 * Handle risk setting changes
 */
function handleRiskSettingChange() {
  if (pineScriptGenerator && pineScriptGenerator.updateRiskSettings) {
    updateRiskSettingsFromUI();
    saveSettings();
  }
}

/**
 * Handle Pine Script generation
 */
function handleGeneratePineScript() {
  try {
    const generatedScript = pineScriptGenerator.generateScript();
    elements.pineScriptCode.textContent = generatedScript;
    
    // Show the modal
    const modal = document.getElementById('pine-script-modal');
    modal.style.display = "block";
    
    showSuccessNotification("Pine Script generated successfully");
  } catch (error) {
    console.error("Error generating Pine Script:", error);
    showErrorNotification("Failed to generate Pine Script");
  }
}



// ==============================================
// Settings Persistence
// ==============================================

/**
 * Save current settings to localStorage
 */
function saveSettings() {
  if (!pineScriptGenerator) return;

  const settings = {
    version: 2,
    timestamp: new Date().toISOString(),
    symbol: currentSymbol,
    timeframe: currentTimeframe,
    riskSettings: getCurrentRiskSettings(),
    uiSettings: pineScriptGenerator.uiSettings, // Add this line
    indicators: pineScriptGenerator.indicators,
    signalDisplay: pineScriptGenerator.signalDisplay
  };

  try {
    localStorage.setItem("tradingSettings", JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

/**
 * Load settings from localStorage
 */
// Update the loadSettings function to handle TSLA as default
function loadSettings() {
  try {
    const savedData = localStorage.getItem("tradingSettings");
    if (!savedData) {
      // No saved settings, ensure TSLA is set as default
      currentSymbol = "TSLA";
      return;
    }

    const settings = JSON.parse(savedData);
    if (!settings) {
      currentSymbol = "TSLA";
      return;
    }

    // Validate loaded settings
    if (settings.version !== 2) {
      console.warn("Settings version mismatch, performing migration");
      return migrateSettings(settings);
    }

    // Apply loaded settings
    applyLoadedSettings(settings);
    console.debug("Settings loaded:", settings);
    
  } catch (error) {
    console.error("Failed to load settings:", error);
    currentSymbol = "TSLA"; // Fallback to TSLA on error
  }
}

/**
 * Apply loaded settings to the application
 */
function applyLoadedSettings(settings) {
  // Symbol and Timeframe
  if (settings.symbol) {
    currentSymbol = settings.symbol;
    elements.symbolSelector.value = currentSymbol;
  } else {
    // No symbol in settings, use TSLA
    currentSymbol = "TSLA";
    elements.symbolSelector.value = "TSLA";
  }

  if (settings.timeframe) {
    currentTimeframe = settings.timeframe;
    elements.timeframeSelector.value = currentTimeframe;
  }

  // Initialize generator if not done yet
  if (!pineScriptGenerator) {
    pineScriptGenerator = new PineScriptGenerator(currentSymbol, currentTimeframe);
  }


  // Risk Settings
  if (settings.riskSettings) {
    updateRiskSettingsFromObject(settings.riskSettings);
  }

  // Indicators
  if (settings.indicators) {
    updateIndicatorSettings(settings.indicators);
  }

  // Signal Display
  if (settings.signalDisplay) {
    pineScriptGenerator.signalDisplay = settings.signalDisplay;
  }
  
  if (settings.uiSettings) {
    pineScriptGenerator.updateUISettings(settings.uiSettings);
    // Update checkboxes
    document.getElementById('include-circuit-breaker').checked = settings.uiSettings.includeCircuitBreaker;
    document.getElementById('include-gap-protection').checked = settings.uiSettings.includeGapProtection;
  }

  // Update UI to reflect loaded settings
  updateDisplayElements();
}

// ==============================================
// Helper Functions
// ==============================================

/**
 * Update all display elements with current values
 */
function updateDisplayElements() {
  // Update display elements
  if (elements.currentSymbolDisplay) {
    elements.currentSymbolDisplay.textContent = currentSymbol;
  }
  
  if (elements.currentTimeframeDisplay) {
    elements.currentTimeframeDisplay.textContent = currentTimeframe;
  }
  
  if (elements.modalSymbolDisplay) {
    elements.modalSymbolDisplay.textContent = currentSymbol;
  }
  
  if (elements.modalTimeframeDisplay) {
    elements.modalTimeframeDisplay.textContent = currentTimeframe;
  }
}


/**
 * Get current risk settings from UI
 */
function getCurrentRiskSettings() {
  return {
    riskPerTrade: parseFloat(elements.riskPerTradeInput.value),
    enableCircuitBreaker: elements.circuitBreakerCheckbox.checked,
    maxConsecutiveLosses: parseInt(elements.consecutiveLossesInput.value),
    enableGapProtection: elements.gapProtectionCheckbox.checked,
    gapThresholdPercent: parseFloat(elements.gapThresholdInput.value),
    enableDoubleOrderStrategy: elements.doubleOrdersCheckbox.checked,
    shortTermTarget: parseFloat(elements.shortTermTargetInput.value),
    trailingStopPct: parseFloat(elements.trailingStopInput.value)
  };
}

/**
 * Update risk settings from UI to generator
 */
function updateRiskSettingsFromUI() {
  if (pineScriptGenerator) {
    pineScriptGenerator.updateRiskSettings(getCurrentRiskSettings());
  }
}

/**
 * Update risk settings from saved object
 */
function updateRiskSettingsFromObject(riskSettings) {
  if (!pineScriptGenerator || !riskSettings) return;

  // Update generator
  pineScriptGenerator.updateRiskSettings(riskSettings);

  // Update UI elements
  elements.riskPerTradeInput.value = riskSettings.riskPerTrade || 2;
  elements.riskPerTradeValue.textContent = `${riskSettings.riskPerTrade || 2}%`;
  elements.circuitBreakerCheckbox.checked = !!riskSettings.enableCircuitBreaker;
  elements.consecutiveLossesInput.value = riskSettings.maxConsecutiveLosses || 3;
  elements.gapProtectionCheckbox.checked = !!riskSettings.enableGapProtection;
  elements.gapThresholdInput.value = riskSettings.gapThresholdPercent || 2;
  elements.doubleOrdersCheckbox.checked = !!riskSettings.enableDoubleOrderStrategy;
  elements.shortTermTargetInput.value = riskSettings.shortTermTarget || 1.5;
  elements.trailingStopInput.value = riskSettings.trailingStopPct || 0.5;
}

/**
 * Update indicator settings from saved object
 */
function updateIndicatorSettings(indicators) {
  if (!pineScriptGenerator || !indicators) return;

  // Update generator
  pineScriptGenerator.indicators = indicators;

  // Update checkboxes
  const indicatorCheckboxes = {
    'ema8': 'ema8-checkbox',
    'ema20': 'ema20-checkbox',
    'ema50': 'ema50-checkbox',
    'ema200': 'ema200-checkbox',
    'tema5': 'tema5-checkbox',
    'volume': 'volume-checkbox'
  };

  Object.entries(indicatorCheckboxes).forEach(([key, id]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = !!indicators[key];
    }
  });
}

// ==============================================
// Notification Functions
// ==============================================

function showSuccessNotification(message) {
  console.log("Success:", message);
  // Add actual UI notification implementation here
}

function showErrorNotification(message) {
  console.error("Error:", message);
  // Add actual UI notification implementation here
}

// ==============================================
// Legacy Settings Migration
// ==============================================

function migrateSettings(oldSettings) {
  console.warn("Migrating settings from version", oldSettings.version);
  
  // Example migration from v1 to v2
  const newSettings = {
    version: 2,
    symbol: oldSettings.symbol || "BTCUSDT",
    timeframe: oldSettings.timeframe || "1h",
    riskSettings: oldSettings.riskSettings || {},
    indicators: oldSettings.indicators || {},
    signalDisplay: oldSettings.signalDisplay || {
      showLongEntries: true,
      showShortEntries: true,
      showLongExits: true,
      showShortExits: true,
      showReversal: true,
      showRiskSignals: true,
      signalType: "All"
    }
  };
  
  // Save migrated settings
  try {
    localStorage.setItem("tradingSettings", JSON.stringify(newSettings));
    applyLoadedSettings(newSettings);
    return true;
  } catch (error) {
    console.error("Migration failed:", error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const autoTradingBtn = document.getElementById('auto-trading-toggle');
  let isAutoTradingActive = false;

  autoTradingBtn.addEventListener('click', () => {
    isAutoTradingActive = !isAutoTradingActive;
    
    // Toggle active class
    autoTradingBtn.classList.toggle('active');
    
    // Add pulse animation when active
    if (isAutoTradingActive) {
      autoTradingBtn.classList.add('pulse');
      showNotification('Auto Trading Activated', 'success');
      
      // Connect to trading API or start strategy
      startAutoTrading();
    } else {
      autoTradingBtn.classList.remove('pulse');
      showNotification('Auto Trading Deactivated', 'warning');
      
      // Disconnect from trading API or stop strategy
      stopAutoTrading();
    }
  });
});

function startAutoTrading() {
  console.log('Auto trading started');
  // Add your auto trading logic here
}

function stopAutoTrading() {
  console.log('Auto trading stopped');
  // Add your auto trading stop logic here
}

function showNotification(message, type = "info") {
  // Create notification element if it doesn't exist
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${getIconForType(type)}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  
  // Auto-remove after delay
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

function showSuccessNotification(message) {
  showNotification(message, "success");
}

function showErrorNotification(message) {
  showNotification(message, "error");
}

function getIconForType(type) {
  switch (type) {
    case "success": return "fa-check-circle";
    case "error": return "fa-exclamation-circle";
    case "warning": return "fa-exclamation-triangle";
    case "info": 
    default: return "fa-info-circle";
  }
}

// ==============================================
// Export for Testing (if needed)
// ==============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeSocketConnection,
    initializeChart,
    initializePineScriptGenerator,
    saveSettings,
    loadSettings,
    handleSymbolChange,
    handleTimeframeChange,
    migrateSettings
  };
}``