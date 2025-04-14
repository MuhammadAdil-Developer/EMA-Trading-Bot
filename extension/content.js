// Enhanced content.js with simplified UI and persistent timer
console.log("Enhanced TradingView Automation Script loaded!");

// Global variables for tracking state across page refreshes
let countdownStartTime = 0;
let countdownDuration = 30; // Initial countdown of 30 seconds
let isRedirectedTab = false;

// Your Pine Script to insert
const newPineScript = `//@version=5
indicator("My Script", overlay=true)
plot(close, color=color.red)
plot(close, color=color.red)`;

// Check if this is a redirected tab from layout creation
function checkIfRedirectedTab() {
  // Try to get state from sessionStorage
  try {
    const savedState = sessionStorage.getItem('tvAutomationState');
    if (savedState) {
      const state = JSON.parse(savedState);
      countdownStartTime = state.startTime || 0;
      countdownDuration = state.duration || 30;
      isRedirectedTab = state.isRedirected || false;
      
      console.log("Loaded saved state:", state);
      return isRedirectedTab;
    }
  } catch (err) {
    console.error("Error reading session storage:", err);
  }
  
  return false;
}

// Save current state to sessionStorage
function saveState() {
  try {
    const state = {
      startTime: countdownStartTime,
      duration: countdownDuration,
      isRedirected: isRedirectedTab
    };
    sessionStorage.setItem('tvAutomationState', JSON.stringify(state));
    console.log("Saved state:", state);
  } catch (err) {
    console.error("Error saving to session storage:", err);
  }
}

// Create simplified UI with just two buttons
function createControls() {
  // Check if UI already exists
  if (document.querySelector('.tv-script-replacer')) {
    console.log("UI already exists, not creating again");
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'tv-script-replacer';
  container.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">TradingView Automation</div>
    <div class="countdown" id="countdown">Initializing...</div>
    <button id="tv-create-layout">1. Create New Layout</button>
    <button id="tv-auto-pine-script">2. Auto Pine Script</button>
    <div class="tv-script-replacer-status" id="tv-script-replacer-status">Ready...</div>
  `;
  
  document.body.appendChild(container);
  
  // Set up event listeners
  document.getElementById('tv-create-layout').addEventListener('click', createNewLayout);
  document.getElementById('tv-auto-pine-script').addEventListener('click', () => {
    autoPineScriptProcess(pineScript);
  });
  
  // Initialize countdown
  const isRedirected = checkIfRedirectedTab();
  
  if (isRedirected) {
    updateStatus("Detected redirected tab - continuing automation...");
    // Continue countdown from saved state
    continueCountdown();
  } else {
    // Start fresh countdown
    startCountdown(countdownDuration);
  }
  
  updateStatus("UI controls created successfully");
}

// Countdown timer with ability to continue from previous state
function startCountdown(seconds) {
  countdownDuration = seconds;
  countdownStartTime = Date.now();
  saveState();
  
  updateCountdownDisplay(seconds);
  scheduleNextCountdownTick();
}

function continueCountdown() {
  if (countdownStartTime > 0) {
    const elapsedTime = Math.floor((Date.now() - countdownStartTime) / 1000);
    const remainingSeconds = Math.max(0, countdownDuration - elapsedTime);
    
    updateCountdownDisplay(remainingSeconds);
    
    if (remainingSeconds > 0) {
      scheduleNextCountdownTick();
    } else {
      // Countdown already finished, trigger the next step
      const countdownElement = document.getElementById('countdown');
      if (countdownElement) {
        countdownElement.textContent = "Auto process starting now!";
        countdownElement.style.color = "#4caf50";
      }
      
      // Since we're in a redirected tab, trigger the Pine Script process
      setTimeout(() => {
        autoPineScriptProcess();
      }, 2000);
    }
  } else {
    // No valid start time, restart countdown
    startCountdown(30);
  }
}

function scheduleNextCountdownTick() {
  setTimeout(updateCountdown, 1000);
}

function updateCountdown() {
  const elapsedTime = Math.floor((Date.now() - countdownStartTime) / 1000);
  const remainingSeconds = Math.max(0, countdownDuration - elapsedTime);
  
  updateCountdownDisplay(remainingSeconds);
  
  if (remainingSeconds <= 0) {
    // Countdown finished
    const countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.textContent = "Auto process starting now!";
      countdownElement.style.color = "#4caf50";
    }
    
    // Determine next step based on whether this is a redirected tab
    if (isRedirectedTab) {
      // If this is a redirected tab, trigger Pine Script process
      setTimeout(() => {
        autoPineScriptProcess();
      }, 2000);
    } else {
      // If this is the initial tab, trigger layout creation
      setTimeout(() => {
        createNewLayout();
      }, 2000);
    }
  } else {
    // Continue countdown
    scheduleNextCountdownTick();
  }
}

function updateCountdownDisplay(seconds) {
  const countdownElement = document.getElementById('countdown');
  if (!countdownElement) return;
  
  if (isRedirectedTab) {
    countdownElement.textContent = `Continuing: ${seconds}s until Pine Script process`;
  } else {
    countdownElement.textContent = `Waiting for chart: ${seconds}s until auto start`;
  }
}

// Function to add natural, human-like delays
function naturalDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Create new layout with human-like delays and prevent new tab
async function createNewLayout() {
  updateStatus("Creating new layout...");
  
  // Simulate human-like delay before starting
  await naturalDelay(800, 1500);
  
  // 1. Click the "Manage layouts" button
  const manageLayoutsSelectors = [
    'button[data-name="save-load-menu"]',
    'button[data-tooltip="Manage layouts"]',
    '.isOpened-merBkM5y'
  ];
  
  let manageBtnFound = false;
  for (const selector of manageLayoutsSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      // Highlight the button visually for a brief moment before clicking
      button.style.boxShadow = "0 0 8px 2px rgba(41, 98, 255, 0.8)";
      await naturalDelay(400, 800);
      
      button.click();
      button.style.boxShadow = "";
      manageBtnFound = true;
      updateStatus("Clicked Manage layouts button");
      
      // Human-like pause before next action
      await naturalDelay(1200, 2000);
      
      // Look for the "Create new layout" button
      const newLayoutButton = findCreateNewLayoutButton();
      if (newLayoutButton) {
        // Highlight before clicking
        newLayoutButton.style.backgroundColor = "rgba(41, 98, 255, 0.2)";
        await naturalDelay(600, 1000);
        
        newLayoutButton.click();
        newLayoutButton.style.backgroundColor = "";
        updateStatus("Clicked Create new layout button");
        
        // Human-like pause before interacting with dialog
        await naturalDelay(1500, 2500);
      
        // Find the input field
        const inputSelectors = [
          'input[placeholder="My layout"]',
          '.input-RUSovanF',
          'input[maxlength="64"]'
        ];
        
        let inputFound = false;
        for (const selector of inputSelectors) {
          const input = document.querySelector(selector);
          if (input) {
            // Set the layout name
            input.focus();
            input.value = '';
            
            // Simulate typing character by character with natural delays
            const layoutName = "Auto Layout";
            for (let i = 0; i < layoutName.length; i++) {
              await naturalDelay(100, 250);
              input.value += layoutName[i];
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            inputFound = true;
            updateStatus(`Entered layout name: Auto Layout`);
            
            // Human-like pause before clicking save
            await naturalDelay(1000, 1800);
            
            // CRITICAL: Uncheck "Open in a new tab" checkbox if it exists
            // Use standard selectors that don't require jQuery-style :contains()
            const checkboxSelectors = [
              'input[type="checkbox"][name="openInNewTab"]',
              '.checkbox-JKUc0AsS',
              '[data-name="open-in-new-tab-checkbox"]'
            ];
            
            // Try to find the checkbox
            let checkbox = null;
            
            // First approach: try standard selectors
            for (const cbSelector of checkboxSelectors) {
              const foundCheckbox = document.querySelector(cbSelector);
              if (foundCheckbox) {
                checkbox = foundCheckbox;
                break;
              }
            }
            
            // Second approach: search by iterating through labels
            if (!checkbox) {
              const allLabels = document.querySelectorAll('label, span, div');
              for (const element of allLabels) {
                if (element.textContent && element.textContent.includes("Open in a new tab")) {
                  // Found the text, now look for a checkbox inside or nearby
                  checkbox = element.querySelector('input[type="checkbox"]');
                  
                  // If not found as a child, look at siblings or parent's children
                  if (!checkbox) {
                    const parent = element.parentElement;
                    if (parent) {
                      checkbox = parent.querySelector('input[type="checkbox"]');
                    }
                  }
                  
                  // If still not found, just use the element itself as a click target
                  if (!checkbox) {
                    checkbox = element;
                  }
                  
                  break;
                }
              }
            }
            
            // Third approach: Look for any checkbox in the dialog
            if (!checkbox) {
              // Find the dialog first
              const dialog = document.querySelector('.dialog-NfVP3Lqy, .dialog-UM6w7sFp, [role="dialog"]');
              if (dialog) {
                checkbox = dialog.querySelector('input[type="checkbox"]');
              }
            }
            
            if (checkbox) {
              // Try to determine if checkbox is checked
              const isChecked = (checkbox.type === 'checkbox' && checkbox.checked) || 
                              checkbox.getAttribute('aria-checked') === 'true' ||
                              checkbox.classList.contains('checked');
              
              if (isChecked || typeof isChecked === 'undefined') {
                // Highlight before clicking
                checkbox.style.boxShadow = "0 0 5px 2px rgba(255, 0, 0, 0.5)";
                await naturalDelay(500, 800);
                
                // Click the checkbox
                checkbox.click();
                checkbox.style.boxShadow = "";
                updateStatus("Clicked to uncheck 'Open in a new tab' option");
                await naturalDelay(500, 800);
              } else {
                updateStatus("'Open in a new tab' option already unchecked");
              }
            } else {
              updateStatus("⚠️ Could not find 'Open in a new tab' checkbox - continuing anyway");
            }
            
            // Find and click the Save button
            const saveButtonSelectors = [
              'button[name="save"]',
              'button.actionButton-k53vexPa',
              '.actionButton-k53vexPa'
            ];
            
            // Add selector that finds buttons with "Save" text
            let saveButton = null;
            
            // Try standard selectors first
            for (const selector of saveButtonSelectors) {
              const button = document.querySelector(selector);
              if (button) {
                saveButton = button;
                break;
              }
            }
            
            // If not found, try looking for buttons with "Save" text
            if (!saveButton) {
              const buttons = document.querySelectorAll('button');
              for (const button of buttons) {
                if (button.textContent && button.textContent.includes("Save")) {
                  saveButton = button;
                  break;
                }
              }
            }
            
            if (saveButton) {
              // Highlight before clicking
              saveButton.style.boxShadow = "0 0 8px 2px rgba(76, 175, 80, 0.8)";
              await naturalDelay(700, 1200);
              
              saveButton.click();
              saveButton.style.boxShadow = "";
              updateStatus("Clicked Save button - Layout created!");
              
              // Setup state for possible redirect
              isRedirectedTab = true;
              saveState();
              
              // Human-like pause before continuing with next step
              await naturalDelay(2000, 3000);
              
              // Continue with the next steps in the process
              autoPineScriptProcess();
            } else {
              updateStatus("⚠️ Save button not found - please click it manually");
              // Still try to continue after a longer delay
              await naturalDelay(5000, 7000);
              autoPineScriptProcess();
            }
            
            break;
          }
        }
        
        if (!inputFound) {
          updateStatus("⚠️ Layout name input field not found");
          // Try to continue anyway
          await naturalDelay(4000, 6000);
          autoPineScriptProcess();
        }
      } else {
        updateStatus("⚠️ Create new layout button not found");
        // Try to continue anyway
        await naturalDelay(4000, 6000);
        autoPineScriptProcess();
      }
      
      break;
    }
  }
  
  if (!manageBtnFound) {
    updateStatus("⚠️ Manage layouts button not found");
    // Try to continue anyway
    await naturalDelay(4000, 6000);
    autoPineScriptProcess();
  }
}

// Helper function to find the "Create new layout" button
function findCreateNewLayoutButton() {
  // First try looking for elements with the exact text
  const menuItems = document.querySelectorAll('div[role="row"], div[role="menuitem"]');
  
  for (const item of menuItems) {
    // Check if this element contains "Create new layout" but NOT "Make a copy"
    if (item.textContent && 
        item.textContent.includes("Create new layout") && 
        !item.textContent.includes("Make a copy") &&
        !item.hasAttribute("data-name")) {
      return item;
    }
  }
  
  // Fallback to the specific SVG path approach
  const svgPaths = document.querySelectorAll('svg path[d*="M13.9 14.1V22h1.2v-7.9H23v-1.2h-7.9V5h-1.2v7.9H6v1.2h7.9z"]');
  if (svgPaths.length > 0) {
    return svgPaths[0].closest('div[role="row"]') || svgPaths[0].closest('div[role="menuitem"]');
  }
  
  return null;
}

// Automated Pine Script process - combines opening editor, copying, selecting, deleting, and pasting
async function autoPineScriptProcess() {
  updateStatus("Starting Pine Script automation...");
  await naturalDelay(1000, 2000);
  
  // Step 1: Open the editor
  const editorButtons = [
    "button[data-name='scripteditor']",
    "button[data-name='pine-script']",
    "button[data-role='pine-editor']",
    "button.tv-chart-toolbar__item--pine-script",
    ".pine-launcher-button",
    "[data-tooltip='Pine Script Editor']"
  ];
  
  let editorFound = false;
  for (const selector of editorButtons) {
    const button = document.querySelector(selector);
    if (button) {
      // Highlight before clicking
      button.style.boxShadow = "0 0 8px 2px rgba(41, 98, 255, 0.8)";
      await naturalDelay(600, 1000);
      
      button.click();
      button.style.boxShadow = "";
      editorFound = true;
      updateStatus("Editor opened!");
      
      // Human-like pause before continuing
      await naturalDelay(2000, 3000);
      break;
    }
  }
  
  if (!editorFound) {
    updateStatus("⚠️ Editor button not found");
    return;
  }
  
  // Step 2: Copy script to clipboard
  try {
    await navigator.clipboard.writeText(scriptToInsert);
    updateStatus("✅ Script copied to clipboard");
  } catch (e) {
    updateStatus("⚠️ Clipboard API not available");
    console.error("Clipboard error:", e);
    
    // Show popup with the provided script
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 600px;
      background: #2a2e39;
      border: 2px solid #4c525e;
      border-radius: 4px;
      padding: 20px;
      color: white;
      z-index: 10000;
    `;
    
    popup.innerHTML = `
      <h3>Copy this script:</h3>
      <textarea style="width: 100%; height: 200px; background: #1e222d; color: white; border: 1px solid #4c525e; padding: 10px;">${scriptToInsert}</textarea>
      <div style="text-align: right; margin-top: 10px;">
        <button id="close-popup" style="background: #2962ff; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    const textarea = popup.querySelector('textarea');
    textarea.focus();
    textarea.select();
    
    document.getElementById('close-popup').addEventListener('click', () => {
      document.body.removeChild(popup);
    });
  }

  
  await naturalDelay(1500, 2500);
  
  // Step 3: Find the editor and select all text
  const editorSelectors = [
    '.pine-editor-monaco textarea.inputarea',
    '.monaco-editor textarea',
    '.tv-script-editor textarea',
    '[role="code"] textarea'
  ];
  
  let editor = null;
  for (const selector of editorSelectors) {
    const editorElement = document.querySelector(selector);
    if (editorElement) {
      editor = editorElement;
      break;
    }
  }
  
  if (editor) {
    // Highlight before clicking
    editor.style.boxShadow = "0 0 5px 1px rgba(41, 98, 255, 0.5)";
    await naturalDelay(600, 1000);
    
    editor.click();
    editor.style.boxShadow = "";
    editor.focus();
    
    // Select all text (Ctrl+A)
    await naturalDelay(800, 1200);
    try {
      const selectAllEvents = [
        new KeyboardEvent('keydown', {key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true}),
        new KeyboardEvent('keypress', {key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true}),
        new KeyboardEvent('keyup', {key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true})
      ];
      
      for (const event of selectAllEvents) {
        await naturalDelay(50, 150);
        editor.dispatchEvent(event);
        document.dispatchEvent(event);
      }
      
      updateStatus("✅ Selected all text");
    } catch (e) {
      console.error("Selection event failed:", e);
    }
    
    // Delete selected text
    await naturalDelay(1000, 1500);
    try {
      const deleteEvent = new KeyboardEvent('keydown', {
        key: 'Delete',
        code: 'Delete',
        bubbles: true
      });
      editor.dispatchEvent(deleteEvent);
      document.dispatchEvent(deleteEvent);
      
      updateStatus("✅ Deleted existing text");
    } catch (e) {
      console.error("Delete event failed:", e);
    }
    
    // Paste new script
    await naturalDelay(1000, 1500);
    try {
      // Create a clipboard event with our data
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', newPineScript);
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      editor.dispatchEvent(pasteEvent);
      updateStatus("✅ Paste event sent! Check if script updated.");
      
      // Find and click Add to Chart button
      await naturalDelay(2000, 3000);
      
      // Look for the Add to Chart button
      let addToChartButton = null;
      
      // Method 1: Try specific selectors
      const addToChartSelectors = [
        'button[name="apply"]',
        'button[data-name="apply-button"]',
        'button.actionButton-k53vexPa',
        '.tv-dialog__button--primary'
      ];
      
      for (const selector of addToChartSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          addToChartButton = button;
          break;
        }
      }
      
      // Method 2: Look for buttons with "Add to Chart" text
      if (!addToChartButton) {
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent && 
             (button.textContent.includes("Add to Chart") || 
              button.textContent.includes("Apply") || 
              button.textContent.includes("Save"))) {
            addToChartButton = button;
            break;
          }
        }
      }
      
      if (addToChartButton) {
        // Highlight before clicking
        addToChartButton.style.boxShadow = "0 0 8px 2px rgba(76, 175, 80, 0.8)";
        await naturalDelay(700, 1200);
        
        addToChartButton.click();
        addToChartButton.style.boxShadow = "";
        updateStatus("✅ Added script to chart!");
      } else {
        updateStatus("⚠️ Add to Chart button not found - please click it manually");
        
        // Show a notification for manual intervention
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 10px;
          font-size: 20px;
          z-index: 10000;
          transition: opacity 0.5s ease-in-out;
        `;
        notification.textContent = 'Please click the "Add to Chart" button manually';
        document.body.appendChild(notification);
        
        // Fade out notification after 5 seconds
        setTimeout(() => {
          notification.style.opacity = "0";
        }, 5000);
        
        // Remove notification after fade out
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 6000);
      }
    } catch (e) {
      console.error("Paste event failed:", e);
      
      // Show manual paste notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 20px;
        z-index: 10000;
        transition: opacity 0.5s ease-in-out;
      `;
      notification.textContent = 'If script did not paste, press Ctrl+V now';
      document.body.appendChild(notification);
      
      // Fade out notification after 4 seconds
      setTimeout(() => {
        notification.style.opacity = "0";
      }, 4000);
      
      // Remove notification after fade out
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 5000);
    }
  } else {
    updateStatus("⚠️ Editor element not found");
  }
}

// Utility function for status updates
function updateStatus(message) {
  const statusElement = document.getElementById('tv-script-replacer-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  console.log("Status: " + message);
}

function directInjectUI(pineScript = '') {
  console.log("Directly injecting UI without checking...");
  setTimeout(() => {
    try {
      createControls(pineScript);
      console.log("UI injected successfully");
    } catch (err) {
      console.error("Error in createControls:", err);
    }
  }, 2000);
}

// Check if we should inject UI - simplified version
function checkIfShouldInjectUI() {
  // Only inject on TradingView chart pages
  if (!window.location.href.includes("tradingview.com/chart")) {
    console.log("Not a TradingView chart page, skipping UI injection");
    return;
  }
  
  console.log("On TradingView chart page, injecting UI directly");
  directInjectUI();
}

// Add styles for UI
const styles = `
  .tv-script-replacer {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #2a2e39;
    border: 1px solid #4c525e;
    border-radius: 4px;
    padding: 10px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    transition: background 0.3s ease;
  }
  .tv-script-replacer:hover {
    background: #323741;
  }
  .tv-script-replacer button {
    display: block;
    width: 100%;
    background: #2962ff;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 3px;
    cursor: pointer;
    margin-right: 5px;
    margin-bottom: 10px;
    transition: all 0.2s ease;
    font-weight: bold;
  }
  .tv-script-replacer button:hover {
    background: #1e56e5;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  .tv-script-replacer button:active {
    transform: translateY(1px);
    box-shadow: none;
  }
  .tv-script-replacer-status {
    margin-top: 5px;
    font-size: 12px;
    transition: color 0.3s ease;
  }
  .countdown {
    font-weight: bold;
    color: #ffcc00;
    transition: color 0.3s ease;
    margin-bottom: 10px;
  }
`;

// Add styles to page
try {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  (document.head || document.documentElement).appendChild(styleElement);
} catch (e) {
  console.error("Failed to add styles:", e);
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  if (request.action === "injectUI") {
    console.log("Received command to inject UI");
    sendResponse({status: "UI injection started"});
    
    // Inject UI if on TradingView
    if (window.location.href.includes("tradingview.com")) {
      setTimeout(() => {
        try {
          createControls();
          console.log("UI created successfully");
          
          // Auto-start if requested
          if (request.autoStart) {
            console.log("Auto-starting the process...");
            // The countdown will handle auto-starting
            countdownDuration = 30; // 30 seconds initial countdown
            startCountdown(countdownDuration);
          }
        } catch (err) {
          console.error("Error creating controls:", err);
        }
      }, 2000);
    } else {
      console.log("Not on TradingView, skipping UI injection");
    }
  }
  
  return false;
});

window.addEventListener("message", (event) => {
  // Only accept messages from our own window
  if (event.source !== window) return;
  
  console.log("Content script received window message:", event.data);
  
  if (event.data.type === "FROM_PAGE" && event.data.action === "startAutomation") {
    console.log("Starting TradingView automation...");
    
    // Store the received Pine Script
    const pineScript = event.data.pineScript || '';
    
    // Forward to background script if needed
    chrome.runtime.sendMessage({ 
      action: "performAutomation",
      source: "dashboard_trigger",
      pineScript: pineScript
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error forwarding to background:", chrome.runtime.lastError);
        return;
      }
      console.log("Background response:", response);
    });
    
    // Directly inject UI if on TradingView
    if (window.location.href.includes("tradingview.com")) {
      directInjectUI();
      
      // Start the process with the received script
      setTimeout(() => {
        autoPineScriptProcess(pineScript);
      }, 3000);
    }
  }
});

// Run the check when content script loads
console.log("Content script initializing...");
setTimeout(checkIfShouldInjectUI, 3000); // Wait 3 seconds before checking