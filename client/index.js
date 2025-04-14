// index.js - Main Application Controller

// ==============================================
// Global Variables & DOM References
// ==============================================
let currentSymbol = "BTCUSDT";
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


// ==============================================
// Core Functions
// ==============================================

/**
 * Initialize WebSocket connection
 */
function initializeSocketConnection() {
  socket = io("http://localhost:4000");
  
  socket.on("connect", () => {
    console.log("Connected to WebSocket server");
  });
  
  socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server");
  });
  
  socket.on("kline", (data) => {
    if (Array.isArray(data)) {
      klineChart.loadHistoricalData(data);
    } else {
      klineChart.updateKline(data);
    }
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


  // document.getElementById('export-to-tradingview-btn')?.addEventListener('click', async () => {
  //   try {
  //     // Show loading indicator
  //     showSuccessNotification('Preparing TradingView export...');
      
  //     // Generate the Pine Script
  //     const pineScript = pineScriptGenerator.generateScript();
      
  //     // Copy to clipboard for backup/manual entry
  //     await navigator.clipboard.writeText(pineScript);
      
  //     // Open TradingView in a new tab
  //     const tradingViewTab = window.open('https://www.tradingview.com/chart/', '_blank');
      
  //     // Create the automation script that will run in the new tab
  //     const automationScript = `
  //       // This script will run after TradingView loads
  //       (function() {
  //         // Function to wait for an element to appear
  //         function waitForElement(selector, timeout = 30000) {
  //           return new Promise((resolve, reject) => {
  //             const startTime = Date.now();
              
  //             const checkInterval = setInterval(() => {
  //               const element = document.querySelector(selector);
  //               if (element) {
  //                 clearInterval(checkInterval);
  //                 resolve(element);
  //               } else if (Date.now() - startTime > timeout) {
  //                 clearInterval(checkInterval);
  //                 reject(new Error('Element not found: ' + selector));
  //               }
  //             }, 500);
  //           });
  //         }
          
  //         // Main automation function
  //         async function automate() {
  //           try {
  //             console.log("TradingView automation starting...");
              
  //             // Wait for the page to load properly
  //             await new Promise(r => setTimeout(r, 5000));
              
  //             // Find and click the Pine Editor button
  //             const pineEditorSelectors = [
  //               'button[data-tooltip="Open Pine Editor"]',
  //               'button[data-name="scripteditor"]',
  //               'button:has-text("Pine Editor")'
  //             ];
              
  //             let pineEditorButton = null;
  //             for (const selector of pineEditorSelectors) {
  //               try {
  //                 pineEditorButton = await waitForElement(selector);
  //                 if (pineEditorButton) {
  //                   console.log("Found Pine Editor button");
  //                   break;
  //                 }
  //               } catch (e) {
  //                 // Try next selector
  //               }
  //             }
              
  //             if (pineEditorButton) {
  //               console.log("Clicking Pine Editor button");
  //               pineEditorButton.click();
                
  //               // Wait for editor to appear
  //               await new Promise(r => setTimeout(r, 2000));
                
  //               // Look for the code editor (Monaco or ACE)
  //               const editorSelectors = [
  //                 '.monaco-editor .view-lines',
  //                 '.ace_editor',
  //                 '.view-lines'
  //               ];
                
  //               let editorFound = false;
  //               for (const selector of editorSelectors) {
  //                 try {
  //                   const editor = await waitForElement(selector, 5000);
  //                   if (editor) {
  //                     console.log("Found code editor");
  //                     editorFound = true;
                      
  //                     // Focus on the editor and prepare to paste
  //                     editor.click();
                      
  //                     // Select all existing text (Ctrl+A)
  //                     document.execCommand('selectAll');
  //                     // Delete it
  //                     document.execCommand('delete');
                      
  //                     // Get text from clipboard and paste it
  //                     const pineScript = \`${pineScript.replace(/`/g, '\\`')}\`;
                      
  //                     // Use clipboard API to paste the text
  //                     const textArea = document.createElement('textarea');
  //                     textArea.style.position = 'fixed';
  //                     textArea.style.opacity = '0';
  //                     textArea.value = pineScript;
  //                     document.body.appendChild(textArea);
  //                     textArea.select();
  //                     document.execCommand('copy');
                      
  //                     // Focus back on the editor and paste
  //                     editor.click();
  //                     document.execCommand('paste');
                      
  //                     document.body.removeChild(textArea);
  //                     console.log("Pasted Pine Script successfully");
  //                     break;
  //                   }
  //                 } catch (e) {
  //                   console.error("Error with editor selector:", e);
  //                   // Try next selector
  //                 }
  //               }
                
  //               if (!editorFound) {
  //                 console.error("Could not find code editor");
  //               }
  //             } else {
  //               console.error("Could not find Pine Editor button");
  //             }
  //           } catch (error) {
  //             console.error("Automation error:", error);
  //           }
  //         }
          
  //         // Start automation after page has loaded
  //         if (document.readyState === 'complete') {
  //           automate();
  //         } else {
  //           window.addEventListener('load', automate);
  //         }
  //       })();
  //     `;
      
  //     // Wait for the new tab to load
  //     setTimeout(() => {
  //       try {
  //         // Try to inject the automation script
  //         // Note: This may not work due to browser security restrictions
  //         if (tradingViewTab && !tradingViewTab.closed) {
  //           tradingViewTab.eval(automationScript);
  //         }
  //       } catch (injectionError) {
  //         console.error('Script injection error:', injectionError);
  //         showNotification('Please paste the Pine Script manually into TradingView', 'warning');
  //       }
  //     }, 3000);
      
  //     showSuccessNotification('Pine Script copied to clipboard! TradingView opened in new tab.');
      
  //   } catch (error) {
  //     console.error('Export error:', error);
  //     showErrorNotification('Failed to export to TradingView');
      
  //     // Fall back to direct link
  //     const pineScript = pineScriptGenerator.generateScript();
  //     navigator.clipboard.writeText(pineScript);
  //     window.open('https://www.tradingview.com/chart/', '_blank');
  //   }
  // });
      
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
function handleSymbolChange() {
  currentSymbol = this.value;
  updateDisplayElements();
  pineScriptGenerator.setSymbol(currentSymbol);
  saveSettings();
  
  // Notify server of symbol change
  if (socket && socket.connected) {
    socket.emit("symbol-change", currentSymbol);
  }
}

/**
 * Handle timeframe change event
 */
function handleTimeframeChange() {
  currentTimeframe = this.value;
  updateDisplayElements();
  pineScriptGenerator.setTimeframe(currentTimeframe);
  saveSettings();
  
  // Notify server of timeframe change
  if (socket && socket.connected) {
    socket.emit("timeframe-change", currentTimeframe);
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
function loadSettings() {
  try {
    const savedData = localStorage.getItem("tradingSettings");
    if (!savedData) return;

    const settings = JSON.parse(savedData);
    if (!settings) return;

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
  elements.currentSymbolDisplay.textContent = currentSymbol;
  elements.currentTimeframeDisplay.textContent = currentTimeframe;
  elements.modalSymbolDisplay.textContent = currentSymbol;
  elements.modalTimeframeDisplay.textContent = currentTimeframe;
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

function showNotification(message, type = 'success') {
  // Reuse your existing notification function or create a simple one
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => document.body.removeChild(notification), 500);
  }, 3000);
}


// NEW CODE: Notification Functions (agar nahi hai to add karein)
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#26a69a';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => document.body.removeChild(notification), 3000);
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#ef5350';
  notification.style.color = 'white';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => document.body.removeChild(notification), 3000);
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