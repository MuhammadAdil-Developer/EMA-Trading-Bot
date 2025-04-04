class AlertManager {
    constructor() {
      this.alerts = [];
      this.socket = io("https://ema-trading-bot-production.up.railway.app");
      this.initSocketListeners();
      this.initUIHandlers();
      this.loadInitialAlerts();
    }
  
    initSocketListeners() {
      this.socket.on("new-alert", (alert) => {
        this.addAlert(alert);
      });
    }
  
    async loadInitialAlerts() {
      try {
        const response = await fetch("https://ema-trading-bot-production.up.railway.app/api/alerts?limit=50");
        this.alerts = await response.json();
        this.renderAlerts();
      } catch (error) {
        console.error("Failed to load alerts:", error);
        this.showNotification("Failed to load alerts", "error");
      }
    }
  
    addAlert(alert) {
      this.alerts.unshift(alert);
      this.renderAlerts();
    }
  
    renderAlerts() {
      const tableBody = document.querySelector("#alerts-table tbody");
      const noAlertsMessage = document.getElementById("no-alerts-message");
      const alertsTable = document.getElementById("alerts-table");
  
      tableBody.innerHTML = "";
  
      if (this.alerts.length === 0) {
        alertsContainer.classList.remove("has-alerts");
        return;
    }
    
    alertsContainer.classList.add("has-alerts");

      
      noAlertsMessage.style.display = "none";
      alertsTable.style.display = "table";
  
      this.alerts.forEach(alert => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${new Date(alert.timestamp).toLocaleTimeString()}</td>
          <td>${alert.symbol}</td>
          <td><span class="signal-badge ${this.getBadgeClass(alert.signalType)}">${this.formatSignalType(alert.signalType)}</span></td>
          <td>${alert.price.toFixed(4)}</td>
          <td>
            <button class="view-alert-btn" data-id="${alert._id}">Details</button>
            <button class="delete-alert-btn" data-id="${alert._id}">Dismiss</button>
          </td>
        `;
        tableBody.appendChild(row);
      });
  
      // Add event listeners
      document.querySelectorAll('.view-alert-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.showAlertDetails(e.target.dataset.id));
      });
  
      document.querySelectorAll('.delete-alert-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteAlert(e.target.dataset.id));
      });
    }
  
    getBadgeClass(signalType) {
      const typeMap = {
        'long-entry': 'badge-long',
        'short-entry': 'badge-short',
        'exit-long': 'badge-exit',
        'exit-short': 'badge-exit',
        'default': ''
      };
      return typeMap[signalType] || typeMap.default;
    }
  
    formatSignalType(type) {
      const map = {
        'long-entry': 'Long Entry',
        'short-entry': 'Short Entry',
        'exit-long': 'Exit Long',
        'exit-short': 'Exit Short',
        'default': 'Signal'
      };
      return map[type] || map.default;
    }
  
    async showAlertDetails(alertId) {
      // Similar to report details implementation
    }
  
    async deleteAlert(alertId) {
      try {
        await fetch(`https://ema-trading-bot-production.up.railway.app/api/alerts/${alertId}`, { method: "DELETE" });
        this.alerts = this.alerts.filter(a => a._id !== alertId);
        this.renderAlerts();
        this.showNotification("Alert dismissed");
      } catch (error) {
        console.error("Error deleting alert:", error);
        this.showNotification("Failed to dismiss alert", "error");
      }
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    new AlertManager();
  });
