
export interface Asset {
  id: string;
  name: string;
  category: 'Forex' | 'Crypto' | 'Metals' | 'Stocks' | 'Bonds' | 'Binary OTC';
  base: number;
  step: number;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SRZone {
  id: string;
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1 to 5
}

export interface Trendline {
  id: string;
  p1: { index: number; price: number };
  p2: { index: number; price: number };
  color: string;
  label: string;
  isActive: boolean;
}

export interface OrderFlowMetrics {
  delta: number; // -100 to 100
  imbalanceType: 'BUY_SIDE' | 'SELL_SIDE' | 'NONE';
  absorptionDetected: boolean;
  orderStacking: string;
}

export interface AnalysisResult {
  asset: string;
  session: string;
  flowContext: string;
  trend30m: string;
  liquidityTarget: string;
  pricePhase: string;
  manipulationEvidence: string;
  decision: 'CALL' | 'PUT' | 'NO OPERAR';
  entryZone: string;
  confidence: string;
  alternativeScenario: string;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  mode: 'Conservador' | 'Balanceado' | 'Agresivo';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'PANIC' | 'EUPHORIA';
  macroContext: string;
  whaleActivity: string;
  volatilityIndex: number;
  probabilityScore: number;
  orderFlowMetrics: OrderFlowMetrics;
}

export interface MarketState {
  currentPrice: number;
  change: number;
  changePercent: number;
  session: 'LONDON' | 'NEW YORK' | 'ASIA' | 'OVERLAP';
  isAlgorithmicHunt: boolean;
}

export type AlertType = 'APPROACH' | 'SWEEP' | 'ORDER_BLOCK' | 'ROUND_NUMBER' | 'CUSTOM_LEVEL' | 'TRENDLINE';

export interface Alert {
  id: string;
  type: AlertType;
  level: number;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

export interface CustomLiquidityLevel {
  id: string;
  price: number;
  label: string;
  isActive: boolean;
}

export interface CandleVerdict {
  id: string;
  time: string;
  asset: string;
  type: 'COMPRA' | 'VENTA' | 'NEUTRO';
  reason: string;
  confidence: string;
  price: number;
  orderFlowConfirmed: boolean;
}

export interface TradeRecord {
  id: string;
  asset: string;
  type: 'CALL' | 'PUT';
  entryPrice: number;
  exitPrice: number;
  timestamp: string;
  result: 'GANADA' | 'PERDIDA';
  profit: number;
  signalId?: string;
}
