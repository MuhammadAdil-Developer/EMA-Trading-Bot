document.getElementById('openBtn').addEventListener('click', () => {
    console.log("Button clicked, sending message to background");
    
    // Send message and keep the popup open until we get a response
    chrome.runtime.sendMessage({ action: "performAutomation" }, response => {
        if (chrome.runtime.lastError) {
            console.error("Error:", chrome.runtime.lastError);
            return;
        }
        console.log("Response received:", response || "No response");
        // Optional: close the popup after a short delay
        // setTimeout(() => window.close(), 1000);
    });
    
    // Keep the popup open by adding a delay before potentially auto-closing
    // This gives the background script time to respond
    setTimeout(() => {
        console.log("Popup still open after timeout");
    }, 2000);
});