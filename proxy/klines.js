import got from "got";
import WebSocket from "ws";
import { EMA } from "@debut/indicators";
import { TEMA } from "./tema-indicator.js"; // You'll need to implement this

class BinanceKlineWS {
  constructor(symbol = "BTCUSDT", interval = "1h") {
    this.symbol = symbol.toLowerCase();
    this.interval = interval;
    this.klines = new Map();

    // Initialize only the requested indicators
    this.ema8 = new EMA(8);
    this.ema20 = new EMA(20);
    this.ema50 = new EMA(50);
    this.ema200 = new EMA(200);
    this.tema5 = new TEMA(5);
    this.volumeMa = new EMA(20); // Volume MA typically uses 20 period
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
      const response = await got(
        `https://api.binance.com/api/v3/klines?symbol=${this.symbol.toUpperCase()}&interval=${
          this.interval
        }&limit=1000`
      ).json();

      response.forEach((kline, i) => {
        const close = Number(kline[4]);
        const volume = Number(kline[5]);
        
        const formattedData = {
          time: Math.round(kline[0] / 1000),
          open: Number(kline[1]),
          high: Number(kline[2]),
          low: Number(kline[3]),
          close: close,
          volume: volume,
          ema8: i === response.length - 1
            ? this.ema8.momentValue(close)
            : this.ema8.nextValue(close),
          ema20: i === response.length - 1
            ? this.ema20.momentValue(close)
            : this.ema20.nextValue(close),
          ema50: i === response.length - 1
            ? this.ema50.momentValue(close)
            : this.ema50.nextValue(close),
          ema200: i === response.length - 1
            ? this.ema200.momentValue(close)
            : this.ema200.nextValue(close),
          tema5: i === response.length - 1
            ? this.tema5.momentValue(close)
            : this.tema5.nextValue(close),
          volumeMa: i === response.length - 1
            ? this.volumeMa.momentValue(volume)
            : this.volumeMa.nextValue(volume),
          volumeOsc: this.volumeOscillator.getValue(volume)
        };
        
        this.klines.set(formattedData.time, formattedData);
      });

      console.log("Successfully fetched historical klines");
      this.connect();
    } catch (error) {
      console.error("Error fetching historical klines:", error);
    }
  }

  connect() {
    this.ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${this.symbol}@kline_${this.interval}`
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
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.ws.close();
    });
  }

  onKline(kline) {
    // This will be overridden when the instance is created
  }

  getKlines() {
    return Array.from(this.klines.values());
  }
}

export default BinanceKlineWS;