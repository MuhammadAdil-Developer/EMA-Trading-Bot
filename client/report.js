class ReportManager {
  constructor() {
    this.reports = [];
    this.filteredReports = [];
    this.initUIHandlers();
    this.loadInitialReports();
  }

  initUIHandlers() {
    document.getElementById("refresh-reports-btn").addEventListener("click", () => this.loadReports());
    document.getElementById("export-csv-btn").addEventListener("click", () => this.exportToCSV());
    document.getElementById("export-json-btn").addEventListener("click", () => this.exportToJSON());
    document.getElementById("symbol-filter").addEventListener("change", () => this.filterReports());
    document.getElementById("date-range").addEventListener("change", () => this.filterReports());
  }

  async loadInitialReports() {
    try {
      const response = await fetch("/api/reports");
      this.reports = await response.json();
      this.filterReports();
    } catch (error) {
      console.error("Failed to load reports:", error);
    }
  }

  filterReports() {
    const symbolFilter = document.getElementById("symbol-filter").value;
    const dateRange = document.getElementById("date-range").value;
    
    this.filteredReports = this.reports.filter(report => {
      // Symbol filter
      if (symbolFilter !== 'all' && report.symbol !== symbolFilter) {
        return false;
      }
      
      // Date range filter
      const reportDate = new Date(report.timestamp);
      const now = new Date();
      
      if (dateRange === 'today') {
        return reportDate.toDateString() === now.toDateString();
      } else if (dateRange === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        return reportDate >= startOfWeek;
      } else if (dateRange === 'month') {
        return reportDate.getMonth() === now.getMonth() && 
               reportDate.getFullYear() === now.getFullYear();
      }
      
      return true; // 'all' option
    });
    
    this.renderReports();
  }

  renderReports() {
    const tableBody = document.querySelector("#signal-reports-table tbody");
    const tableContainer = document.querySelector(".report-table-container");
    
    tableBody.innerHTML = "";
    
    if (this.filteredReports.length === 0) {
      tableContainer.classList.remove("has-reports");
      return;
    }
    
    tableContainer.classList.add("has-reports");
    
    this.filteredReports.forEach(report => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${this.formatTime(report.timestamp)}</td>
        <td><span class="symbol-badge">${report.symbol}</span></td>
        <td>${report.price.toFixed(2)}</td>
        <td class="position-${report.positionType || 'long'}">
          ${report.positionType === 'short' ? 'SHORT' : 'LONG'}
        </td>
        <td class="${report.profit >= 0 ? 'profit' : 'loss'}">
          ${report.profit >= 0 ? '+' : ''}${report.profit?.toFixed(2) || '0.00'}%
        </td>
        <td>
          <button class="view-details-btn" data-id="${report.id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });

  
  
      // Add event listeners to buttons
      document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.showReportDetails(e.target.dataset.id));
      });
  
      document.querySelectorAll('.delete-report-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteReport(e.target.dataset.id));
      });

      
    }
  
    async exportToCSV() {
      try {
        // Get current filtered reports
        const reportsToExport = this.filteredReports;
        
        if (reportsToExport.length === 0) {
          this.showNotification("No reports to export", "warning");
          return;
        }
  
        // Create CSV headers
        let csv = "Timestamp,Symbol,Signal Type,Price,EMA8,EMA20,TEMA5,Volume OSC\n";
        
        // Add data rows
        reportsToExport.forEach(report => {
          csv += `"${new Date(report.timestamp).toLocaleString()}","${report.symbol}","${this.formatSignalType(report.signalType)}",${report.price.toFixed(4)},${report.ema8 ? report.ema8.toFixed(4) : ''},${report.ema20 ? report.ema20.toFixed(4) : ''},${report.tema5 ? report.tema5.toFixed(4) : ''},${report.volumeOsc ? report.volumeOsc.toFixed(2) : ''}\n`;
        });
  
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trading_signals_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification("CSV exported successfully");
      } catch (error) {
        console.error("Failed to export CSV:", error);
        this.showNotification("Failed to export CSV", "error");
      }
    }
  
    async exportToJSON() {
      try {
        // Get current filtered reports
        const reportsToExport = this.filteredReports;
        
        if (reportsToExport.length === 0) {
          this.showNotification("No reports to export", "warning");
          return;
        }
  
        // Create JSON data
        const jsonData = {
          metadata: {
            generatedAt: new Date().toISOString(),
            reportCount: reportsToExport.length,
            strategy: "TEMA Cross & Volume"
          },
          reports: reportsToExport.map(report => ({
            ...report,
            timestamp: new Date(report.timestamp).toISOString()
          }))
        };
  
        // Create download link
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trading_signals_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification("JSON exported successfully");
      } catch (error) {
        console.error("Failed to export JSON:", error);
        this.showNotification("Failed to export JSON", "error");
      }
    }
  
    async showReportDetails(reportId) {
      try {
        // Find the report by timestamp (used as ID)
        const report = this.reports.find(r => r.timestamp.getTime() === parseInt(reportId));
        
        if (!report) {
          this.showNotification("Report not found", "error");
          return;
        }
  
        // Create modal content
        const detailsHtml = `
          <h3>Signal Details</h3>
          <div class="detail-row">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${new Date(report.timestamp).toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Symbol:</span>
            <span class="detail-value">${report.symbol}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Signal Type:</span>
            <span class="detail-value signal-type ${report.signalType}">${this.formatSignalType(report.signalType)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Price:</span>
            <span class="detail-value">${report.price.toFixed(4)}</span>
          </div>
          <h4>Indicator Values</h4>
          <div class="detail-row">
            <span class="detail-label">EMA8:</span>
            <span class="detail-value">${report.ema8 ? report.ema8.toFixed(4) : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">EMA20:</span>
            <span class="detail-value">${report.ema20 ? report.ema20.toFixed(4) : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">TEMA5:</span>
            <span class="detail-value">${report.tema5 ? report.tema5.toFixed(4) : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Volume OSC:</span>
            <span class="detail-value">${report.volumeOsc ? report.volumeOsc.toFixed(2) : 'N/A'}</span>
          </div>
          <h4>Raw Data</h4>
          <pre class="raw-data">${JSON.stringify(report.rawData, null, 2)}</pre>
          <button id="close-details-modal" class="modal-close-btn">Close</button>
        `;
  
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'details-modal';
        modal.innerHTML = detailsHtml;
        document.body.appendChild(modal);
  
        // Add close button handler
        document.getElementById('close-details-modal').addEventListener('click', () => {
          document.body.removeChild(modal);
        });
      } catch (error) {
        console.error("Error showing report details:", error);
        this.showNotification("Failed to show details", "error");
      }
    }
  
    async deleteReport(reportId) {
      try {
        // Confirm deletion
        if (!confirm("Are you sure you want to delete this report?")) return;
  
        // Find index of report to delete
        const index = this.reports.findIndex(r => r.timestamp.getTime() === parseInt(reportId));
        
        if (index === -1) {
          this.showNotification("Report not found", "error");
          return;
        }
  
        // Remove from both arrays
        this.reports.splice(index, 1);
        const filteredIndex = this.filteredReports.findIndex(r => r.timestamp.getTime() === parseInt(reportId));
        if (filteredIndex !== -1) {
          this.filteredReports.splice(filteredIndex, 1);
        }
  
        // Update UI
        this.renderReports();
        this.showNotification("Report deleted successfully");
      } catch (error) {
        console.error("Error deleting report:", error);
        this.showNotification("Failed to delete report", "error");
      }
    }

    formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  
  
  
    formatSignalType(type) {
      const map = {
        'long-entry': 'Long Entry',
        'short-entry': 'Short Entry',
        'exit-long': 'Exit Long',
        'exit-short': 'Exit Short',
        'reversal': 'Reversal',
        'default': 'Signal'
      };
      return map[type] || map.default;
    }
  
    showNotification(message, type = "success") {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
  
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 3000);
    }
  }