import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import Klines from "./klines.js";
import mongoose from "mongoose";

const PORT = 4000;
const app = express();

// Store reports in memory (or consider moving to MongoDB)
const reports = [];

// CORS middleware
app.use(cors());

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket io proxy
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Connect to MongoDB
await mongoose.connect('mongodb+srv://developeradil9:Juwtb7arssiVj6Dn@cluster0.o41im7s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
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

// Initialize BinanceKlineWS
const binanceKlineWS = new Klines();

// Helper function to classify signal type
function classifySignalType(message) {
  // Implement your signal type classification logic here
  if (!message) return "unknown";
  
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("buy")) return "buy";
  if (lowerMsg.includes("sell")) return "sell";
  if (lowerMsg.includes("hold")) return "hold";
  return "other";
}

// Handle socket.io connections
io.on("connection", (socket) => {
  console.log("A user connected");

  // Send historical klines data to the new client
  socket.emit("kline", binanceKlineWS.getKlines());

  // Listen to real-time kline updates
  binanceKlineWS.onKline = (kline) => {
    socket.emit("kline", kline);
  };

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.use(express.json()); 

app.post("/tradingview-alert", (req, res) => {
  try {
    const alertData = req.body;
    
    if (!alertData) {
      return res.status(400).json({ error: "Empty alert received!" });
    }

    // Instead of using window object, use the data from the alert payload
    // If indicators are sent from TradingView, use them directly
    const currentSymbol = alertData.symbol || "UNKNOWN";
    
    // Create comprehensive report entry
    const reportEntry = {
      timestamp: new Date(),
      symbol: currentSymbol,
      signalType: classifySignalType(alertData.message),
      price: alertData.price || parseFloat(alertData.close) || 0,
      
      // Get indicator values from the request body if available
      ema8: alertData.ema8 || null,
      ema20: alertData.ema20 || null,
      tema5: alertData.tema5 || null,
      volumeOsc: alertData.volumeOsc || null,
      rawData: alertData
    };

    // Store the report
    reports.push(reportEntry);
    
    // Also store in MongoDB
    const alert = new Alert({
      symbol: reportEntry.symbol,
      signalType: reportEntry.signalType,
      price: reportEntry.price,
      ema8: reportEntry.ema8,
      ema20: reportEntry.ema20,
      tema5: reportEntry.tema5,
      volumeOsc: reportEntry.volumeOsc,
      metadata: alertData
    });
    
    alert.save()
      .then(() => console.log("Alert saved to database"))
      .catch(err => console.error("Error saving to database:", err));
    
    // Broadcast to clients
    io.emit("new-report", reportEntry);
    io.emit("tradingview-alert", alertData);

    res.status(200).json({ message: "Alert processed successfully!" });
  } catch (error) {
    console.error("Error processing alert:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get reports with filtering
app.get('/api/reports', (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let filtered = [...reports];
    
    // Filter by signal type
    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.signalType.includes(type));
    }
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(r => new Date(r.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.timestamp) <= end);
    }
    
    res.json(filtered);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Export to CSV
app.get('/api/reports/export/csv', (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let filtered = [...reports];
    
    if (type && type !== 'all') {
      filtered = filtered.filter(r => r.signalType.includes(type));
    }
    
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(r => new Date(r.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter(r => new Date(r.timestamp) <= end);
    }
    
    if (filtered.length === 0) {
      return res.status(404).json({ error: "No reports found with current filters" });
    }
    
    // Create CSV headers
    let csv = "Timestamp,Symbol,Signal Type,Price,EMA8,EMA20,TEMA5,Volume OSC\n";
    
    // Add data rows
    filtered.forEach(report => {
      csv += `"${new Date(report.timestamp).toLocaleString()}","${report.symbol}","${report.signalType}",${report.price ? report.price.toFixed(4) : '0.0000'},${report.ema8 ? report.ema8.toFixed(4) : ''},${report.ema20 ? report.ema20.toFixed(4) : ''},${report.tema5 ? report.tema5.toFixed(4) : ''},${report.volumeOsc ? report.volumeOsc.toFixed(2) : ''}\n`;
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=trading_signals_${new Date().toISOString().slice(0,10)}.csv`);
    
    res.send(csv);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// Delete a report
app.delete('/api/reports/:id', (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const index = reports.findIndex(r => r.timestamp.getTime() === reportId);
    
    if (index === -1) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    reports.splice(index, 1);
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// Webhook endpoint
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({timestamp: -1}).limit(100);
    res.send(alerts);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/api/alerts', async (req, res) => {
  try {
    const alert = new Alert(req.body);
    await alert.save();
    
    // Emit to connected clients
    io.emit('new-alert', alert);
    
    res.status(201).send(alert);
  } catch (err) {
    res.status(500).send(err);
  }
});


