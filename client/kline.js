class KlineChart {
  constructor(domElementId) {
    // Check if chart already exists
    if (window.tradingViewChart) {
      return window.tradingViewChart;

      
    }

    this.chartProperties = {
      width: window.innerWidth,
      height: window.innerHeight,
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


  loadHistoricalData(klinedata) {
    // Clear existing data first
    this.candleseries.setData([]);
    this.ema8Series.setData([]);
    this.ema20Series.setData([]);
    this.ema50Series.setData([]);
    this.ema200Series.setData([]);
    this.tema5Series.setData([]);
    this.volumeSeries.setData([]);
    this.volumeMaSeries.setData([]);
    this.volumeOscSeries.setData([]);
    
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
  }

  extractData(klinedata, key) {
    return klinedata
      .filter(d => d[key] !== undefined && d[key] !== null)
      .map(d => ({ time: d.time, value: d[key] }));
  }

  updateKline(kline) {
    this.candleseries.update(kline);
    
    // Update each indicator series
    if (kline.ema8) this.ema8Series.update({ time: kline.time, value: kline.ema8 });
    if (kline.ema20) this.ema20Series.update({ time: kline.time, value: kline.ema20 });
    if (kline.ema50) this.ema50Series.update({ time: kline.time, value: kline.ema50 });
    if (kline.ema200) this.ema200Series.update({ time: kline.time, value: kline.ema200 });
    if (kline.tema5) this.tema5Series.update({ time: kline.time, value: kline.tema5 });
    
    // Update volume data
    const volumeColor = kline.close > kline.open ? '#26a69a' : '#ef5350';
    this.volumeSeries.update({
      time: kline.time,
      value: kline.volume,
      color: volumeColor
    });
    
    if (kline.volumeMa) this.volumeMaSeries.update({ time: kline.time, value: kline.volumeMa });
    if (kline.volumeOsc) this.volumeOscSeries.update({ time: kline.time, value: kline.volumeOsc });
  }
}