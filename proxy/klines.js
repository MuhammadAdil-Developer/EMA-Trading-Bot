import got from "got";
import WebSocket from "ws";
import { EMA } from "@debut/indicators";
import { TEMA } from "./tema-indicator.js";
import Stocks from "stocks.js";

class BinanceKlineWS {

  constructor(symbol = "TSLA", interval = "1h") {
    this.symbol = symbol.toUpperCase();
    this.interval = interval;
    this.klines = new Map();
    this.ws = null;
    
    console.log(`Initializing Klines with symbol: ${this.symbol}, interval: ${this.interval}`);
      
    // Alpha Vantage API key
    // You'll need to replace this with a valid key from https://www.alphavantage.co/support/#api-key
    this.alphaVantageKey = "ZGRCTLWEPQM3W5MO";
    
    // Initialize stocks.js library
    try {
      this.stocksApi = new Stocks(this.alphaVantageKey);
    } catch (error) {
      console.error("Error initializing stocks.js:", error);
      // Fallback to a default key if needed
      this.stocksApi = new Stocks("demo");
    }

    // Initialize indicators
    this.ema8 = new EMA(8);
    this.ema20 = new EMA(20);
    this.ema50 = new EMA(50);
    this.ema200 = new EMA(200);
    this.tema5 = new TEMA(5);
    this.volumeMa = new EMA(20);
    this.volumeOscillator = {
      shortEma: new EMA(10),
      longEma: new EMA(20),
      getValue: function(volume) {
        const short = this.shortEma.nextValue(volume);
        const long = this.longEma.nextValue(volume);
        return short && long ? ((short - long) / long) * 100 : null;
      }
    };

    this.initialize();
  }

  async initialize() {
    try {
      // Close existing WebSocket if it exists
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      // Clear existing data
      this.klines.clear();
      
      // Reset indicators
      this.ema8 = new EMA(8);
      this.ema20 = new EMA(20);
      this.ema50 = new EMA(50);
      this.ema200 = new EMA(200);
      this.tema5 = new TEMA(5);
      this.volumeMa = new EMA(20);
      this.volumeOscillator = {
        shortEma: new EMA(10),
        longEma: new EMA(20),
        getValue: function(volume) {
          const short = this.shortEma.nextValue(volume);
          const long = this.longEma.nextValue(volume);
          return short && long ? ((short - long) / long) * 100 : null;
        }
      };
  
      // Show loading message
      console.log(`Loading data for ${this.symbol} (${this.interval})...`);
      
      // Determine if this is a crypto or stock symbol
      const isCrypto = this.symbol.endsWith('USDT') || 
                       this.symbol.endsWith('BUSD') || 
                       this.symbol.endsWith('BTC');
      
      let klineData;
      
      try {
        if (isCrypto) {
          // For crypto, use Binance API
          const binanceUrl = `https://api.binance.us/api/v3/klines?symbol=${this.symbol}&interval=${
            this.interval
          }&limit=1000`;
          
          console.log(`Fetching Binance data for ${this.symbol}`);
          const response = await got(binanceUrl).json();
          klineData = response;
        } else {
          // For stocks, use stocks.js library with improved error handling
          console.log(`Fetching stock data for ${this.symbol}`);
          klineData = await this.fetchStockData();
        }
        
        if (!klineData || klineData.length === 0) {
          throw new Error(`No data returned for ${this.symbol}`);
        }
      } catch (error) {
        console.error(`Failed to load data for ${this.symbol}:`, error.message);
        // Create a minimal data set to prevent complete failure
        klineData = this.generateDummyStockData().slice(0, 100);
        console.warn(`Using minimal fallback data set of ${klineData.length} points`);
      }
      
      // Process kline data
      console.log(`Processing ${klineData.length} data points for ${this.symbol}`);
      klineData.forEach((kline, i) => {
        const close = Number(kline[4]);
        const volume = Number(kline[5]);
        
        try {
          const formattedData = {
            time: Math.round(kline[0] / 1000),
            open: Number(kline[1]),
            high: Number(kline[2]),
            low: Number(kline[3]),
            close: close,
            volume: volume,
            ema8: i === klineData.length - 1
              ? this.ema8.momentValue(close)
              : this.ema8.nextValue(close),
            ema20: i === klineData.length - 1
              ? this.ema20.momentValue(close)
              : this.ema20.nextValue(close),
            ema50: i === klineData.length - 1
              ? this.ema50.momentValue(close)
              : this.ema50.nextValue(close),
            ema200: i === klineData.length - 1
              ? this.ema200.momentValue(close)
              : this.ema200.momentValue(close),
            tema5: i === klineData.length - 1
              ? this.tema5.momentValue(close)
              : this.tema5.nextValue(close),
            volumeMa: i === klineData.length - 1
              ? this.volumeMa.momentValue(volume)
              : this.volumeMa.nextValue(volume),
            volumeOsc: this.volumeOscillator.getValue(volume)
          };
          
          this.klines.set(formattedData.time, formattedData);
        } catch (dataError) {
          console.error(`Error processing data point ${i}:`, dataError);
          // Continue with next data point
        }
      });
  
      console.log(`Successfully processed data for ${this.symbol}`);
      
      // Connect to WebSocket for live data if it's a crypto
      if (isCrypto) {
        this.connectWebSocket();
      } else {
        // For stocks, set up a polling mechanism with more reliable interval
        this.startStockDataPolling();
      }
      
    } catch (error) {
      console.error(`Critical error initializing ${this.symbol}:`, error);
      // Try to recover by setting up minimal functionality
      this.startRecoveryMode();
    }
  }
  
  // Add a recovery mode function
  startRecoveryMode() {
    console.warn(`Entering recovery mode for ${this.symbol}`);
    
    // Generate some minimal data to display
    const dummyData = this.generateDummyStockData().slice(0, 100);
    
    // Process dummy data to populate indicators
    dummyData.forEach((kline, i) => {
      try {
        const close = Number(kline[4]);
        const volume = Number(kline[5]);
        
        const formattedData = {
          time: Math.round(kline[0] / 1000),
          open: Number(kline[1]),
          high: Number(kline[2]),
          low: Number(kline[3]),
          close: close,
          volume: volume,
          ema8: this.ema8.nextValue(close),
          ema20: this.ema20.nextValue(close),
          ema50: this.ema50.nextValue(close),
          ema200: this.ema200.nextValue(close),
          tema5: this.tema5.nextValue(close),
          volumeMa: this.volumeMa.nextValue(volume),
          volumeOsc: this.volumeOscillator.getValue(volume)
        };
        
        this.klines.set(formattedData.time, formattedData);
      } catch (e) {
        // Ignore errors in recovery mode
      }
    });
    
    // Set up minimal polling
    this.startStockDataPolling();
  }

  async fetchStockData() {
    try {
      // Convert interval to stocks.js format (keeping your existing code)
      let stocksInterval = this.getStocksInterval();
      
      console.log(`Fetching stock data for ${this.symbol} with interval ${stocksInterval}`);
      
      // Make multiple retries for stock data
      let result = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!result && retryCount < maxRetries) {
        try {
          // Prepare options for the stocks.js library
          const options = {
            symbol: this.symbol.replace('US.', ''), // Remove prefix if present
            interval: stocksInterval,
            amount: 1000 // Fetch maximum amount of data points
          };
          
          result = await this.stocksApi.timeSeries(options);
          
          if (!result || result.length === 0) {
            throw new Error(`No data returned for ${this.symbol} (attempt ${retryCount + 1}/${maxRetries})`);
          }
          
          console.log(`Successfully fetched stock data for ${this.symbol} on attempt ${retryCount + 1}`);
        } catch (retryError) {
          retryCount++;
          console.warn(`Retry ${retryCount}/${maxRetries} failed:`, retryError.message);
          
          if (retryCount < maxRetries) {
            // Wait before retrying (increasing backoff)
            const waitTime = 1000 * retryCount;
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If we still don't have data after all retries
      if (!result || result.length === 0) {
        throw new Error(`Failed to fetch stock data for ${this.symbol} after ${maxRetries} attempts`);
      }
      
      // Transform stocks.js data to our format (your existing transformation code)
      const transformedData = result.map(item => {
        const timestamp = new Date(item.date).getTime();
        return [
          timestamp,                    // Open time
          item.open.toString(),         // Open
          item.high.toString(),         // High
          item.low.toString(),          // Low
          item.close.toString(),        // Close
          item.volume.toString(),       // Volume
          timestamp + this.getIntervalInMs(), // Close time
          '0',                          // Quote asset volume
          0,                            // Number of trades
          '0',                          // Taker buy base asset volume
          '0',                          // Taker buy quote asset volume
          '0'                           // Ignore
        ];
      }).sort((a, b) => a[0] - b[0]); // Sort by timestamp ascending
      
      console.log(`Transformed ${transformedData.length} data points for ${this.symbol}`);
      return transformedData;
    } catch (error) {
      console.error('Error fetching stock data with stocks.js:', error);
      
      // Alternative data source for stocks if Alpha Vantage fails
      try {
        console.log('Attempting to fetch from alternative stock data source...');
        return await this.fetchAlternativeStockData();
      } catch (altError) {
        console.error('Alternative stock data source also failed:', altError);
        
        // Fallback to generating dummy data if all APIs fail
        console.warn('Generating dummy data for testing purposes');
        return this.generateDummyStockData();
      }
    }
  }
  
  // Add a new method for alternative data source
  async fetchAlternativeStockData() {
    // This could be another free API like Yahoo Finance or IEX Cloud
    // For this example, I'll show a simplified Yahoo Finance API call
    try {
      const yahooSymbol = this.symbol.replace('US.', '');
      console.log(`Trying Yahoo Finance API for ${yahooSymbol}...`);
      
      // You would need to implement this API call using got or another HTTP client
      // This is a placeholder for the actual implementation
      const response = await got(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
        searchParams: {
          interval: this.getYahooInterval(),
          range: '1mo' // Get data for the last month
        }
      }).json();
      
      if (!response?.chart?.result?.[0]?.timestamp) {
        throw new Error('Invalid Yahoo Finance response');
      }
      
      const result = response.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      
      // Transform Yahoo data to our format
      const transformedData = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] === null || quote.close[i] === null) continue;
        
        transformedData.push([
          timestamps[i] * 1000,         // Open time (convert to ms)
          quote.open[i].toString(),     // Open
          quote.high[i].toString(),     // High
          quote.low[i].toString(),      // Low
          quote.close[i].toString(),    // Close
          quote.volume[i].toString(),   // Volume
          (timestamps[i] * 1000) + this.getIntervalInMs(), // Close time
          '0',                          // Quote asset volume
          0,                            // Number of trades
          '0',                          // Taker buy base asset volume
          '0',                          // Taker buy quote asset volume
          '0'                           // Ignore
        ]);
      }
      
      console.log(`Got ${transformedData.length} points from Yahoo Finance`);
      return transformedData;
    } catch (error) {
      console.error('Yahoo Finance API failed:', error);
      throw error; // Re-throw to trigger fallback
    }
  }
  
  // Helper for Yahoo interval conversion
  getYahooInterval() {
    switch (this.interval) {
      case '1m': return '1m';
      case '5m': return '5m';
      case '15m': return '15m';
      case '30m': return '30m';
      case '1h': return '1h';
      case '1d': return '1d';
      case '1w': return '1wk';
      case '1M': return '1mo';
      default: return '1h';
    }
  }
  
  // Better dummy data generator
  generateDummyStockData() {
    console.warn('Generating more realistic dummy data for testing');
    
    const dummyData = [];
    const now = Date.now();
    const intervalMs = this.getIntervalInMs();
    
    // Get a realistic starting price based on the symbol
    let basePrice;
    switch(this.symbol) {
      case 'TSLA': basePrice = 250; break;
      case 'AMD': basePrice = 140; break;
      case 'AAPL': basePrice = 170; break;
      case 'MSFT': basePrice = 380; break;
      case 'GOOGL': basePrice = 140; break;
      default: basePrice = 100;
    }
    
    let lastPrice = basePrice;
    let trend = 0;
    
    // Generate 1000 candles of dummy data with realistic price movements
    for (let i = 0; i < 1000; i++) {
      const timestamp = now - ((1000 - i) * intervalMs);
      
      // Adjust trend occasionally to create patterns
      if (i % 20 === 0) {
        trend = (Math.random() - 0.5) * 2; // Random trend between -1 and 1
      }
      
      // Calculate this candle's price movement
      const volatility = basePrice * 0.02; // 2% volatility
      const change = (Math.random() - 0.5 + trend * 0.5) * volatility;
      
      // Calculate OHLC with some randomization
      const open = lastPrice;
      const close = Math.max(0.1, open + change); // Ensure price is positive
      const high = Math.max(open, close) + (Math.random() * volatility * 0.5);
      const low = Math.min(open, close) - (Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      lastPrice = close; // Set for next iteration
      
      dummyData.push([
        timestamp,
        open.toFixed(4),
        high.toFixed(4),
        low.toFixed(4),
        close.toFixed(4),
        volume.toString(),
        timestamp + intervalMs,
        '0',
        0,
        '0',
        '0',
        '0'
      ]);
    }
    
    return dummyData;
  }

  // Helper to convert interval string to milliseconds
  getIntervalInMs() {
    const unit = this.interval.slice(-1);
    const value = parseInt(this.interval);
    
    switch(unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'M': return value * 30 * 24 * 60 * 60 * 1000; // Approximate months
      default: return 60 * 60 * 1000; // default to 1h
    }
  }

  connectWebSocket() {
    this.ws = new WebSocket(
      `wss://stream.binance.us:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`
    );
  
    this.ws.on("open", () => {
      console.log(
        `Connected to Binance WebSocket for ${this.symbol} ${this.interval} klines`
      );
    });
  
    this.ws.on("message", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.e !== "kline") return;
      const kline = parsedData.k;
      const isFinal = kline.x;
      const close = Number(kline.c);
      const volume = Number(kline.v);
      
      const formattedData = {
        time: Math.round(kline.t / 1000),
        open: Number(kline.o),
        high: Number(kline.h),
        low: Number(kline.l),
        close: close,
        volume: volume,
        ema8: isFinal
          ? this.ema8.nextValue(close)
          : this.ema8.momentValue(close),
        ema20: isFinal
          ? this.ema20.nextValue(close)
          : this.ema20.momentValue(close),
        ema50: isFinal
          ? this.ema50.nextValue(close)
          : this.ema50.momentValue(close),
        ema200: isFinal
          ? this.ema200.nextValue(close)
          : this.ema200.momentValue(close),
        tema5: isFinal
          ? this.tema5.nextValue(close)
          : this.tema5.momentValue(close),
        volumeMa: isFinal
          ? this.volumeMa.nextValue(volume)
          : this.volumeMa.momentValue(volume),
        volumeOsc: this.volumeOscillator.getValue(volume)
      };
      
      this.klines.set(formattedData.time, formattedData);
      this.onKline(formattedData);
    });

    this.ws.on("close", () => {
      console.log("Binance WebSocket closed, reconnecting...");
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.ws.close();
    });
  }

  // For stocks, use polling since WebSockets might not be available
  startStockDataPolling() {
    // Clear any existing polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Define polling frequency based on the interval
    let pollingMs;
    switch(this.interval) {
      case '1m': pollingMs = 60 * 1000; break; // 1 minute (Alpha Vantage limit)
      case '5m': pollingMs = 5 * 60 * 1000; break; // 5 minutes
      case '15m': pollingMs = 15 * 60 * 1000; break; // 15 minutes
      case '30m': pollingMs = 30 * 60 * 1000; break; // 30 minutes
      case '1h': pollingMs = 60 * 60 * 1000; break; // 1 hour
      case '4h': pollingMs = 4 * 60 * 60 * 1000; break; // 4 hours
      case '1d': pollingMs = 24 * 60 * 60 * 1000; break; // 1 day
      default: pollingMs = 60 * 60 * 1000; // 1 hour default
    }
    
    console.log(`Setting up polling for ${this.symbol} every ${pollingMs/1000} seconds`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        // Fetch latest data using stocks.js
        const options = {
          symbol: this.symbol.replace('US.', ''),
          interval: this.getStocksInterval(),
          amount: 1
        };
        
        const result = await this.stocksApi.timeSeries(options);
        
        if (!result || result.length === 0) {
          console.warn('No new data received');
          return;
        }
        
        const latestBar = result[0];
        const timestamp = new Date(latestBar.date).getTime();
        
        // Update or create current bar
        const currentBar = {
          time: Math.round(timestamp / 1000),
          open: latestBar.open,
          high: latestBar.high,
          low: latestBar.low,
          close: latestBar.close,
          volume: latestBar.volume,
          ema8: this.ema8.momentValue(latestBar.close),
          ema20: this.ema20.momentValue(latestBar.close),
          ema50: this.ema50.momentValue(latestBar.close),
          ema200: this.ema200.momentValue(latestBar.close),
          tema5: this.tema5.momentValue(latestBar.close),
          volumeMa: this.volumeMa.momentValue(latestBar.volume),
          volumeOsc: this.volumeOscillator.getValue(latestBar.volume)
        };
        
        this.klines.set(currentBar.time, currentBar);
        this.onKline(currentBar);
        
      } catch (error) {
        console.error('Error polling stock data:', error);
      }
    }, pollingMs);
  }

  getStocksInterval() {
    // Convert our interval format to stocks.js interval format
    switch (this.interval) {
      case '1m': return '1min';
      case '5m': return '5min';
      case '15m': return '15min';
      case '30m': return '30min';
      case '1h': return '60min';
      case '1d': return 'daily';
      case '1w': return 'weekly';
      case '1M': return 'monthly';
      default: return '60min';
    }
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  onKline(kline) {
    // This will be overridden when the instance is created
  }

  getKlines() {
    return Array.from(this.klines.values());
  }
}

export default BinanceKlineWS;
