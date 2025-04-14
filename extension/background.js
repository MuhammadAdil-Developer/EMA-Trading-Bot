console.log("Background script loaded!");

// Store UI injection state
let shouldInjectUI = true;

// This handles messages from popup.js and content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request.action);
  
  if (request.action === "checkShouldInjectUI") {
    console.log("Responding to UI injection check with:", shouldInjectUI);
    // IMPORTANT: Send response immediately
    sendResponse({ shouldInject: shouldInjectUI });
    // Don't return true here as we've already responded
  }
  else if (request.action === "performAutomation") {
    console.log("Performing TradingView automation");
    
    // Respond immediately
    sendResponse({status: "starting automation"});
    
    // Create tab after response
    chrome.tabs.create({
      url: "https://www.tradingview.com/chart/",
      active: true
    }, (tab) => {
      console.log("Tab created:", tab.id);
    });
  }
  else if (request.action === "openTab") {
    console.log("Opening TradingView tab");
    sendResponse({status: "opening tab"});
    
    chrome.tabs.create({
      url: "https://www.tradingview.com/chart/",
      active: true
    });
  }
  
  // No need to return true for any of these since we've already sent responses
  return false;
});

// This handles messages from external web pages
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log("External message received:", request, "from:", sender);
  
  if (request.action === "startAutomation") {
    console.log("Opening TradingView from external message");
    sendResponse({status: "success"});
    
    chrome.tabs.create({
      url: "https://www.tradingview.com/chart/",
      active: true
    });
  }
  return false;
});