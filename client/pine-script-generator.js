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
      volume: true
    };

    // Strategy settings
    this.strategySettings = {
      profitTarget: 6.0,
      stopLoss: 2.0,
      volumeThreshold: 7.0
    };
  }

  setSymbol(symbol) {
    this.symbol = symbol;
  }
  
  setTimeframe(timeframe) {
    this.timeframe = timeframe;
    // Update strategy settings based on timeframe
    this.updateStrategySettings();
  }

  updateStrategySettings() {
    switch(this.timeframe) {
      case '15m':
        this.strategySettings = {
          profitTarget: 6.0,
          stopLoss: 2.0,
          volumeThreshold: 7.0
        };
        break;
      case '1h':
        this.strategySettings = {
          profitTarget: 6.0,
          stopLoss: 2.0,
          volumeThreshold: 7.0
        };
        break;
      case '4h':
        this.strategySettings = {
          profitTarget: 10.0,
          stopLoss: 2.0,
          volumeThreshold: 7.0
        };
        break;
      case '1d':
        this.strategySettings = {
          profitTarget: 10.0,
          stopLoss: 2.0,
          volumeThreshold: 7.0
        };
        break;
      default:
        this.strategySettings = {
          profitTarget: 6.0,
          stopLoss: 2.0,
          volumeThreshold: 7.0
        };
    }
  }

  generateScript() {
    switch(this.timeframe) {
      case '15m':
        return this.generate15MinScript();
      case '1h':
        return this.generate1HourScript();
      case '4h':
        return this.generate4HourScript();
      case '1d':
        return this.generate1DayScript();
      default:
        return this.generate1HourScript();
    }
  }

  generate15MinScript() {
    return `//@version=6
strategy("TEMA5 Cross - 15MIN Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, initial_capital=10000, commission_value=0.1)

// ====== CLIENT'S 15-MIN RULES ======
// 1. Entry: TEMA5 crosses EMA8 + Volume OSC >0 OR (-7% with 7% improvement)
// 2. Exit: TEMA5 crosses EMA8 + Volume OSC positive
// 3. TP: 6% | SL: 2%

// ====== INPUTS ======
i_profitTarget = input.float(${this.strategySettings.profitTarget}, "Profit Target (%)", minval=0.1, step=0.1)
i_stopLoss = input.float(${this.strategySettings.stopLoss}, "Stop Loss (%)", minval=0.1, step=0.1)
i_volumeThreshold = input.float(${this.strategySettings.volumeThreshold}, "Volume Improvement %", tooltip="From client doc: Needs 7% improvement when negative")

// ====== INDICATORS ======
// EMAs
ema8 = ta.ema(close, 8)

// TEMA5
ema1 = ta.ema(close, 5)
ema2 = ta.ema(ema1, 5)
ema3 = ta.ema(ema2, 5)
tema5 = 3 * (ema1 - ema2) + ema3

// Volume OSC (EXACT client formula)
volShort = ta.ema(volume, 10)
volLong = ta.ema(volume, 20)
volumeOsc = ((volShort - volLong)/volLong)*100
volumeOscPrev = volumeOsc[1]
volumeImprovement = volumeOsc - volumeOscPrev

// ====== CLIENT'S CONDITIONS ======
// Entry Condition (EXACTLY as client wants)
entryCondition = ta.crossover(tema5, ema8) and 
     (volumeOsc > 0 or 
     (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// Exit Condition (EXACT client rule)
exitCondition = ta.crossunder(tema5, ema8) and volumeOsc > 0

// ====== STRATEGY EXECUTION ======
if (entryCondition)
    strategy.entry("15MIN_Long", strategy.long)
    strategy.exit("TP/SL", "15MIN_Long", limit = close * (1 + i_profitTarget/100), stop = close * (1 - i_stopLoss/100))

if (exitCondition)
    strategy.close("15MIN_Long")

// ====== CLIENT'S ALERTS ======
alertcondition(entryCondition, "15MIN Long Entry", 
  "TEMA5 crossed EMA8 with Volume confirmation on 15MIN chart")

alertcondition(exitCondition, "15MIN Long Exit", 
  "Exit signal on 15MIN chart")

// ====== VISUALIZATION ======
plot(ema8, "EMA8", color.red)
plot(tema5, "TEMA5", color.orange)
bgcolor(entryCondition ? color.new(color.green, 85) : na)  // 85% transparency
bgcolor(exitCondition ? color.new(color.red, 85) : na)     // 85% transparency`;
  }

  generate1HourScript() {
    return `//@version=6
strategy("TEMA5 Cross - 1HR Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, initial_capital=10000, commission_value=0.1)

// ====== CLIENT'S 1-HR RULES ======
// 1. Entry: TEMA5 crosses EMA8 + Volume OSC >0 OR (-7% with 7% improvement)
// 2. Exit: TEMA5 crosses EMA8 + Volume OSC positive
// 3. TP: 6% | SL: 2%

// ====== INPUTS ======
i_profitTarget = input.float(${this.strategySettings.profitTarget}, "Profit Target (%)", minval=0.1, step=0.1, group="1HR Strategy Settings")
i_stopLoss = input.float(${this.strategySettings.stopLoss}, "Stop Loss (%)", minval=0.1, step=0.1, group="1HR Strategy Settings")
i_volumeThreshold = input.float(${this.strategySettings.volumeThreshold}, "Volume Improvement %", tooltip="Needs 7% improvement when negative", group="Volume Conditions")

// ====== INDICATORS ======
// EMAs
ema8 = ta.ema(close, 8)
ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)

// TEMA5
ema1 = ta.ema(close, 5)
ema2 = ta.ema(ema1, 5)
ema3 = ta.ema(ema2, 5)
tema5 = 3 * (ema1 - ema2) + ema3

// Volume OSC (EXACT client formula)
volShort = ta.ema(volume, 10)
volLong = ta.ema(volume, 20)
volumeOsc = ((volShort - volLong)/volLong)*100
volumeOscPrev = volumeOsc[1]
volumeImprovement = volumeOsc - volumeOscPrev

// ====== CLIENT'S CONDITIONS ======
// Entry Condition (EXACTLY as client wants)
entryCondition = (ta.crossover(tema5, ema8) or ta.crossover(tema5, ema20) or ta.crossover(tema5, ema50)) and 
     (volumeOsc > 0 or (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// Exit Condition (EXACT client rule)
exitCondition = ta.crossunder(tema5, ema8) and volumeOsc > 0

// ====== STRATEGY EXECUTION ======
if (entryCondition)
    strategy.entry("1HR_Long", strategy.long)
    strategy.exit("TP/SL", "1HR_Long", limit = close * (1 + i_profitTarget/100), stop = close * (1 - i_stopLoss/100))

if (exitCondition)
    strategy.close("1HR_Long")

// ====== CLIENT'S ALERTS ======
alertcondition(entryCondition, "1HR Long Entry", 
  "TEMA5 crossed EMA with Volume confirmation on 1HR chart")

alertcondition(exitCondition, "1HR Long Exit", 
  "Exit signal on 1HR chart")

// ====== VISUALIZATION ======
plot(ema8, "EMA8", color.red)
plot(ema20, "EMA20", color.blue)
plot(ema50, "EMA50", color.green)
plot(tema5, "TEMA5", color.orange)
bgcolor(entryCondition ? color.new(color.green, 85) : na)
bgcolor(exitCondition ? color.new(color.red, 85) : na)

// ====== STRATEGY INFO TABLE ======
var table infoTable = table.new(position.top_right, 2, 4, bgcolor=color.new(#000000, 50))
if barstate.islastconfirmedhistory
    table.cell(infoTable, 0, 0, "1HR Strategy", text_color=color.white)
    table.cell(infoTable, 0, 1, "Entry Condition", text_color=color.white)
    table.cell(infoTable, 1, 1, "TEMA5 > EMA8/20/50 + Volume", text_color=color.white)
    table.cell(infoTable, 0, 2, "Exit Condition", text_color=color.white)
    table.cell(infoTable, 1, 2, "TEMA5 < EMA8 + Vol+", text_color=color.white)
    table.cell(infoTable, 0, 3, "TP/SL", text_color=color.white)
    table.cell(infoTable, 1, 3, str.tostring(i_profitTarget)+"% / "+str.tostring(i_stopLoss)+"%", text_color=color.white)`;
  }

  generate4HourScript() {
    return `//@version=6
strategy("TEMA5 Cross - 4HR Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, initial_capital=10000, commission_value=0.1)

// ====== CLIENT'S 4-HR RULES ======
// 1. Entry: TEMA5 crosses EMA8/20/50 + Volume OSC >0 OR (-7% with 7% improvement)
// 2. Exit: TEMA5 crosses EMA8 + Volume OSC positive
// 3. TP: 10% | SL: 2%
// 4. Can open opposite trade after exit if Volume improves

// ====== INPUTS ======
i_profitTarget = input.float(${this.strategySettings.profitTarget}, "Profit Target (%)", minval=0.1, step=0.1, group="4HR Strategy Settings")
i_stopLoss = input.float(${this.strategySettings.stopLoss}, "Stop Loss (%)", minval=0.1, step=0.1, group="4HR Strategy Settings")
i_volumeThreshold = input.float(${this.strategySettings.volumeThreshold}, "Volume Improvement %", tooltip="Needs 7% improvement when negative", group="Volume Conditions")

// ====== INDICATORS ======
// EMAs
ema8 = ta.ema(close, 8)
ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)

// TEMA5
ema1 = ta.ema(close, 5)
ema2 = ta.ema(ema1, 5)
ema3 = ta.ema(ema2, 5)
tema5 = 3 * (ema1 - ema2) + ema3

// Volume OSC
volShort = ta.ema(volume, 10)
volLong = ta.ema(volume, 20)
volumeOsc = ((volShort - volLong)/volLong)*100
volumeOscPrev = volumeOsc[1]
volumeImprovement = volumeOsc - volumeOscPrev

// ====== TRADE LOGIC ======
// Entry Condition (EMA8/20/50 cross + Volume)
entryCondition = (ta.crossover(tema5, ema8) or ta.crossover(tema5, ema20) or ta.crossover(tema5, ema50)) and 
     (volumeOsc > 0 or (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// Exit Condition
exitCondition = ta.crossunder(tema5, ema8) and volumeOsc > 0

// Opposite Trade Condition (After Exit)
var bool canOpenOpposite = false
if (exitCondition)
    canOpenOpposite := true
oppositeCondition = canOpenOpposite and (volumeOsc > 0 or (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// ====== STRATEGY EXECUTION ======
if (entryCondition)
    strategy.entry("4HR_Long", strategy.long)
    strategy.exit("TP/SL", "4HR_Long", limit = close * (1 + i_profitTarget/100), stop = close * (1 - i_stopLoss/100))
    canOpenOpposite := false

if (exitCondition)
    strategy.close("4HR_Long")

if (oppositeCondition)
    strategy.entry("4HR_Short", strategy.short)
    strategy.exit("TP/SL_Short", "4HR_Short",limit = close * (1 - i_profitTarget/100),stop = close * (1 + i_stopLoss/100))
    canOpenOpposite := false

// ====== ALERTS ======
alertcondition(entryCondition, "4HR Long Entry", "TEMA5 crossed EMA with Volume confirmation")
alertcondition(exitCondition, "4HR Long Exit", "Exit signal triggered")
alertcondition(oppositeCondition, "4HR Opposite Entry", "Opposite trade condition met")

// ====== VISUALIZATION ======
plot(ema8, "EMA8", color.red)
plot(ema20, "EMA20", color.blue)
plot(ema50, "EMA50", color.green)
plot(tema5, "TEMA5", color.orange)
bgcolor(entryCondition ? color.new(color.green, 85) : na)
bgcolor(exitCondition ? color.new(color.red, 85) : na)
bgcolor(oppositeCondition ? color.new(color.purple, 85) : na)

// ====== STRATEGY INFO ======
var table infoTable = table.new(position.top_right, 2, 5, bgcolor=color.new(#000000, 50))
if barstate.islastconfirmedhistory
    table.cell(infoTable, 0, 0, "4HR Strategy", text_color=color.white)
    table.cell(infoTable, 0, 1, "Entry Condition", text_color=color.white)
    table.cell(infoTable, 1, 1, "TEMA5 > EMA8/20/50 + Volume", text_color=color.white)
    table.cell(infoTable, 0, 2, "Exit Condition", text_color=color.white)
    table.cell(infoTable, 1, 2, "TEMA5 < EMA8 + Vol+", text_color=color.white)
    table.cell(infoTable, 0, 3, "Opposite Trade", text_color=color.white)
    table.cell(infoTable, 1, 3, "After Exit if Vol+", text_color=color.white)
    table.cell(infoTable, 0, 4, "TP/SL", text_color=color.white)
    table.cell(infoTable, 1, 4, str.tostring(i_profitTarget)+"% / "+str.tostring(i_stopLoss)+"%", text_color=color.white)`;
  }

  generate1DayScript() {
    return `//@version=6
strategy("TEMA5 Cross - DAY Strategy", overlay=true, default_qty_type=strategy.percent_of_equity, initial_capital=10000, commission_value=0.1)

// ====== CLIENT'S DAY RULES ======
// 1. Entry: TEMA5 crosses EMA8/20/50 + Volume OSC >0 OR (-7% with 7% improvement)
// 2. Exit: TEMA5 crosses EMA8 + Volume OSC positive
// 3. TP: 10% | SL: 2%
// 4. Can open opposite trade after exit if Volume improves

// ====== INPUTS ======
i_profitTarget = input.float(${this.strategySettings.profitTarget}, "Profit Target (%)", minval=0.1, step=0.1, group="DAY Strategy Settings")
i_stopLoss = input.float(${this.strategySettings.stopLoss}, "Stop Loss (%)", minval=0.1, step=0.1, group="DAY Strategy Settings")
i_volumeThreshold = input.float(${this.strategySettings.volumeThreshold}, "Volume Improvement %", tooltip="Needs 7% improvement when negative", group="Volume Conditions")

// ====== INDICATORS ======
// EMAs
ema8 = ta.ema(close, 8)
ema20 = ta.ema(close, 20)
ema50 = ta.ema(close, 50)
ema200 = ta.ema(close, 200) // Added for trend context

// TEMA5
ema1 = ta.ema(close, 5)
ema2 = ta.ema(ema1, 5)
ema3 = ta.ema(ema2, 5)
tema5 = 3 * (ema1 - ema2) + ema3

// Volume OSC
volShort = ta.ema(volume, 10)
volLong = ta.ema(volume, 20)
volumeOsc = ((volShort - volLong)/volLong)*100
volumeOscPrev = volumeOsc[1]
volumeImprovement = volumeOsc - volumeOscPrev

// ====== TRADE LOGIC ======
// Entry Condition (EMA8/20/50 cross + Volume)
entryCondition = (ta.crossover(tema5, ema8) or ta.crossover(tema5, ema20) or ta.crossover(tema5, ema50)) and 
     (volumeOsc > 0 or (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// Exit Condition
exitCondition = ta.crossunder(tema5, ema8) and volumeOsc > 0

// Opposite Trade Condition (After Exit)
var bool canOpenOpposite = false
if (exitCondition)
    canOpenOpposite := true
oppositeCondition = canOpenOpposite and (volumeOsc > 0 or (volumeOsc >= -7 and volumeImprovement >= i_volumeThreshold))

// ====== STRATEGY EXECUTION ======
if (entryCondition)
    strategy.entry("DAY_Long", strategy.long)
    strategy.exit("TP/SL", "DAY_Long", limit = close * (1 + i_profitTarget/100), stop = close * (1 - i_stopLoss/100))
    canOpenOpposite := false

if (exitCondition)
    strategy.close("DAY_Long")

if (oppositeCondition)
    strategy.entry("DAY_Short", strategy.short) 
    strategy.exit("TP/SL_Short", "DAY_Short",limit = close * (1 - i_profitTarget/100),stop = close * (1 + i_stopLoss/100))
    canOpenOpposite := false

// ====== URGENT PROFIT ALERT ======
var float entryPrice = na
if (strategy.position_size > 0 and na(entryPrice))
    entryPrice := close
if (strategy.position_size > 0 and close >= entryPrice * (1 + i_profitTarget/100))
    alert("URGENT: DAY Trade reached " + str.tostring(i_profitTarget) + "% target", alert.freq_once_per_bar)

// ====== ALERTS ======
alertcondition(entryCondition, "DAY Long Entry", "TEMA5 crossed EMA with Volume confirmation")
alertcondition(exitCondition, "DAY Long Exit", "Exit signal triggered")
alertcondition(oppositeCondition, "DAY Opposite Entry", "Opposite trade condition met")

// ====== VISUALIZATION ======
plot(ema8, "EMA8", color.red, linewidth=2)
plot(ema20, "EMA20", color.blue, linewidth=2)
plot(ema50, "EMA50", color.green, linewidth=2)
plot(ema200, "EMA200", color.yellow, linewidth=3) // Added for trend
plot(tema5, "TEMA5", color.orange, linewidth=3)
bgcolor(entryCondition ? color.new(color.green, 85) : na)
bgcolor(exitCondition ? color.new(color.red, 85) : na)
bgcolor(oppositeCondition ? color.new(color.purple, 85) : na)

// ====== STRATEGY INFO ======
var table infoTable = table.new(position.top_right, 2, 6, bgcolor=color.new(#000000, 50))
if barstate.islastconfirmedhistory
    table.cell(infoTable, 0, 0, "DAY Strategy", text_color=color.white, bgcolor=color.blue)
    table.cell(infoTable, 0, 1, "Entry Condition", text_color=color.white)
    table.cell(infoTable, 1, 1, "TEMA5 > EMA8/20/50 + Volume", text_color=color.white)
    table.cell(infoTable, 0, 2, "Exit Condition", text_color=color.white)
    table.cell(infoTable, 1, 2, "TEMA5 < EMA8 + Vol+", text_color=color.white)
    table.cell(infoTable, 0, 3, "Opposite Trade", text_color=color.white)
    table.cell(infoTable, 1, 3, "After Exit if Vol+", text_color=color.white)
    table.cell(infoTable, 0, 4, "TP/SL", text_color=color.white)
    table.cell(infoTable, 1, 4, str.tostring(i_profitTarget)+"% / "+str.tostring(i_stopLoss)+"%", text_color=color.white)
    table.cell(infoTable, 0, 5, "Trend Filter", text_color=color.white)
    table.cell(infoTable, 1, 5, "EMA200 (Yellow)", text_color=color.yellow)`;
  }
}