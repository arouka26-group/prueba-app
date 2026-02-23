
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Candle } from "./types";

const SYSTEM_INSTRUCTION = `
IDENTIDAD: Nexus Global Intelligence - Terminal de Grado Institucional v4.5 "Surgical Elite".
ESTRATEGIA: Análisis de Flujo de Órdenes (Order Flow), Smart Money Concepts (SMC), y Detección de Algoritmos de Alta Frecuencia.

CRITERIOS DE ANÁLISIS:
1. ORDER FLOW: Analizar el Delta (diferencia agresiva compra/venta), detectar Absorción Institucional y Desequilibrios (Imbalances) en el volumen.
2. MARKET STRUCTURE: Identificar MSB (Market Structure Break) y CHoCH (Change of Character).
3. LIQUIDITY: Detectar BSL (Buy Side Liquidity) y SSL (Sell Side Liquidity).
4. WHALE DETECTION: Analizar picos de volumen inusuales que sugieran intervención institucional.

DEBES RESPONDER EXCLUSIVAMENTE EN FORMATO JSON:
{
  "asset": "string",
  "session": "string",
  "flowContext": "string",
  "trend30m": "string",
  "liquidityTarget": "string",
  "pricePhase": "Expansión | Retroceso | Acumulación | Distribución",
  "manipulationEvidence": "string",
  "decision": "CALL | PUT | NO OPERAR",
  "entryZone": "string",
  "confidence": "string (ej. 85%)",
  "riskLevel": "BAJO | MEDIO | ALTO",
  "sentiment": "BULLISH | BEARISH | NEUTRAL | PANIC | EUPHORIA",
  "macroContext": "string",
  "whaleActivity": "string",
  "volatilityIndex": 0.0,
  "probabilityScore": 0.0,
  "orderFlowMetrics": {
    "delta": 0, (rango -100 a 100, negativo venta fuerte, positivo compra fuerte)
    "imbalanceType": "BUY_SIDE | SELL_SIDE | NONE",
    "absorptionDetected": boolean,
    "orderStacking": "descripción breve del apilamiento de órdenes"
  }
}
`;

export async function analyzeMarket(candles: Candle[], asset: string, mode: string = 'Agresivo'): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataString = candles.slice(-50).map(c => 
    `T: ${c.time}, O: ${c.open.toFixed(5)}, H: ${c.high.toFixed(5)}, L: ${c.low.toFixed(5)}, C: ${c.close.toFixed(5)}, V: ${c.volume.toFixed(0)}`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `CONTEXTO NEXUS: Analiza ${asset} con enfoque en ORDER FLOW y SMC. Datos técnicos:\n\n${dataString}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Nexus Core Error:", error);
    throw error;
  }
}

export async function analyzeImageMarket(base64Image: string, asset: string, mode: string = 'Agresivo'): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(",")[1],
    },
  };

  const textPart = {
    text: `NEXUS VISION CORE: Escaneo de ORDER FLOW y Estructura. Busca huellas de agresores vs pasivos en los niveles de precios actuales. Proporciona señal quirúrgica.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Nexus Visual Core Error:", error);
    throw error;
  }
}
