import { GoogleGenAI, Type } from "@google/genai";
import { StudyDefinition } from "../types";

export const performOCRAndMatch = async (base64Image: string, currentDb: StudyDefinition[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const studyListForContext = currentDb.map(s => `NAME: ${s.name} | CPT: ${s.cpt}`).join('\n');

  const systemInstruction = `
    You are an expert Radiology Medical Coder and OCR specialist. 
    TASK: Analyze the provided PACS/Worklist image and extract procedure rows.
    
    ABBREVIATION AWARENESS:
    Radiology worklists use many abbreviations. You must recognize and map them:
    - US / USG -> Ultrasound
    - CT / CAT -> Computed Tomography
    - MR / MRI -> Magnetic Resonance Imaging
    - BX -> Biopsy
    - MAMMO -> Mammogram
    - XR / CR / DR -> X-Ray
    - LT / RT -> Left / Right (Ignore for matching purposes - Directional Neutrality)
    - W / WO -> With / Without (Critical for matching)
    - CONT -> Contrast
    - BILAT / BIL -> Bilateral
    - DX / SCR -> Diagnostic / Screening
    - F/U -> Follow-up
    
    PRIMARY MATCHING RULE: 
    - MATCH TO DESCRIPTION FIRST AND ONLY. 
    - Use the raw procedure name found in the image to find the closest match in the REFERENCE LIST.
    - Focus on clinical keywords (e.g., "Thoracic", "Chest", "Biopsy").
    - If a match is found based on core clinical description, ignore directional differences.
    
    DATA ENRICHMENT:
    - Once you identify the correct procedure in the REFERENCE LIST, provide the CPT code associated with that name in the list.
    
    STRICT RULES:
    - EXTRACT: The "originalText" MUST be the raw text from the image.
    - MAP: The "name" and "cpt" fields in your JSON response MUST correspond to an entry from the provided REFERENCE LIST.
    - CONFIDENCE: Assign a score (0.0 - 1.0).
    
    REFERENCE LIST:
    ${studyListForContext}

    OUTPUT:
    Return a JSON object with a "studies" array.
  `;

  try {
    const rawImageData = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawImageData } },
          { text: "Extract radiology procedures. Prioritize description matching. Expand abbreviations mentally to find the best match in the database list. Return valid JSON." }
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
                  cpt: { type: Type.STRING, description: "CPT code from the matched database entry" },
                  name: { type: Type.STRING, description: "Name from the matched database entry" },
                  quantity: { type: Type.NUMBER, description: "Quantity" },
                  originalText: { type: Type.STRING, description: "Raw text found on the image" },
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