
import { GoogleGenAI, Type } from "@google/genai";
import { RADIOLOGY_STUDY_DB } from "../constants";

export const performOCRAndMatch = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Provide a concise representation of our DB to the model for matching
  const studyListForContext = RADIOLOGY_STUDY_DB.map(s => `${s.cpt}: ${s.name} (${s.rvu} RVU)`).join('\n');

  const systemInstruction = `
    You are a professional Radiology Medical Coder.
    Analyze the provided image (which is a screenshot of a radiology worklist, PACS, or report list).
    1. Extract all radiology studies performed.
    2. Match each extracted study to the most likely CPT code from the provided reference list.
    3. If a study is found that is NOT in the reference list, use a generic CPT or find the closest match.
    4. Provide the quantity (usually 1 per row unless specified).
    5. Output JSON only.
    
    Reference List:
    ${studyListForContext}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
          { text: "Extract all radiology procedures from this list and return as JSON. Match them to the provided CPT codes where possible." }
        ]
      }
    ],
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
                cpt: { type: Type.STRING, description: "CPT code if matched, otherwise leave blank or 'UNK'" },
                name: { type: Type.STRING, description: "Descriptive name of the study" },
                quantity: { type: Type.NUMBER, description: "Number of times this study appears" },
                originalText: { type: Type.STRING, description: "Raw text found in image" },
                confidence: { type: Type.NUMBER, description: "Matching confidence 0-1" }
              },
              required: ["name", "quantity"]
            }
          }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{"studies": []}');
    return data.studies;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
};
