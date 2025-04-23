class AlertManager {
  constructor() {
    this.alerts = [];
    this.socket = io("http://localhost:4000");
    this.initSocketListeners();
    
    document.addEventListener('DOMContentLoaded', () => {
      this.loadInitialAlerts();
      
      // Initialize UI handlers
      document.getElementById('refresh-alerts')?.addEventListener('click', () => this.loadInitialAlerts());
      document.getElementById('clear-alerts')?.addEventListener('click', () => this.clearAllAlerts());
    });
  }

  initSocketListeners() {
    this.socket.on("new-alert", (alert) => {
      this.addAlert(alert);
    });
    
    this.socket.on("tradingview-alert", (alert) => {
      this.addAlert(alert);
    });
  }

  async loadInitialAlerts() {
    try {
      console.log("Fetching alerts...");
      const response = await fetch("http://178.156.155.13:4000/api/alerts?limit=50");
      const data = await response.json();
      console.log("Received alerts:", data);
      this.alerts = data;
      this.renderAlerts();
    } catch (error) {
      console.error("Failed to load alerts:", error);
      this.showNotification("Failed to load alerts", "error");
    }
  }

  addAlert(alert) {
    this.alerts.unshift(alert);
    this.renderAlerts();
    this.showNotification(`New alert received for ${alert.symbol}`, "info");
  }

  renderAlerts() {
    // Safely get elements with null checks
    const alertsList = document.getElementById("alerts-list");
    const noAlertsMessage = document.getElementById("no-alerts-message");
    
    // Guard clause - if we don't have the necessary elements, exit early
    if (!alertsList || !noAlertsMessage) {
      console.error("Alert elements not found in the DOM");
      return;
    }
    
    alertsList.innerHTML = "";

    if (this.alerts.length === 0) {
      noAlertsMessage.style.display = "flex";
      return;
    }
    
    noAlertsMessage.style.display = "none";
    
    // Group alerts by date
    const groupedAlerts = this.groupAlertsByDate(this.alerts);
    
    // Render each date group
    for (const [date, alerts] of Object.entries(groupedAlerts)) {
      // Add date divider
      const dateDivider = document.createElement('div');
      dateDivider.className = 'date-divider';
      dateDivider.textContent = date;
      alertsList.appendChild(dateDivider);
      
      // Add alerts for this date
      alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = this.createAlertItemHtml(alert);
        alertsList.appendChild(alertItem);
        
        // Add event listeners to buttons
        const viewBtn = alertItem.querySelector('.view-alert-btn');
        const dismissBtn = alertItem.querySelector('.delete-alert-btn');
        
        if (viewBtn) {
          viewBtn.addEventListener('click', () => this.showAlertDetails(alert._id || ''));
        }
        
        if (dismissBtn) {
          dismissBtn.addEventListener('click', () => this.deleteAlert(alert._id || ''));
        }
      });
    }
  }
  
  createAlertItemHtml(alert) {
    const timestamp = new Date(alert.timestamp || Date.now());
    const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const price = alert.price?.toFixed(2) || 'N/A';
    const message = alert.message || this.formatSignalType(alert.signalType);
    
    return `
      <div class="alert-icon">
        <i class="fas fa-chart-line"></i>
      </div>
      <div class="alert-content">
        <div class="alert-header">
          <h4 class="alert-title">${this.getAlertTitle(alert)}</h4>
          <span class="alert-time">${time}</span>
        </div>
        <div class="alert-details">
          <span class="symbol-badge">${alert.symbol || 'Unknown'}</span>
          <span class="alert-message">${message}</span>
        </div>
        <div class="alert-details">
          <span>Price: <span class="alert-price">${price}</span></span>
          ${this.getIndicatorsHtml(alert)}
        </div>
        <div class="alert-actions-row">
          <button class="alert-btn view view-alert-btn" data-id="${alert._id || ''}">Details</button>
          <button class="alert-btn dismiss delete-alert-btn" data-id="${alert._id || ''}">Dismiss</button>
        </div>
      </div>
    `;
  }
  
  getAlertTitle(alert) {
    if (alert.signal) {
      return alert.signal;
    } else if (alert.signalType) {
      return this.formatSignalType(alert.signalType);
    } else {
      return "Volume Oscillator Alert";
    }
  }
  
  getIndicatorsHtml(alert) {
    let html = '';
    
    if (alert.volume_oscillator) {
      html += `<span> | Vol Osc: ${Array.isArray(alert.volume_oscillator) ? alert.volume_oscillator[0]?.toFixed(2) : alert.volume_oscillator?.toFixed(2) || 'N/A'}</span>`;
    } else if (alert.volumeOsc) {
      html += `<span> | Vol Osc: ${alert.volumeOsc.toFixed(2)}</span>`;
    }
    
    if (alert.ema8) html += `<span> | EMA8: ${alert.ema8.toFixed(2)}</span>`;
    if (alert.ema20) html += `<span> | EMA20: ${alert.ema20.toFixed(2)}</span>`;
    if (alert.tema5) html += `<span> | TEMA5: ${alert.tema5.toFixed(2)}</span>`;
    
    return html;
  }
  
  groupAlertsByDate(alerts) {
    const grouped = {};
    
    alerts.forEach(alert => {
      const timestamp = new Date(alert.timestamp || Date.now());
      const dateStr = this.formatDateForGrouping(timestamp);
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(alert);
    });
    
    return grouped;
  }
  
  formatDateForGrouping(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  getBadgeClass(signalType) {
    if (!signalType) return '';
    
    const typeMap = {
      'buy': 'badge-long',
      'long-entry': 'badge-long',
      'sell': 'badge-short',
      'short-entry': 'badge-short',
      'exit-long': 'badge-exit',
      'exit-short': 'badge-exit',
      'hold': 'badge-neutral',
      'default': ''
    };
    return typeMap[signalType.toLowerCase()] || typeMap.default;
  }

  formatSignalType(type) {
    if (!type) return 'Signal';
    
    const map = {
      'buy': 'Buy Signal',
      'long-entry': 'Long Entry',
      'sell': 'Sell Signal',
      'short-entry': 'Short Entry',
      'exit-long': 'Exit Long',
      'exit-short': 'Exit Short',
      'hold': 'Hold Position',
      'default': 'Signal'
    };
    return map[type?.toLowerCase()] || map.default;
  }

  async showAlertDetails(alertId) {
    try {
      const alert = this.alerts.find(a => a._id === alertId);
      if (!alert) return;

      // Format alert data for display
      const details = this.formatAlertDetails(alert);
      
      // Create and show modal
      this.showAlertModal(details);
    } catch (error) {
      console.error("Error showing alert details:", error);
    }
  }
  
  formatAlertDetails(alert) {
    const details = {
      title: this.getAlertTitle(alert),
      symbol: alert.symbol || 'Unknown',
      price: alert.price?.toFixed(4) || 'N/A',
      time: new Date(alert.timestamp || Date.now()).toLocaleString(),
      message: alert.message || ''
    };
    
    // Add indicators
    if (alert.ema8) details.ema8 = alert.ema8.toFixed(4);
    if (alert.ema20) details.ema20 = alert.ema20.toFixed(4);
    if (alert.tema5) details.tema5 = alert.tema5.toFixed(4);
    if (alert.volumeOsc) details.volumeOsc = alert.volumeOsc.toFixed(2);
    if (alert.volume_oscillator) {
      details.volumeOsc = Array.isArray(alert.volume_oscillator) 
        ? alert.volume_oscillator[0]?.toFixed(2) 
        : alert.volume_oscillator?.toFixed(2) || 'N/A';
    }
    
    return details;
  }
  
  showAlertModal(details) {
    // Create modal element if it doesn't exist
    let modal = document.getElementById('alert-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'alert-details-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    // Create modal content
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${details.title}</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="detail-label">Symbol:</span>
            <span class="detail-value">${details.symbol}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Price:</span>
            <span class="detail-value">${details.price}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${details.time}</span>
          </div>
          ${details.message ? `
          <div class="detail-row">
            <span class="detail-label">Message:</span>
            <span class="detail-value">${details.message}</span>
          </div>` : ''}
          ${details.ema8 ? `
          <div class="detail-row">
            <span class="detail-label">EMA8:</span>
            <span class="detail-value">${details.ema8}</span>
          </div>` : ''}
          ${details.ema20 ? `
          <div class="detail-row">
            <span class="detail-label">EMA20:</span>
            <span class="detail-value">${details.ema20}</span>
          </div>` : ''}
          ${details.tema5 ? `
          <div class="detail-row">
            <span class="detail-label">TEMA5:</span>
            <span class="detail-value">${details.tema5}</span>
          </div>` : ''}
          ${details.volumeOsc ? `
          <div class="detail-row">
            <span class="detail-label">Volume Oscillator:</span>
            <span class="detail-value">${details.volumeOsc}</span>
          </div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="close-btn">Close</button>
        </div>
      </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    
    // Add event listeners to close modal
    const closeBtn = modal.querySelector('.close-btn');
    const closeModal = modal.querySelector('.close-modal');
    
    const closeModalFn = () => {
      modal.style.display = 'none';
    };
    
    closeBtn.addEventListener('click', closeModalFn);
    closeModal.addEventListener('click', closeModalFn);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModalFn();
    });
  }

  async deleteAlert(alertId) {
    try {
      if (alertId) {
        await fetch(`http://178.156.155.13:4000/api/alerts/${alertId}`, { method: "DELETE" });
      }
      this.alerts = this.alerts.filter(a => a._id !== alertId);
      this.renderAlerts();
      this.showNotification("Alert dismissed");
    } catch (error) {
      console.error("Error deleting alert:", error);
      this.showNotification("Failed to dismiss alert", "error");
    }
  }
  
  async clearAllAlerts() {
    try {
      if (confirm("Are you sure you want to clear all alerts?")) {
        await fetch(`http://178.156.155.13:4000/api/alerts`, { method: "DELETE" });
        this.alerts = [];
        this.renderAlerts();
        this.showNotification("All alerts cleared");
      }
    } catch (error) {
      console.error("Error clearing alerts:", error);
      this.showNotification("Failed to clear alerts", "error");
    }
  }

  showNotification(message, type = "success") {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }
}

// Initialize only once when file is loaded
const alertManager = new AlertManager();