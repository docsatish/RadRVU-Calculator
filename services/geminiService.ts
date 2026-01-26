import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // --- UNIVERSAL KEY FIX START ---
  let apiKey = '';
  try {
    // Vite/Netlify check
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    }
  } catch (e) {
    // Fallback if import.meta is unsupported
  }

  // Google AI Studio fallback
  if (!apiKey) {
    apiKey = process.env.API_KEY || '';
  }

  if (!apiKey) {
    console.error("No API key found. Check Netlify Environment Variables.");
    return [];
  }
  // --- UNIVERSAL KEY FIX END ---

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const studyListForContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  const systemInstruction = `
    You are an expert Radiology Medical Coder and OCR specialist. 
    Analyze the provided PACS/Worklist image and extract procedure rows.
    Match to description first. Map abbreviations (US->Ultrasound, BX->Biopsy, etc.).
    
    REFERENCE LIST:
    ${studyListForContext}

    OUTPUT: JSON only with a "studies" array.
  `;

  try {
    const rawImageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Switched to stable 2.0 for production reliability
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawImageData } },
          { text: "Extract radiology procedures and return as JSON. Match to the PROVIDED REFERENCE LIST." }
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
                  cpt: { type: Type.STRING, description: "CPT code" },
                  name: { type: Type.STRING, description: "Name from reference list" },
                  quantity: { type: Type.NUMBER, description: "Quantity" },
                  originalText: { type: Type.STRING, description: "Raw text from image" },
                  confidence: { type: Type.NUMBER, description: "Confidence 0-1" }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    // Directly access the .text property
    const data = JSON.parse(response.text || '{"studies": []}');
    return data.studies || [];
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return [];
  }
};
