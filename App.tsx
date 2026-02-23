
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeMarket, analyzeImageMarket } from './geminiService';
import { Candle, AnalysisResult, Alert, CustomLiquidityLevel, CandleVerdict, TradeRecord, Asset, SRZone } from './types';
import TradingChart from './components/TradingChart';
import AlertSystem, { AlertConfig } from './components/AlertSystem';
import TradeHistory from './components/TradeHistory';

type Theme = 'dark' | 'light';

const ASSETS: Asset[] = [
  // Forex
  { id: 'EURUSD', name: 'EUR/USD', category: 'Forex', base: 1.08542, step: 0.00015 },
  { id: 'GBPUSD', name: 'GBP/USD', category: 'Forex', base: 1.26418, step: 0.00018 },
  { id: 'USDJPY', name: 'USD/JPY', category: 'Forex', base: 151.452, step: 0.025 },
  { id: 'AUDUSD', name: 'AUD/USD', category: 'Forex', base: 0.65412, step: 0.00012 },
  { id: 'EURGBP', name: 'EUR/GBP', category: 'Forex', base: 0.85412, step: 0.00010 },
  // Crypto
  { id: 'BTCUSD', name: 'BTC/USD', category: 'Crypto', base: 67250.00, step: 45.00 },
  { id: 'ETHUSD', name: 'ETH/USD', category: 'Crypto', base: 3450.00, step: 2.50 },
  { id: 'SOLUSD', name: 'SOL/USD', category: 'Crypto', base: 145.00, step: 0.15 },
  // Binary OTC
  { id: 'EURUSD_OTC', name: 'EUR/USD OTC', category: 'Binary OTC', base: 1.08500, step: 0.00015 },
  { id: 'GBPUSD_OTC', name: 'GBP/USD OTC', category: 'Binary OTC', base: 1.26400, step: 0.00018 },
  // Stocks
  { id: 'AAPL', name: 'Apple Inc.', category: 'Stocks', base: 185.50, step: 0.25 },
  { id: 'TSLA', name: 'Tesla Inc.', category: 'Stocks', base: 175.20, step: 0.40 },
  { id: 'NVDA', name: 'NVIDIA Corp.', category: 'Stocks', base: 820.50, step: 1.50 },
  // Metals
  { id: 'XAUUSD', name: 'Oro (Gold)', category: 'Metals', base: 2345.50, step: 0.85 },
  { id: 'XAGUSD', name: 'Plata (Silver)', category: 'Metals', base: 28.50, step: 0.05 },
];

const TIMEFRAMES = [
  { id: '30s', label: '30S', multiplier: 0.1, ms: 30000 },
  { id: '1m', label: '1M', multiplier: 0.2, ms: 60000 },
  { id: '5m', label: '5M', multiplier: 1, ms: 300000 },
  { id: '10m', label: '10M', multiplier: 1.5, ms: 600000 },
  { id: '30m', label: '30M', multiplier: 3, ms: 1800000 },
  { id: '1h', label: '1H', multiplier: 5, ms: 3600000 },
  { id: '4h', label: '4H', multiplier: 10, ms: 14400000 },
  { id: '1d', label: '1D', multiplier: 30, ms: 86400000 },
  { id: '1w', label: '1W', multiplier: 120, ms: 604800000 },
  { id: '1mo', label: '1MO', multiplier: 480, ms: 2592000000 },
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nexus_theme') as Theme) || 'dark');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[2]); 
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [clockTime, setClockTime] = useState<string>('--:--:--');
  const [livePrice, setLivePrice] = useState<number>(selectedAsset.base);
  const [priceTickColor, setPriceTickColor] = useState<string>('text-blue-400');
  const [autoZones, setAutoZones] = useState<SRZone[]>([]);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  
  const [verdicts, setVerdicts] = useState<CandleVerdict[]>(() => {
    const saved = localStorage.getItem('nexus_signal_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(() => {
    const saved = localStorage.getItem('nexus_trade_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [customLevels, setCustomLevels] = useState<CustomLiquidityLevel[]>(() => {
    const saved = localStorage.getItem('nexus_custom_levels');
    return saved ? JSON.parse(saved) : [];
  });
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(() => {
    const saved = localStorage.getItem('nexus_alert_config');
    return saved ? JSON.parse(saved) : { showRoundNumbers: true, showSweeps: true, showOrderBlocks: true, sensitivity: 2 };
  });

  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const precision = selectedAsset.id.includes('JPY') ? 3 : (selectedAsset.id.includes('BTC') || selectedAsset.id.includes('ETH')) ? 2 : 5;

  const currentCandlesRef = useRef<Candle[]>([]);
  useEffect(() => { currentCandlesRef.current = candles; }, [candles]);

  const handleRunAnalysis = useCallback(async (isAuto = false) => {
    if (isAnalyzing || currentCandlesRef.current.length < 10) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeMarket(currentCandlesRef.current, selectedAsset.name, 'Agresivo');
      setAnalysis(result);
      const lastCandle = currentCandlesRef.current[currentCandlesRef.current.length - 1];
      const newVerdict: CandleVerdict = {
        id: Date.now().toString(), 
        time: lastCandle.time, 
        asset: selectedAsset.id, 
        type: result.decision === 'CALL' ? 'COMPRA' : result.decision === 'PUT' ? 'VENTA' : 'NEUTRO', 
        reason: result.manipulationEvidence || result.flowContext.split('.')[0], 
        confidence: result.confidence, 
        price: lastCandle.close,
        orderFlowConfirmed: Math.abs(result.orderFlowMetrics.delta) > 40
      };
      setVerdicts(p => [newVerdict, ...p].slice(0, 100));
    } catch (err) { 
      console.error("Nexus Core Failure:", err); 
    } finally { 
      setIsAnalyzing(false); 
    }
  }, [selectedAsset.name, selectedAsset.id, isAnalyzing]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const updateSRZones = useCallback((currentCandles: Candle[]) => {
    if (currentCandles.length < 20) return;
    const pivots: { price: number; type: 'high' | 'low' }[] = [];
    const threshold = selectedAsset.step * 10;

    for (let i = 2; i < currentCandles.length - 2; i++) {
      if (currentCandles[i].high > currentCandles[i-1].high && currentCandles[i].high > currentCandles[i+1].high) {
        pivots.push({ price: currentCandles[i].high, type: 'high' });
      }
      if (currentCandles[i].low < currentCandles[i-1].low && currentCandles[i].low < currentCandles[i+1].low) {
        pivots.push({ price: currentCandles[i].low, type: 'low' });
      }
    }

    const zones: SRZone[] = [];
    pivots.forEach(p => {
      const existing = zones.find(z => Math.abs(z.price - p.price) < threshold);
      if (existing) {
        existing.strength = Math.min(existing.strength + 1, 5);
        existing.price = (existing.price + p.price) / 2;
      } else {
        zones.push({ id: `auto-${Math.random()}`, price: p.price, type: p.type === 'high' ? 'resistance' : 'support', strength: 1 });
      }
    });
    setAutoZones(zones.filter(z => z.strength >= 2).slice(-12));
  }, [selectedAsset.step]);

  useEffect(() => {
    const generateInitialData = () => {
      const data: Candle[] = [];
      let lastPrice = selectedAsset.base;
      const now = Date.now();
      for (let i = 120; i >= 0; i--) {
        const time = new Date(now - i * selectedTimeframe.ms);
        const open = lastPrice;
        const volatility = selectedAsset.step * selectedTimeframe.multiplier * 3;
        const close = open + (Math.random() - 0.5) * volatility;
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          open, high: Math.max(open, close) + Math.random() * volatility * 0.3, low: Math.min(open, close) - Math.random() * volatility * 0.3, close, volume: Math.random() * 12000
        });
        lastPrice = close;
      }
      setCandles(data);
      setLivePrice(lastPrice);
      updateSRZones(data);
      setTimeLeft(selectedTimeframe.ms / 1000);
    };
    generateInitialData();
  }, [selectedAsset, selectedTimeframe, updateSRZones]);

  useEffect(() => {
    const tickInterval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const tfMultiplier = selectedTimeframe.multiplier;
        const volatility = selectedAsset.step * tfMultiplier * 0.5;
        const change = (Math.random() - 0.5) * volatility;
        const newClose = last.close + change;
        
        setLivePrice(newClose);
        setPriceTickColor(newClose > last.close ? 'text-green-400' : 'text-red-400');
        
        const next = [...prev];
        next[next.length - 1] = { 
          ...last, 
          close: newClose, 
          high: Math.max(last.high, newClose), 
          low: Math.min(last.low, newClose) 
        };
        return next;
      });

      setTimeLeft(prev => {
        if (prev <= 1) {
          if (autoAnalyze) handleRunAnalysis(true);
          
          setCandles(curr => {
            const last = curr[curr.length - 1];
            const open = last.close;
            const newCandle: Candle = {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              open, high: open, low: open, close: open, volume: Math.random() * 6000 + 3000
            };
            const nextCandles = [...curr, newCandle].slice(-150);
            updateSRZones(nextCandles);
            return nextCandles;
          });
          return selectedTimeframe.ms / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [selectedAsset, selectedTimeframe, updateSRZones, autoAnalyze, handleRunAnalysis]);

  useEffect(() => {
    localStorage.setItem('nexus_theme', theme);
    localStorage.setItem('nexus_trade_history', JSON.stringify(tradeHistory));
    localStorage.setItem('nexus_signal_history', JSON.stringify(verdicts));
    localStorage.setItem('nexus_custom_levels', JSON.stringify(customLevels));
    localStorage.setItem('nexus_alert_config', JSON.stringify(alertConfig));
  }, [theme, tradeHistory, verdicts, customLevels, alertConfig]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      setIsCameraActive(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { 
          videoRef.current.srcObject = s; 
          setIsCameraActive(true); 
        }
      } catch (err) { 
        alert("Nexus Vision: Cámara no accesible."); 
      }
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAnalyzing(true);
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    const b64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
    
    if (videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
    
    try {
      const result = await analyzeImageMarket(b64, selectedAsset.name, 'Agresivo');
      setAnalysis(result);
      setVerdicts(p => [{
        id: `img-${Date.now()}`, 
        time: clockTime, 
        asset: selectedAsset.id, 
        type: result.decision === 'CALL' ? 'COMPRA' : result.decision === 'PUT' ? 'VENTA' : 'NEUTRO', 
        reason: "Escaneo Visual: " + (result.manipulationEvidence?.substring(0, 100) || "Captura Procesada"),
        confidence: result.confidence, 
        price: livePrice,
        orderFlowConfirmed: result.orderFlowMetrics.absorptionDetected || Math.abs(result.orderFlowMetrics.delta) > 50
      }, ...p].slice(0, 100));
    } catch (err) { 
      alert("Nexus Vision Error."); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleExecuteTrade = useCallback((type: 'CALL' | 'PUT', signalId?: string) => {
    const entryPrice = livePrice;
    const isWin = Math.random() > 0.38;
    const priceDiff = selectedAsset.step * (5 + Math.random() * 15);
    const exitPrice = isWin 
      ? (type === 'CALL' ? entryPrice + priceDiff : entryPrice - priceDiff)
      : (type === 'CALL' ? entryPrice - priceDiff : entryPrice + priceDiff);
    
    const newTrade: TradeRecord = {
      id: Date.now().toString(),
      asset: selectedAsset.id,
      type,
      entryPrice,
      exitPrice,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      result: isWin ? 'GANADA' : 'PERDIDA',
      profit: isWin ? 88 : -100,
      signalId
    };

    setTradeHistory(prev => [newTrade, ...prev].slice(0, 100));
  }, [livePrice, selectedAsset]);

  const categories = Array.from(new Set(ASSETS.map(a => a.category)));

  return (
    <div id="root-wrapper" className={`theme-${theme} flex flex-col h-screen overflow-hidden select-none`}>
      <header className="h-16 border-b themed-border flex items-center justify-between px-8 bg-slate-950/95 shrink-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
          <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">Nexus <span className="text-blue-500 italic">Global Intelligence</span></h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] mono text-gray-500 font-bold uppercase tracking-[0.2em]">Surgical Terminal v4.5</span>
               <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
               <span className="text-[11px] mono font-black text-blue-400/80">{clockTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
             <div className="flex items-center gap-3 px-2">
               <select 
                value={selectedAsset.id} 
                onChange={(e) => setSelectedAsset(ASSETS.find(a => a.id === e.target.value)!)} 
                className="bg-transparent text-[11px] font-black uppercase text-gray-300 outline-none cursor-pointer hover:text-white transition-colors"
               >
                {categories.map(cat => (
                  <optgroup key={cat} label={cat} className="bg-slate-900 text-slate-500 font-bold uppercase">
                    {ASSETS.filter(a => a.category === cat).map(a => <option key={a.id} value={a.id} className="bg-slate-900 text-gray-300">{a.name}</option>)}
                  </optgroup>
                ))}
               </select>
             </div>
          </div>

          {/* Timeframe Selector Refined */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
             <div className="flex items-center gap-0.5">
               {TIMEFRAMES.map(tf => (
                 <button 
                  key={tf.id}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-200 ${selectedTimeframe.id === tf.id ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                 >
                   {tf.label}
                 </button>
               ))}
             </div>
          </div>

          <div className="flex items-center bg-slate-900/80 px-6 py-2.5 rounded-2xl border border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.3)] min-w-[140px] justify-center">
             <span className={`text-2xl mono font-black tracking-tighter transition-all duration-300 ${priceTickColor} flex items-center gap-2`}>
                {livePrice.toFixed(precision)}
                <span className="text-[14px]">{priceTickColor === 'text-green-400' ? '▲' : '▼'}</span>
             </span>
          </div>

          <div className="flex gap-2 ml-2">
            <button 
              onClick={() => setAutoAnalyze(!autoAnalyze)} 
              className={`px-4 py-2.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${autoAnalyze ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${autoAnalyze ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></div>
              AUTO-IA
            </button>
            <button 
              onClick={toggleCamera} 
              className={`px-5 py-2.5 border rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group ${isCameraActive ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-slate-900 border-blue-500/40 text-blue-400 hover:bg-blue-600/10'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              {isCameraActive ? 'DETENER LENTE' : 'VISIÓN IA'}
            </button>
            <button onClick={() => handleRunAnalysis()} disabled={isAnalyzing} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 active:scale-95 transition-all">
              {isAnalyzing ? 'PROCESANDO...' : 'EJECUTAR'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-950">
        {isCameraActive && (
          <div className="absolute inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center backdrop-blur-3xl animate-in fade-in duration-500">
             <div className="w-[1100px] relative aspect-[16/9] rounded-[40px] overflow-hidden border-4 border-blue-500/20 shadow-[0_0_100px_rgba(59,130,246,0.3)] bg-slate-900">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-[70%] border-2 border-blue-500/10 rounded-[30px] relative">
                     <div className="absolute top-0 left-0 w-20 h-20 border-t-8 border-l-8 border-blue-500 rounded-tl-3xl -m-3"></div>
                     <div className="absolute top-0 right-0 w-20 h-20 border-t-8 border-r-8 border-blue-500 rounded-tr-3xl -m-3"></div>
                     <div className="absolute bottom-0 left-0 w-20 h-20 border-b-8 border-l-8 border-blue-500 rounded-bl-3xl -m-3"></div>
                     <div className="absolute bottom-0 right-0 w-20 h-20 border-b-8 border-r-8 border-blue-500 rounded-br-3xl -m-3"></div>
                     <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan shadow-[0_0_25px_#3b82f6]"></div>
                  </div>
               </div>
               <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
                 <button onClick={toggleCamera} className="px-14 py-6 bg-slate-900/80 border-2 border-slate-700 text-slate-400 hover:text-red-400 rounded-3xl font-black uppercase tracking-widest transition-all">CANCELAR</button>
                 <button onClick={captureAndAnalyze} className="px-28 py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-2xl uppercase tracking-[0.2em] shadow-[0_0_80px_rgba(37,99,235,0.7)] active:scale-95 flex items-center gap-6 transition-all">
                   ESCANEADO QUIRÚRGICO
                 </button>
               </div>
             </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex-[4] flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 h-[65%] shrink-0">
            <TradingChart candles={candles} verdicts={verdicts} type="line" title="FLUJO INSTITUCIONAL" precision={precision} timeLeft={timeLeft} autoZones={autoZones} priceColorClass={priceTickColor} />
            <TradingChart candles={candles} verdicts={verdicts} type="candle" title="ESTRUCTURA DE MERCADO" precision={precision} timeLeft={timeLeft} autoZones={autoZones} priceColorClass={priceTickColor} />
          </div>
          <div className="grid grid-cols-4 gap-4 flex-grow shrink-0">
             <div className="col-span-2 themed-bg-secondary border themed-border rounded-2xl p-4 overflow-hidden flex flex-col shadow-2xl">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">HISTORIAL DE SEÑALES NEXUS</span>
                <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                   {verdicts.map((v) => (
                     <div key={v.id} className={`min-w-[220px] p-4 rounded-2xl border-2 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-default ${v.type === 'COMPRA' ? 'bg-green-500/5 border-green-500/20' : v.type === 'VENTA' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/20 border-slate-700/30'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[9px] mono font-bold opacity-60 text-slate-400">{v.time}</span>
                          {v.orderFlowConfirmed && (
                            <span className="text-[7px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-[0_0_8px_rgba(8,145,178,0.5)] animate-pulse">OF CONFIRMED</span>
                          )}
                        </div>
                        <span className={`text-[17px] font-black tracking-tighter ${v.type === 'COMPRA' ? 'text-green-400' : v.type === 'VENTA' ? 'text-red-400' : 'text-slate-400'}`}>{v.type} @ {v.price.toFixed(precision)}</span>
                        <p className="text-[9px] text-slate-500 font-bold mt-2 leading-tight line-clamp-2 uppercase italic">"{v.reason}"</p>
                        <button onClick={() => handleExecuteTrade(v.type === 'COMPRA' ? 'CALL' : 'PUT', v.id)} className="mt-4 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-[10px] font-black text-blue-400 transition-all border border-slate-700 uppercase">Ejecutar</button>
                     </div>
                   ))}
                </div>
             </div>
             <div className="col-span-2 overflow-hidden themed-bg-secondary rounded-2xl border themed-border shadow-2xl">
                <TradeHistory trades={tradeHistory} onClear={() => setTradeHistory([])} precision={precision} />
             </div>
          </div>
        </div>

        <aside className="flex-[1.8] flex flex-col gap-4 min-w-[420px]">
          <div className="flex-[1] overflow-hidden">
            <AlertSystem alerts={alerts} onClear={() => setAlerts([])} config={alertConfig} onConfigChange={setAlertConfig} customLevels={customLevels} onAddCustomLevel={l => setCustomLevels(p => [...p, {...l, id: Date.now().toString(), isActive: true}])} onRemoveCustomLevel={id => setCustomLevels(p => p.filter(l => l.id !== id))} precision={precision} />
          </div>
          <div className="flex-[3.5] themed-bg-secondary rounded-[40px] border themed-border overflow-y-auto p-7 relative shadow-inner custom-scrollbar bg-gradient-to-b from-slate-900/10 to-transparent">
             {isAnalyzing ? (
               <div className="h-full flex flex-col items-center justify-center space-y-8 animate-pulse">
                  <div className="w-32 h-32 border-[14px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.3)]"></div>
                  <div className="text-center">
                    <p className="text-[20px] font-black text-blue-400 uppercase tracking-[0.6em]">SCANNING ORDER FLOW</p>
                    <p className="text-[12px] text-slate-500 font-bold uppercase mt-4 tracking-widest">Leyendo Delta e Imbalances Bancarios...</p>
                  </div>
               </div>
             ) : analysis ? (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-700">
                  {/* Order Flow Analytics Panel */}
                  <div className="p-6 bg-slate-900/80 rounded-[35px] border border-blue-500/20 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3">
                       <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                    </div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-4 block">Order Flow Diagnostics</span>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-500 uppercase">Market Delta</span>
                         <span className={`text-[12px] mono font-black ${analysis.orderFlowMetrics.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {analysis.orderFlowMetrics.delta > 0 ? '+' : ''}{analysis.orderFlowMetrics.delta}
                         </span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full transition-all duration-1000 ${analysis.orderFlowMetrics.delta > 0 ? 'bg-green-500 ml-1/2' : 'bg-red-500 mr-1/2 ml-auto'}`}
                            style={{ width: `${Math.abs(analysis.orderFlowMetrics.delta) / 2}%` }}
                          ></div>
                       </div>

                       <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className={`p-3 rounded-2xl border ${analysis.orderFlowMetrics.imbalanceType !== 'NONE' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/40 border-slate-700'}`}>
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Imbalance</span>
                             <span className="text-[10px] font-black text-white uppercase">{analysis.orderFlowMetrics.imbalanceType}</span>
                          </div>
                          <div className={`p-3 rounded-2xl border ${analysis.orderFlowMetrics.absorptionDetected ? 'bg-magenta-500/10 border-magenta-500/30' : 'bg-slate-800/40 border-slate-700'}`}>
                             <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Absorption</span>
                             <span className={`text-[10px] font-black uppercase ${analysis.orderFlowMetrics.absorptionDetected ? 'text-magenta-400' : 'text-slate-500'}`}>
                               {analysis.orderFlowMetrics.absorptionDetected ? 'DETECTED' : 'NONE'}
                             </span>
                          </div>
                       </div>
                       
                       <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                          <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Stacking Strategy</span>
                          <p className="text-[10px] font-bold text-slate-300 italic">"{analysis.orderFlowMetrics.orderStacking}"</p>
                       </div>
                    </div>
                  </div>

                  <div className={`p-8 rounded-[45px] border-l-[25px] border-2 shadow-2xl ${analysis.decision === 'CALL' ? 'bg-green-500/5 border-green-500/20 border-l-green-500' : analysis.decision === 'PUT' ? 'bg-red-500/5 border-red-500/20 border-l-red-500' : 'bg-slate-800/30 border-slate-700 border-l-slate-600'}`}>
                     <div className="flex justify-between items-start mb-6">
                        <span className="text-[12px] font-black uppercase tracking-widest opacity-50 italic">Nexus Decision Engine</span>
                        <div className="flex flex-col items-end">
                           <span className="text-[11px] mono font-black text-blue-500 bg-blue-500/10 px-4 py-1.5 rounded-full">CONF: {analysis.confidence}</span>
                           <span className="text-[10px] font-black text-slate-500 mt-1 uppercase">Score: {(analysis.probabilityScore * 100).toFixed(1)}</span>
                        </div>
                     </div>
                     <h2 className={`text-9xl font-black italic tracking-tighter mb-10 leading-none ${analysis.decision === 'CALL' ? 'text-green-400' : analysis.decision === 'PUT' ? 'text-red-400' : 'text-gray-400'}`}>{analysis.decision}</h2>
                     <div className="grid grid-cols-2 gap-5">
                        <button onClick={() => handleExecuteTrade('CALL')} className="py-7 bg-green-600 hover:bg-green-500 text-white rounded-[25px] font-black text-lg uppercase tracking-widest transition-all shadow-lg active:scale-95">CALL</button>
                        <button onClick={() => handleExecuteTrade('PUT')} className="py-7 bg-red-600 hover:bg-red-500 text-white rounded-[25px] font-black text-lg uppercase tracking-widest transition-all shadow-lg active:scale-95">PUT</button>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-inner">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">SENTIMIENTO</span>
                        <span className={`text-[15px] font-black uppercase ${analysis.sentiment === 'EUPHORIA' || analysis.sentiment === 'BULLISH' ? 'text-green-400' : 'text-red-400'}`}>{analysis.sentiment}</span>
                     </div>
                     <div className="p-5 bg-slate-900/60 rounded-3xl border border-slate-800 shadow-inner">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">WHALE ACTIVITY</span>
                        <span className="text-[12px] font-bold text-slate-300 uppercase leading-tight">{analysis.whaleActivity}</span>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-900/60 rounded-[35px] border border-slate-800 shadow-inner">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 block">MACRO CONTEXT & TREND</span>
                      <p className="text-[13px] leading-relaxed text-slate-300 font-bold italic">"{analysis.macroContext}"</p>
                  </div>
               </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <span className="text-[20px] font-black uppercase tracking-[0.8em]">Nexus Global Intelligence</span>
                  <p className="text-[12px] font-bold uppercase mt-8 text-center px-16 leading-relaxed italic">Inicia el motor para detectar flujo institucional en tiempo real.</p>
               </div>
             )}
          </div>
        </aside>
      </main>

      <footer className="h-10 border-t themed-border themed-bg-secondary flex items-center px-10 text-[10px] themed-text-secondary font-bold mono gap-10 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
           NEXUS_SYSTEM: <span className="text-blue-500 font-black">STABLE_FLOW_CONNECTED</span>
        </div>
        <div>ACTIVE_TICKER: <span className="text-blue-400 font-black">{selectedAsset.name} @ {livePrice.toFixed(precision)}</span></div>
        <div>UTC_SERVER: <span className="text-white font-black">{clockTime}</span></div>
        <div className="ml-auto text-blue-500/20 tracking-[1.5em] uppercase font-black text-[8px]">Global AI Intelligence Platform v4.5 Surgical Suite</div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(450px); opacity: 0; }
        }
        .animate-scan { animation: scan 3.5s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 12px; }
      `}</style>
    </div>
  );
};

export default App;
