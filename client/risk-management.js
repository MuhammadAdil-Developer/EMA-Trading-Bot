function setupRiskManagement() {
  // Get DOM elements
  const riskPerTradeSlider = document.getElementById('risk-per-trade');
  const riskPerTradeValue = document.getElementById('risk-per-trade-value');
  const circuitBreakerCheckbox = document.getElementById('circuit-breaker-checkbox');
  const consecutiveLossesInput = document.getElementById('consecutive-losses');
  const gapProtectionCheckbox = document.getElementById('gap-protection-checkbox');
  const gapThresholdInput = document.getElementById('gap-threshold');
  const doubleOrdersCheckbox = document.getElementById('double-orders-checkbox');
  const shortTermTargetInput = document.getElementById('short-term-target');
  const trailingStopInput = document.getElementById('trailing-stop');
  const resetCircuitBreakerBtn = document.getElementById('reset-circuit-breaker');
  
  // State variables
  let circuitBreakerActive = false;
  let consecutiveLosses = 0;
  
  // Update the displayed risk value when slider changes
  riskPerTradeSlider.addEventListener('input', function() {
    riskPerTradeValue.textContent = this.value + '%';
    updateRiskSettings();
  });
  
  // Event listeners for settings changes
  circuitBreakerCheckbox.addEventListener('change', updateRiskSettings);
  consecutiveLossesInput.addEventListener('change', updateRiskSettings);
  gapProtectionCheckbox.addEventListener('change', updateRiskSettings);
  gapThresholdInput.addEventListener('change', updateRiskSettings);
  doubleOrdersCheckbox.addEventListener('change', updateRiskSettings);
  shortTermTargetInput.addEventListener('change', updateRiskSettings);
  trailingStopInput.addEventListener('change', updateRiskSettings);
  
  // Reset circuit breaker
  resetCircuitBreakerBtn.addEventListener('click', function() {
    circuitBreakerActive = false;
    consecutiveLosses = 0;
    document.getElementById('circuit-breaker-status').textContent = 'Inactive';
    document.getElementById('circuit-breaker-status').className = 'status-inactive';
    document.getElementById('consecutive-losses-count').textContent = '0';
    updateRiskSettings();
  });
  
    function updatePineScript() {
      const settings = {
        riskPerTrade: parseFloat(riskPerTradeSlider.value),
        enableCircuitBreaker: circuitBreakerCheckbox.checked,
        maxConsecutiveLosses: parseInt(consecutiveLossesInput.value),
        enableGapProtection: gapProtectionCheckbox.checked,
        gapThresholdPercent: parseFloat(gapThresholdInput.value)
      };
      
      if (window.pineScriptGenerator) {
        pineScriptGenerator.updateRiskSettings(settings);
      }
    }
  
    // Add event listeners to all risk controls
    const riskControls = [
      riskPerTradeSlider, circuitBreakerCheckbox, consecutiveLossesInput,
      gapProtectionCheckbox, gapThresholdInput
    ];
    
    riskControls.forEach(control => {
      control.addEventListener('change', updatePineScript);
    });
  

    // Function to collect all risk settings and update PineScriptGenerator
    function updateRiskSettings() {
      if (!pineScriptGenerator) return;
      
      const settings = {
        riskPerTrade: parseFloat(riskPerTradeSlider.value),
        enableCircuitBreaker: circuitBreakerCheckbox.checked,
        maxConsecutiveLosses: parseInt(consecutiveLossesInput.value),
        enableGapProtection: gapProtectionCheckbox.checked,
        gapThresholdPercent: parseFloat(gapThresholdInput.value),
        enableDoubleOrderStrategy: doubleOrdersCheckbox.checked,
        shortTermTarget: parseFloat(shortTermTargetInput.value),
        trailingStopPct: parseFloat(trailingStopInput.value)
      };
      
      // Update BOTH riskSettings AND uiSettings
      pineScriptGenerator.updateRiskSettings(settings);
      pineScriptGenerator.updateUISettings({
        includeCircuitBreaker: circuitBreakerCheckbox.checked,
        includeGapProtection: gapProtectionCheckbox.checked
      });
      
      console.log("Risk settings updated:", settings);
    }

    
    // Mock function to simulate trade results (in a real system, this would come from backend)
    function simulateTradeResult(profitable) {
      if (!profitable) {
        consecutiveLosses++;
        document.getElementById('consecutive-losses-count').textContent = consecutiveLosses;
        document.getElementById('last-trade-status').textContent = 'Loss';
        document.getElementById('last-trade-status').className = 'status-negative';
        
        // Check circuit breaker
        if (consecutiveLosses >= parseInt(consecutiveLossesInput.value) && circuitBreakerCheckbox.checked) {
          circuitBreakerActive = true;
          document.getElementById('circuit-breaker-status').textContent = 'ACTIVE';
          document.getElementById('circuit-breaker-status').className = 'status-active';
        }
      } else {
        consecutiveLosses = 0;
        document.getElementById('consecutive-losses-count').textContent = '0';
        document.getElementById('last-trade-status').textContent = 'Profit';
        document.getElementById('last-trade-status').className = 'status-positive';
      }
    }
    
    // Expose the simulateTradeResult function for testing
    window.simulateTradeResult = simulateTradeResult;
    
    return {
      isCircuitBreakerActive: () => circuitBreakerActive,
      getConsecutiveLosses: () => consecutiveLosses,
      getRiskSettings: () => ({
        riskPerTrade: parseFloat(riskPerTradeSlider.value),
        enableCircuitBreaker: circuitBreakerCheckbox.checked,
        maxConsecutiveLosses: parseInt(consecutiveLossesInput.value),
        enableGapProtection: gapProtectionCheckbox.checked,
        gapThresholdPercent: parseFloat(gapThresholdInput.value),
        enableDoubleOrderStrategy: doubleOrdersCheckbox.checked,
        shortTermTarget: parseFloat(shortTermTargetInput.value),
        trailingStopPct: parseFloat(trailingStopInput.value)
      })
    };
}
  
  // Add CSS for the risk management panel
  function addRiskManagementStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .risk-management-panel {
        background-color: #1E222D;
        border: 1px solid #2F323D;
        border-radius: 5px;
        padding: 15px;
        margin-top: 20px;
        color: white;
      }
      
      .risk-settings-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .risk-setting {
        margin-bottom: 10px;
      }
      
      .sub-setting {
        margin-left: 25px;
        margin-top: 5px;
      }
      
      .strategy-status {
        background-color: #191C24;
        padding: 10px;
        border-radius: 5px;
      }
      
      .status-active {
        color: #FF4560;
        font-weight: bold;
      }
      
      .status-inactive {
        color: #26A69A;
      }
      
      .status-positive {
        color: #26A69A;
      }
      
      .status-negative {
        color: #FF4560;
      }
      
      .reset-btn {
        background-color: #2962FF;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
      }
      
      input[type="range"] {
        width: 100%;
        background: #2F323D;
      }
      
      input[type="number"] {
        background: #2F323D;
        border: 1px solid #3F4254;
        color: white;
        padding: 5px;
        width: 80px;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Update the main function to initialize risk management
  function initializeRiskManagement() {
    // Simplified initialization without moving elements or injecting styles
    window.riskManager = setupRiskManagement();
    console.log("Risk management system initialized");
  }

  