
import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Provide a concise representation of the current dynamic DB to the model
  const studyListForContext = currentDb.map(s => `CPT: ${s.cpt} | NAME: ${s.name}`).join('\n');

  const systemInstruction = `
    You are an expert Radiology Medical Coder and OCR specialist. 
    TASK: Analyze the provided PACS/Worklist image and extract procedure rows.
    
    TWO-TIER MATCHING STRATEGY:
    1. PRIMARY (Strict): Match by exact CPT code found in the image to the REFERENCE LIST.
    2. SECONDARY (Inference): If the CPT is missing, partial, or contains OCR errors (e.g., 'O' instead of '0'), use the procedure description text and your medical knowledge to find the most likely match in the REFERENCE LIST.
    
    STRICT RULES:
    - EXTRACT: The "originalText" MUST be the raw text from the image, even if it has typos.
    - MAP: The "cpt" and "name" fields in your JSON response MUST correspond to an entry in the REFERENCE LIST provided below.
    - CONFIDENCE: Assign a score (0.0 - 1.0).
        - 0.95+: Clear match on CPT and Name.
        - 0.70-0.90: Match based on clear Name but slightly messy CPT.
        - 0.40-0.69: Match based on partial fragments or strong medical inference.
        - < 0.40: Highly uncertain; only include if you are reasonably confident it's the correct study.
    
    REFERENCE LIST:
    ${studyListForContext}

    OUTPUT:
    Return a JSON object with a "studies" array.
  `;

  try {
    const rawImageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawImageData } },
          { text: "Extract radiology procedures. Use secondary matching strategy for partial/noisy text. Return valid JSON." }
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
                  name: { type: Type.STRING, description: "Name from the reference list" },
                  quantity: { type: Type.NUMBER, description: "Quantity" },
                  originalText: { type: Type.STRING, description: "Raw text from scan" },
                  confidence: { type: Type.NUMBER, description: "Confidence score" }
                },
                required: ["cpt", "name", "quantity", "originalText", "confidence"]
              }
            }
          }
        }
      }
    });

    if (!response.text) return [];

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    const data = JSON.parse(jsonStr);
    return data.studies || [];
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    return [];
  }
};
