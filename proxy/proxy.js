import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import Klines from "./klines.js";
import mongoose from "mongoose";

import { fileURLToPath } from "url";
import path from "path";

const PORT = 4000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store reports in memory
const reports = [];
let isMongoConnected = false;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/client', express.static(path.join(__dirname, '..', 'client')));

// Routes
app.get('/', (req, res) => {
  res.redirect('/client/index.html');
});

// Alert Schema
const alertSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  symbol: String,
  signalType: String,
  price: Number,
  ema8: Number,
  ema20: Number,
  tema5: Number,
  volumeOsc: Number,
  metadata: Object
});

const Alert = mongoose.model('Alert', alertSchema);
let currentSymbol = "TSLA";
let currentTimeframe = "1h";
let binanceKlineWS = null;

// Initialize BinanceKlineWS
binanceKlineWS = new Klines(currentSymbol, currentTimeframe);


// Helper functions
function classifySignalType(message) {
  if (!message) return "unknown";
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("buy")) return "buy";
  if (lowerMsg.includes("sell")) return "sell";
  if (lowerMsg.includes("hold")) return "hold";
  return "other";
}

function filterReports(reports, type, startDate, endDate) {
  let filtered = [...reports];
  if (type && type !== 'all') filtered = filtered.filter(r => r.signalType.includes(type));
  if (startDate) filtered = filtered.filter(r => new Date(r.timestamp) >= new Date(startDate));
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(r => new Date(r.timestamp) <= end);
  }
  return filtered;
}

async function connectToMongoDB() {
  try {
    await mongoose.connect('mongodb+srv://developeradil9:Juwtb7arssiVj6Dn@cluster0.o41im7s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    isMongoConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    isMongoConnected = false;
    console.warn('MongoDB connection warning:', error.message);
    console.log('Running in memory-only mode');
  }
}

async function saveAlertToMongo(reportEntry) {
  if (!isMongoConnected) return false;
  
  try {
    const alert = new Alert(reportEntry);
    await alert.save();
    return true;
  } catch (error) {
    console.error('Failed to save alert to MongoDB:', error.message);
    return false;
  }
}

async function startServer() {
  // Attempt MongoDB connection
  await connectToMongoDB();

  // Start Express server first
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Then initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*", // Or specify your client origin
      methods: ["GET", "POST"]
    }
  });

  // Initialize BinanceKlineWS with TSLA
  binanceKlineWS = new Klines(currentSymbol, currentTimeframe);

  // Update the socket connection handler
  io.on("connection", (socket) => {
    console.log("A user connected");
    
    // Show loader message for initial data
    console.log(`Sending initial ${currentSymbol} data...`);
    
    // Send initial data
    socket.emit("kline", binanceKlineWS.getKlines());
    
    socket.on("symbol-change", async (symbol) => {
      console.log(`Symbol changed to: ${symbol}`);
      currentSymbol = symbol;
      
      // Clean up the old connection
      if (binanceKlineWS) {
        binanceKlineWS.cleanup();
      }
      
      // Create a new instance
      binanceKlineWS = new Klines(currentSymbol, currentTimeframe);
      
      // Set up the onKline handler before anything else
      binanceKlineWS.onKline = (kline) => {
        socket.emit("kline", kline);
      };
      
      // For stock symbols, we need a longer timeout
      const isStock = !(symbol.endsWith('USDT') || symbol.endsWith('BUSD') || symbol.endsWith('BTC'));
      const initTimeout = isStock ? 3000 : 1000;
      
      // Wait for initialization before sending data
      console.log(`Waiting ${initTimeout}ms for ${symbol} data initialization...`);
      await new Promise(resolve => setTimeout(resolve, initTimeout));
      
      // Send the current data to the client
      const klines = binanceKlineWS.getKlines();
      
      if (klines.length === 0) {
        console.warn(`No klines available for ${symbol}, retrying...`);
        // Try again with a longer timeout
        setTimeout(() => {
          const retryKlines = binanceKlineWS.getKlines();
          console.log(`Retry: Sending ${retryKlines.length} klines to client for ${symbol}`);
          socket.emit("kline", retryKlines);
        }, 5000);
      } else {
        console.log(`Sending ${klines.length} klines to client for ${symbol}`);
        socket.emit("kline", klines);
      }
    });
  
    socket.on("timeframe-change", async (data) => {
      try {
        // Ensure we have both symbol and timeframe
        if (!data || (typeof data === 'object' && (!data.symbol || !data.timeframe))) {
          console.error("Invalid timeframe change request:", data);
          socket.emit("timeframe_error", "Invalid timeframe change request");
          // REMOVE: hideLoader();
          return;
        }
        
        // Extract symbol and timeframe
        const symbol = typeof data === 'object' ? data.symbol : currentSymbol;
        const timeframe = typeof data === 'object' ? data.timeframe : data;
        
        console.log(`Timeframe changed to: ${timeframe} for symbol: ${symbol}`);
        currentSymbol = symbol;
        currentTimeframe = timeframe;
        
        // Clean up the old connection
        if (binanceKlineWS) {
          binanceKlineWS.cleanup();
        }
        
        // Create a new instance with the new timeframe
        binanceKlineWS = new Klines(currentSymbol, currentTimeframe);
        
        // Set up the onKline handler
        binanceKlineWS.onKline = (kline) => {
          socket.emit("kline", kline);
        };
        
        // For stock symbols, we need a longer timeout
        const isStock = !(symbol.endsWith('USDT') || symbol.endsWith('BUSD') || symbol.endsWith('BTC'));
        const initTimeout = isStock ? 3000 : 1000;
        
        // Wait for initialization before sending data
        console.log(`Waiting ${initTimeout}ms for ${symbol}/${timeframe} data initialization...`);
        await new Promise(resolve => setTimeout(resolve, initTimeout));
        
        // Send the current data to the client
        const klines = binanceKlineWS.getKlines();
        if (klines && klines.length > 0) {
          const sortedKlines = [...klines].sort((a, b) => a.time - b.time);
          socket.emit("kline", sortedKlines);
        } else {
          socket.emit("timeframe_error", `No data available for ${timeframe} timeframe`);
        }
      } catch (error) {

        console.error(`Error processing timeframe change:`, error);
        // REMOVE: hideLoader();
        socket.emit("timeframe_error", error.message);
      }
    });
     
    
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
  


  


  // TradingView Alert Endpoint
  app.post("/tradingview-alert", async (req, res) => {
    try {
      const alertData = req.body;
      
      if (!alertData) {
        return res.status(400).json({ error: "Empty alert received!" });
      }

      const reportEntry = {
        timestamp: new Date(),
        symbol: alertData.symbol || "UNKNOWN",
        signalType: classifySignalType(alertData.message),
        price: alertData.price || parseFloat(alertData.close) || 0,
        ema8: alertData.ema8 || null,
        ema20: alertData.ema20 || null,
        tema5: alertData.tema5 || null,
        volumeOsc: alertData.volumeOsc || null,
        rawData: alertData
      };

      reports.push(reportEntry);
      
      // Try to save to MongoDB if available
      if (isMongoConnected) {
        await saveAlertToMongo(reportEntry);
      }
      
      io.emit("new-report", reportEntry);
      io.emit("tradingview-alert", alertData);

      res.status(200).json({ message: "Alert processed successfully!" });
    } catch (error) {
      console.error("Error processing alert:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Endpoints
  app.get('/api/reports', (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      let filtered = filterReports(reports, type, startDate, endDate);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get('/api/reports/export/csv', (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      let filtered = filterReports(reports, type, startDate, endDate);
      
      if (filtered.length === 0) {
        return res.status(404).json({ error: "No reports found" });
      }
      
      let csv = "Timestamp,Symbol,Signal Type,Price,EMA8,EMA20,TEMA5,Volume OSC\n";
      filtered.forEach(report => {
        csv += `${report.timestamp.toISOString()},"${report.symbol}","${report.signalType}",${
          (report.price && report.price.toFixed(4)) || '0.0000'
        },${
          (report.ema8 && report.ema8.toFixed(4)) || ''
        },${
          (report.ema20 && report.ema20.toFixed(4)) || ''
        },${
          (report.tema5 && report.tema5.toFixed(4)) || ''
        },${
          (report.volumeOsc && report.volumeOsc.toFixed(2)) || ''
        }\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=trading_signals_${new Date().toISOString().slice(0,10)}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  app.get('/api/alerts', async (req, res) => {
    try {
      if (isMongoConnected) {
        const alerts = await Alert.find().sort({timestamp: -1}).limit(100);
        return res.send(alerts);
      }
      // Fallback to in-memory data
      res.send(reports.slice(0, 100).sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error("Error fetching alerts:", err);
      res.send(reports.slice(0, 100).sort((a, b) => b.timestamp - a.timestamp));
    }
  });

  console.log(`Server successfully started on port ${PORT}`);
}

// Start the application
startServer().catch(err => {
  console.error('Failed to start server:', err);
});



// Simplified endpoint that doesn't use Puppeteer
app.post('/prepare-tradingview', async (req, res) => {
  const { symbol = 'BTCUSDT', timeframe = '1h', pineScript = '' } = req.body;
  
  try {
    // You can still do some processing here if needed
    console.log('[SERVER] Preparing TradingView export for:', { symbol, timeframe });
    
    // Return success with trading view URL 
    res.json({ 
      success: true, 
      message: 'TradingView export prepared',
      chartUrl: 'https://www.tradingview.com/chart/',
      symbol,
      timeframe
    });
  } catch (error) {
    console.error('[SERVER] Export preparation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Export preparation failed',
      error: error.message
    });
  }

});
