class PineScriptGenerator {
  constructor(symbol = "BTCUSDT", timeframe = "1h") {
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.indicators = {
      ema8: true,
      ema20: true,
      ema50: true,
      ema200: true,
      tema5: true,
      volume: true,
      volumeMa: true,
      volumeOsc: true
    };

    // Risk management settings
    this.riskSettings = {
      riskPerTrade: 2.0,
      enableCircuitBreaker: true,
      maxConsecutiveLosses: 3,
      enableGapProtection: true,
      gapThresholdPercent: 2.0,
      enableDoubleOrderStrategy: true,
      shortTermTarget: 1.5,
      trailingStopPct: 0.5
    };
    
    // UI control settings
    this.uiSettings = {
      includeCircuitBreaker: true,
      includeGapProtection: true
    };
    
    // Signal display settings
    this.signalDisplay = {
      showLongEntries: true,
      showShortEntries: true,
      showLongExits: true,
      showShortExits: true,
      showReversal: true,
      showRiskSignals: true,
      signalType: "All"
    };
  }

  setSymbol(symbol) {
    this.symbol = symbol;
  }
  
  setTimeframe(timeframe) {
    this.timeframe = timeframe;
  }
  
  updateRiskSettings(settings) {
    this.riskSettings = {
      ...this.riskSettings,
      ...settings
    };
  }

  updateUISettings(settings) {
    this.uiSettings = {
      ...this.uiSettings,
      ...settings
    };
  }
  
  // Get timeframe multiplier for scaling indicator periods
  getTimeframeMultiplier() {
    const tf = this.timeframe;
    if (tf.includes('m')) {
      const minutes = parseInt(tf);
      return minutes / 60; // minutes to hours
    }
    if (tf.includes('h')) {
      const hours = parseInt(tf);
      return hours; // hours
    }
    if (tf === '1d') return 24; // days to hours
    return 1; // default
  }
  
  // Calculate adjusted periods based on timeframe
  getAdjustedPeriod(basePeriod) {
    const multiplier = this.getTimeframeMultiplier();
    // Base period is assumed to be for 1h timeframe
    // For shorter timeframes, increase the period
    // For longer timeframes, decrease the period
    const scaledPeriod = Math.round(basePeriod / multiplier);
    // Ensure minimum period of 2
    return Math.max(2, scaledPeriod);
  }
  
  // Get volume analysis settings based on timeframe
  getVolumeSettings() {
    const multiplier = this.getTimeframeMultiplier();
    // Adjust volume lookback period based on timeframe
    // Shorter timeframes need longer lookback periods
    let volumeBase = 24; // Base lookback for 1h
    
    if (multiplier < 1) {
      // For shorter timeframes like 15m
      volumeBase = Math.round(volumeBase / multiplier);
    } else {
      // For longer timeframes like 4h or 1d
      volumeBase = Math.max(10, Math.round(volumeBase / Math.sqrt(multiplier)));
    }
    
    return {
      volumeLookback: volumeBase,
      volumeOscShort: Math.max(5, Math.round(volumeBase/3)),
      volumeOscLong: volumeBase
    };
  }

  // Get exit strategy based on timeframe
  getExitStrategy() {
    switch (this.timeframe) {
      case '15m':
        return {
          longExit: 'tema5 < ema8 or (close < tema5 and volumeOsc < 0)',
          shortExit: 'tema5 > ema8 or (close > tema5 and volumeOsc < 0)'
        };
      case '1h':
        return {
          longExit: 'tema5 < ema20 or (close < tema5 and volumeOsc < -2)',
          shortExit: 'tema5 > ema20 or (close > tema5 and volumeOsc < -2)'
        };
      case '4h':
        return {
          longExit: 'tema5 < ema50 or tema5 < ema20 and tema5[1] > ema20[1]',
          shortExit: 'tema5 > ema50 or tema5 > ema20 and tema5[1] < ema20[1]'
        };
      case '1d':
        return {
          longExit: 'tema5 < ema200 or (tema5 < ema50 and tema5[1] > ema50[1])',
          shortExit: 'tema5 > ema200 or (tema5 > ema50 and tema5[1] < ema50[1])'
        };
      default:
        return {
          longExit: 'tema5 < ema20',
          shortExit: 'tema5 > ema20'
        };
    }
  }

  generateScript() {
    return `//@version=6
indicator("TEMA Cross & Volume Strategy - ${this.symbol} ${this.timeframe}", overlay=true, timeframe="${this.timeframe}")

// Inputs
${this.generateInputs()}

// Indicators
${this.generateIndicators()}

// Signals
${this.generateSignals()}

// Alerts
${this.generateAlertConditions()}

// Visualization
${this.generateVisualization()}

// Display Table
${this.generateDisplayTable()}`;
  }

  generateInputs() {
    // Calculate dynamic volume threshold based on timeframe
    const volumeThreshold = this.timeframe === '15m' ? 5.0 : 
                           this.timeframe === '1h' ? 7.0 : 
                           this.timeframe === '4h' ? 10.0 : 15.0;

    return `// Risk Management
i_riskPerTrade = input.float(${this.riskSettings.riskPerTrade}, "Risk Per Trade (%)", minval=0.1, maxval=5, step=0.1)
${this.uiSettings.includeCircuitBreaker ? `i_enableCircuitBreaker = input.bool(${this.riskSettings.enableCircuitBreaker}, "Enable Circuit Breaker")
i_maxConsecutiveLosses = input.integer(${this.riskSettings.maxConsecutiveLosses}, "Max Consecutive Losses", minval=1, maxval=10)` : ''}
${this.uiSettings.includeGapProtection ? `i_enableGapProtection = input.bool(${this.riskSettings.enableGapProtection}, "Enable Gap Protection")
i_gapThreshold = input.float(${this.riskSettings.gapThresholdPercent}, "Gap Threshold (%)", minval=0.5, maxval=10, step=0.1)` : ''}

// Strategy Configuration
i_useEma8 = input.bool(${this.indicators.ema8}, "Use EMA 8")
i_useEma20 = input.bool(${this.indicators.ema20}, "Use EMA 20") 
i_useEma50 = input.bool(${this.indicators.ema50}, "Use EMA 50")
i_useEma200 = input.bool(${this.indicators.ema200}, "Use EMA 200")
i_useTema5 = input.bool(${this.indicators.tema5}, "Use TEMA 5")
i_useVolume = input.bool(${this.indicators.volume}, "Use Volume Analysis")
i_volumeOscThreshold = input.float(${volumeThreshold}, "Volume OSC Threshold", tooltip="Adjusted for ${this.timeframe} timeframe")

// Double Orders Strategy
i_useDoubleOrders = input.bool(${this.riskSettings.enableDoubleOrderStrategy}, "Use Double Orders")
i_shortTermTarget = input.float(${this.riskSettings.shortTermTarget}, "Short-term Target (%)", minval=0.1, step=0.1)
i_trailingStopPct = input.float(${this.riskSettings.trailingStopPct}, "Trailing Stop (%)", minval=0.1, step=0.1)

// Display Options
i_showLongEntries = input.bool(${this.signalDisplay.showLongEntries}, "Show Long Entries")
i_showShortEntries = input.bool(${this.signalDisplay.showShortEntries}, "Show Short Entries")
i_showLongExits = input.bool(${this.signalDisplay.showLongExits}, "Show Long Exits") 
i_showShortExits = input.bool(${this.signalDisplay.showShortExits}, "Show Short Exits")
i_showReversal = input.bool(${this.signalDisplay.showReversal}, "Show Reversals")
i_showRiskSignals = input.bool(${this.signalDisplay.showRiskSignals}, "Show Risk Signals")
i_signalTypes = input.string("${this.signalDisplay.signalType}", "Signal Types", options=["All", "Entry Only", "Exit Only", "Reversal Only", "Risk Only"])

// Timeframe Information
i_timeframeInfo = input.bool(true, "Show Timeframe-Specific Settings", tooltip="Displays the indicator settings optimized for ${this.timeframe} timeframe")`;
  }

  generateIndicators() {
    // Get volume settings adjusted for the current timeframe
    const volSettings = this.getVolumeSettings();
    
    // Adjust EMA and TEMA periods based on timeframe
    const ema8Period = this.getAdjustedPeriod(8);
    const ema20Period = this.getAdjustedPeriod(20);
    const ema50Period = this.getAdjustedPeriod(50);
    const ema200Period = this.getAdjustedPeriod(200);
    const temaPeriod = this.getAdjustedPeriod(5);

    return `// Calculate Indicators (dynamically adjusted for ${this.timeframe} timeframe)
ema8 = ta.ema(close, ${ema8Period}) // Adjusted from base period 8
ema20 = ta.ema(close, ${ema20Period}) // Adjusted from base period 20
ema50 = ta.ema(close, ${ema50Period}) // Adjusted from base period 50
ema200 = ta.ema(close, ${ema200Period}) // Adjusted from base period 200

// TEMA Calculation (adjusted for timeframe)
tema_period = ${temaPeriod} // Adjusted from base period 5
ema1 = ta.ema(close, tema_period)
ema2 = ta.ema(ema1, tema_period)
ema3 = ta.ema(ema2, tema_period)
tema5 = 3 * (ema1 - ema2) + ema3

// Dynamic Volume Analysis optimized for ${this.timeframe}
volumeLookback = ${volSettings.volumeLookback} // Dynamically adjusted for timeframe
volumeMa = ta.ema(volume, volumeLookback)
volOscShort = ta.ema(volume, ${volSettings.volumeOscShort})
volOscLong = ta.ema(volume, ${volSettings.volumeOscLong})
volumeOsc = ((volOscShort - volOscLong) / volOscLong) * 100
volumeOscImprovement = volumeOsc - volumeOsc[1] // Rate of change

// Plot Indicators
plot(i_useEma8 ? ema8 : na, "EMA " + str.tostring(${ema8Period}), color.red)
plot(i_useEma20 ? ema20 : na, "EMA " + str.tostring(${ema20Period}), color.blue) 
plot(i_useEma50 ? ema50 : na, "EMA " + str.tostring(${ema50Period}), color.green)
plot(i_useEma200 ? ema200 : na, "EMA " + str.tostring(${ema200Period}), color.yellow, 2)
plot(i_useTema5 ? tema5 : na, "TEMA " + str.tostring(${temaPeriod}), color.orange, 2)

// Volume Panel
plotchar(i_timeframeInfo ? volumeLookback : na, "Vol Lookback", "•", location.top, color.white, size=size.tiny)
plot(i_useVolume ? volumeOsc : na, "Volume OSC", volumeOsc > 0 ? color.green : color.red)
hline(0, "Zero", color.gray, hline.style_dotted)
hline(i_volumeOscThreshold, "Threshold", color.gray, hline.style_dashed)`;
  }

  generateSignals() {
    // Get exit strategy based on timeframe
    const exitStrategy = this.getExitStrategy();

    let signals = `// Initialize Variables
var positionSize = 0
${this.uiSettings.includeCircuitBreaker ? 'var consecutiveLosses = 0' : ''}

// Entry Conditions (optimized for ${this.timeframe})
temaCrossUp = ta.crossover(tema5, ema8)
temaCrossDown = ta.crossunder(tema5, ema8)
volumeOk = volumeOsc > 0 or volumeOscImprovement >= i_volumeOscThreshold

// Additional conditions based on timeframe
${this.timeframe === '15m' ? 'shortTermTrend = close > ema8' : 
  this.timeframe === '1h' ? 'shortTermTrend = close > ema20' : 
  this.timeframe === '4h' ? 'shortTermTrend = close > ema50' : 
  'shortTermTrend = close > ema200'}

// Entry Signals
longEntry = temaCrossUp and volumeOk and positionSize == 0 ${this.timeframe === '1d' ? 'and shortTermTrend' : ''}
shortEntry = temaCrossDown and volumeOk and positionSize == 0 ${this.timeframe === '1d' ? 'and not shortTermTrend' : ''}

// Timeframe-specific exit rules
exitLong = ${exitStrategy.longExit}
exitShort = ${exitStrategy.shortExit}

// Reversal Signals
longReversal = temaCrossUp and volumeOk and positionSize < 0
shortReversal = temaCrossDown and volumeOk and positionSize > 0`;

    if (this.uiSettings.includeCircuitBreaker) {
      signals += `\n\n// Circuit Breaker
circuitBreakerActive = consecutiveLosses >= i_maxConsecutiveLosses`;
    }

    if (this.uiSettings.includeGapProtection) {
      signals += `\n\n// Gap Protection
gapUp = open > high[1] * (1 + i_gapThreshold/100)
gapDown = open < low[1] * (1 - i_gapThreshold/100) 
gapDetected = gapUp or gapDown
gapProtection = gapDetected and positionSize != 0`;
    }

    signals += `\n\n// Position Management
if (longEntry)
    positionSize := 1
if (shortEntry)
    positionSize := -1
if (exitLong and positionSize > 0)
    positionSize := 0
if (exitShort and positionSize < 0) 
    positionSize := 0`;

    if (this.riskSettings.enableDoubleOrderStrategy) {
      signals += `\nif (longReversal)
    positionSize := 1
if (shortReversal)
    positionSize := -1`;
    }

    if (this.uiSettings.includeGapProtection) {
      signals += `\nif (gapProtection)
    positionSize := 0`;
    }

    return signals;
  }

  generateAlertConditions() {
    let alerts = `// Alert Conditions
alertcondition(longEntry, "Long Entry", "Long entry signal on {{ticker}} (${this.timeframe})")
alertcondition(shortEntry, "Short Entry", "Short entry signal on {{ticker}} (${this.timeframe})")
alertcondition(exitLong, "Exit Long", "Exit long signal on {{ticker}} (${this.timeframe})")
alertcondition(exitShort, "Exit Short", "Exit short signal on {{ticker}} (${this.timeframe})")`;

    if (this.riskSettings.enableDoubleOrderStrategy) {
      alerts += `\nalertcondition(longReversal, "Long Reversal", "Long reversal signal on {{ticker}} (${this.timeframe})")
alertcondition(shortReversal, "Short Reversal", "Short reversal signal on {{ticker}} (${this.timeframe})")`;
    }

    if (this.uiSettings.includeCircuitBreaker) {
      alerts += `\nalertcondition(circuitBreakerActive, "Circuit Breaker", "Circuit breaker activated on {{ticker}} (${this.timeframe})")`;
    }

    if (this.uiSettings.includeGapProtection) {
      alerts += `\nalertcondition(gapProtection, "Gap Protection", "Gap protection triggered on {{ticker}} (${this.timeframe})")`;
    }

    return alerts;
  }

  generateVisualization() {
    return `// Signal Visualization
plotshape(longEntry and i_showLongEntries, "Long Entry", shape.triangleup, location.belowbar, color.green, size=size.normal, text="LONG")
plotshape(shortEntry and i_showShortEntries, "Short Entry", shape.triangledown, location.abovebar, color.red, size=size.normal, text="SHORT")
plotshape(exitLong and i_showLongExits, "Exit Long", shape.xcross, location.abovebar, color.blue, size=size.normal, text="EXIT")
plotshape(exitShort and i_showShortExits, "Exit Short", shape.xcross, location.belowbar, color.purple, size=size.normal, text="EXIT")
plotshape(longReversal and i_showReversal, "Long Reversal", shape.triangleup, location.belowbar, color.lime, size=size.normal, text="REV↑")
plotshape(shortReversal and i_showReversal, "Short Reversal", shape.triangledown, location.abovebar, color.maroon, size=size.normal, text="REV↓")`;
  }

  generateDisplayTable() {
    // Get volume settings for display
    const volSettings = this.getVolumeSettings();
    
    return `// Info Table
if barstate.islastconfirmedhistory
    var table info = table.new(position.top_right, 2, 10, bgcolor=color.new(color.black, 70))
    table.cell(info, 0, 0, "TEMA Cross Strategy", bgcolor=color.new(color.blue, 90), text_color=color.white)
    table.cell(info, 0, 1, "Symbol:", text_color=color.white)
    table.cell(info, 1, 1, syminfo.ticker, text_color=color.white)
    table.cell(info, 0, 2, "Timeframe:", text_color=color.white)
    table.cell(info, 1, 2, timeframe.period, text_color=color.white)
    table.cell(info, 0, 3, "Position:", text_color=color.white)
    table.cell(info, 1, 3, positionSize > 0 ? "LONG" : positionSize < 0 ? "SHORT" : "FLAT", 
              positionSize > 0 ? color.green : positionSize < 0 ? color.red : color.white)
    table.cell(info, 0, 4, "Volume OSC:", text_color=color.white)
    table.cell(info, 1, 4, str.tostring(volumeOsc, "#.##"), volumeOsc > 0 ? color.green : color.red)
    table.cell(info, 0, 5, "TEMA Period:", text_color=color.white)
    table.cell(info, 1, 5, str.tostring(${this.getAdjustedPeriod(5)}), color.orange)
    table.cell(info, 0, 6, "Vol Lookback:", text_color=color.white)
    table.cell(info, 1, 6, str.tostring(${volSettings.volumeLookback}), color.white)
    table.cell(info, 0, 7, "Exit Logic:", text_color=color.white)
    table.cell(info, 1, 7, "${this.timeframe} optimized", color.yellow)`;
  }
}