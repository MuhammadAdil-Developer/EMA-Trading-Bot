class KlineChart {
  constructor(domElementId) {
    // Check if chart already exists
    if (window.tradingViewChart) {
      return window.tradingViewChart;      
    }

    this.chartProperties = {
      width: window.innerWidth,
      height: window.innerHeightgetKlines,
      layout: {
        backgroundColor: '#131722',
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)',
        },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    };

    const domElement = document.getElementById(domElementId);
    this.chart = LightweightCharts.createChart(domElement, this.chartProperties);

    // Store reference to prevent duplicates
    window.tradingViewChart = this;
    
    // Initialize all series
    this.initializeSeries();
    
  }

  initializeSeries() {
    // Main price series
    this.candleseries = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add all EMA indicators
    this.ema8Series = this.chart.addLineSeries({
      color: 'red',
      lineWidth: 1,
      title: 'EMA 8',
    });

    this.ema20Series = this.chart.addLineSeries({
      color: 'blue',
      lineWidth: 1,
      title: 'EMA 20',
    });

    this.ema50Series = this.chart.addLineSeries({
      color: 'green',
      lineWidth: 1,
      title: 'EMA 50',
    });

    this.ema200Series = this.chart.addLineSeries({
      color: 'yellow',
      lineWidth: 2,
      title: 'EMA 200',
    });

    // Add TEMA indicator
    this.tema5Series = this.chart.addLineSeries({
      color: 'orange',
      lineWidth: 2,
      title: 'TEMA 5',
    });

    // For volume, we'll use the price scale on the right
    this.volumeSeries = this.chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    this.volumeMaSeries = this.chart.addLineSeries({
      color: 'white',
      lineWidth: 1,
      title: 'Volume MA',
      priceScaleId: 'volume',
    });

    this.volumeOscSeries = this.chart.addLineSeries({
      color: 'purple',
      lineWidth: 1,
      title: 'Volume OSC',
      priceScaleId: 'volume-osc',
    });

    // Configure price scales
    this.chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    this.chart.priceScale('volume-osc').applyOptions({
      position: 'right',
      scaleMargins: {
        top: 0.7,
        bottom: 0.1,
      },
    });
  }

  clearData() {
    this.candleseries.setData([]);
    this.ema8Series.setData([]);
    this.ema20Series.setData([]);
    this.ema50Series.setData([]);
    this.ema200Series.setData([]);
    this.tema5Series.setData([]);
    this.volumeSeries.setData([]);
    this.volumeMaSeries.setData([]);
    this.volumeOscSeries.setData([]);
  }


  // Update the loadHistoricalData method in KlineChart
  loadHistoricalData(klinedata) {
    console.log(`Loading ${klinedata.length} data points into chart`);
    
    try {
      // Clear existing data first
      this.clearData();
      
      // Verify data format before setting
      if (klinedata.length > 0) {
        const sample = klinedata[0];
        console.log("Sample kline data:", sample);
        
        // Make sure we have at least open, high, low, close data
        if (sample.open === undefined || sample.high === undefined || 
            sample.low === undefined || sample.close === undefined) {
          console.error("Invalid kline data format:", sample);
          throw new Error("Invalid data format");
        }
      }
      klinedata.sort((a, b) => a.time - b.time);

      // Load new data
      this.candleseries.setData(klinedata);
      
      // Set data for each indicator series
      this.ema8Series.setData(this.extractData(klinedata, 'ema8'));
      this.ema20Series.setData(this.extractData(klinedata, 'ema20'));
      this.ema50Series.setData(this.extractData(klinedata, 'ema50'));
      this.ema200Series.setData(this.extractData(klinedata, 'ema200'));
      this.tema5Series.setData(this.extractData(klinedata, 'tema5'));
      
      // Volume data
      const volumeData = klinedata.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close > d.open ? '#26a69a' : '#ef5350'
      }));
      
      this.volumeSeries.setData(volumeData);
      this.volumeMaSeries.setData(this.extractData(klinedata, 'volumeMa'));
      this.volumeOscSeries.setData(this.extractData(klinedata, 'volumeOsc'));
      
      // Force chart to fit content after loading
      this.chart.timeScale().fitContent();
      
      console.log("Chart data loaded successfully");
    } catch (error) {
      console.error("Error loading chart data:", error);
      throw error; // Propagate error to caller
    }
  }

  extractData(klinedata, key) {
    return klinedata
      .filter(d => d[key] !== undefined && d[key] !== null)
      .map(d => ({ time: d.time, value: d[key] }));
  }

  updateKline(kline) {
    try {
      // First check if this is a historical data point (older than what we already have)
      const existingData = this.candleseries.dataByTime();
      const lastTimestamp = Object.keys(existingData).length > 0 ? 
        Math.max(...Object.keys(existingData).map(Number)) : 0;
      
      // If this is an older data point than our most recent one, skip the update
      if (lastTimestamp > 0 && kline.time < lastTimestamp) {
        console.log(`Skipping update for historical data point: ${kline.time} (current latest: ${lastTimestamp})`);
        return;
      }
      
      // Update main candlestick series
      try {
        this.candleseries.update(kline);
      } catch (error) {
        console.warn(`Error updating candlestick series: ${error.message}`);
      }
      
      // Update each indicator series with individual try/catch blocks
      if (kline.ema8 !== undefined) {
        try {
          this.ema8Series.update({ time: kline.time, value: kline.ema8 });
        } catch (error) {
          console.warn(`Error updating EMA8: ${error.message}`);
        }
      }
      
      if (kline.ema20 !== undefined) {
        try {
          this.ema20Series.update({ time: kline.time, value: kline.ema20 });
        } catch (error) {
          console.warn(`Error updating EMA20: ${error.message}`);
        }
      }
        
      if (kline.ema50) {
        try {
          this.ema50Series.update({ time: kline.time, value: kline.ema50 });
        } catch (error) {
          console.warn(`Error updating EMA50: ${error.message}`);
        }
      }
      
      if (kline.ema200) {
        try {
          this.ema200Series.update({ time: kline.time, value: kline.ema200 });
        } catch (error) {
          console.warn(`Error updating EMA200: ${error.message}`);
        }
      }
      
      if (kline.tema5) {
        try {
          this.tema5Series.update({ time: kline.time, value: kline.tema5 });
        } catch (error) {
          console.warn(`Error updating TEMA5: ${error.message}`);
        }
      }
      
      // Update volume data
      const volumeColor = kline.close > kline.open ? '#26a69a' : '#ef5350';
      try {
        this.volumeSeries.update({
          time: kline.time,
          value: kline.volume,
          color: volumeColor
        });
      } catch (error) {
        console.warn(`Error updating volume: ${error.message}`);
      }
      
      if (kline.volumeMa) {
        try {
          this.volumeMaSeries.update({ time: kline.time, value: kline.volumeMa });
        } catch (error) {
          console.warn(`Error updating Volume MA: ${error.message}`);
        }
      }
      
      if (kline.volumeOsc) {
        try {
          this.volumeOscSeries.update({ time: kline.time, value: kline.volumeOsc });
        } catch (error) {
          console.warn(`Error updating Volume OSC: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Error in updateKline:", error);
    }
  }
}