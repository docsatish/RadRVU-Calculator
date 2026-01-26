import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

// 1. UNIVERSAL KEY FIX: Checks Vite's variable first (for Netlify), then fallback to process.env (for Studio)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // 2. SAFETY CHECK: Ensure we have a key before starting
  if (!apiKey) {
    console.error("API Key missing! Add VITE_GEMINI_API_KEY to Netlify environment variables.");
    throw new Error("AI analysis failed - API configuration error.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  const studyListForContext = currentDb.map(s => `${s.cpt}: ${s.name} (${s.rvu} RVU)`).join('\n');

  const systemInstruction = `
    You are a professional Radiology Medical Coder.
    Analyze the provided image (worklist screenshot).
    1. Extract all radiology studies performed.
    2. Match each extracted study to the most likely CPT code from the PROVIDED REFERENCE LIST below.
    3. The PROVIDED REFERENCE LIST is the definitive source for CPT codes and names.
    4. Provide the quantity (usually 1 per row unless specified).
    5. Output JSON only.
    
    REFERENCE LIST:
    ${studyListForContext}
  `;

  try {
    // 3. DATA CLEANING: Ensure we only send the raw base64 data
    const rawImageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Updated to latest stable model
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawImageData } },
          { text: "Extract all radiology procedures from this list and return as JSON. Match them to the provided REFERENCE LIST." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cpt: { type: Type.STRING, description: "CPT code from the reference list" },
                  name: { type: Type.STRING, description: "Name as it appears in the reference list" },
                  quantity: { type: Type.NUMBER, description: "Number of times this study appears" },
                  originalText: { type: Type.STRING, description: "Raw text found in image" },
                  confidence: { type: Type.NUMBER, description: "Matching confidence 0-1" }
                },
                required: ["cpt", "name", "quantity"]
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{"studies": []}');
    return data.studies;
  } catch (error) {
    // 4. ERROR LOGGING: This prevents the app from crashing silently
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};