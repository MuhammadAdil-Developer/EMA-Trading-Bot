import { EMA } from "@debut/indicators";

export class TEMA {
  constructor(period) {
    this.ema1 = new EMA(period);
    this.ema2 = new EMA(period);
    this.ema3 = new EMA(period);
  }

  nextValue(value) {
    const ema1 = this.ema1.nextValue(value);
    const ema2 = this.ema2.nextValue(ema1);
    const ema3 = this.ema3.nextValue(ema2);
    
    if (ema1 === undefined || ema2 === undefined || ema3 === undefined) {
      return undefined;
    }
    
    return 3 * ema1 - 3 * ema2 + ema3;
  }

  momentValue(value) {
    const ema1 = this.ema1.momentValue(value);
    const ema2 = this.ema2.momentValue(ema1);
    const ema3 = this.ema3.momentValue(ema2);
    
    if (ema1 === undefined || ema2 === undefined || ema3 === undefined) {
      return undefined;
    }
    
    return 3 * ema1 - 3 * ema2 + ema3;
  }
}