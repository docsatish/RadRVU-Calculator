import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // --- UNIVERSAL KEY FIX START ---
  let apiKey = '';
  try {
    // Check for Vite/Netlify prefixed variable
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    }
  } catch (e) {
    // Ignore errors if environment doesn't support import.meta
  }

  // Fallback to Studio's internal variable
  if (!apiKey) {
    apiKey = process.env.API_KEY || '';
  }

  if (!apiKey) {
    console.error("No API key found. Ensure VITE_GEMINI_API_KEY is set in Netlify.");
    return [];
  }
  // --- UNIVERSAL KEY FIX END ---

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const studyListForContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  const systemInstruction = `
    You are an expert Radiology Medical Coder. Match extracted studies to the REFERENCE LIST.
    REFERENCE LIST:
    ${studyListForContext}
    OUTPUT: JSON only with a "studies" array.
  `;

  try {
    // Clean the image data
    const rawImageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Use stable version for production
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawImageData } },
          { text: "Extract radiology procedures and return as JSON." }
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
                  cpt: { type: Type.STRING },
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  originalText: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{"studies": []}');
    return data.studies || [];
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return [];
  }
};