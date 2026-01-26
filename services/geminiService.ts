
import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  // Use process.env.API_KEY directly as per @google/genai guidelines to avoid ImportMeta errors.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    // Updated model to gemini-3-flash-preview as per the task type (basic text/OCR task) guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
