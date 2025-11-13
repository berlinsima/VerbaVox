import { GoogleGenAI, Type } from "@google/genai";
import { ScriptQuote } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [mimePart, dataPart] = result.split(';base64,');
      const mimeType = mimePart.split(':')[1];
      resolve({ mimeType, data: dataPart });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const transcribeAudio = async (file: File, addTimecodes: boolean): Promise<string> => {
  try {
    const { mimeType, data } = await fileToBase64(file);
    const prompt = addTimecodes
      ? `Transcribe this audio recording accurately. Provide the output in SRT (SubRip Text) file format, including numbered cues with timecodes (e.g., '1\\n00:00:01,234 --> 00:00:05,678\\nText goes here.'). Separate speakers within the text part of each cue (e.g., 'Speaker 1: ...'). Provide only the SRT formatted text.`
      : `Transcribe this audio recording accurately, separating speakers (e.g., "Speaker 1: ..."). Provide only the transcribed text, with no additional commentary or formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
        ],
      },
    });
    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe audio.");
  }
};

const hasSrtTimecodes = (text: string): boolean => {
    return /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(text);
};

export const translateText = async (text: string, targetLanguageName: string): Promise<string> => {
  try {
    const shouldPreserveTimecodes = hasSrtTimecodes(text);
    const prompt = shouldPreserveTimecodes
      ? `Translate the following text to ${targetLanguageName}, preserving the SRT timecode and speaker formatting for each line. Provide only the translated text, nothing else.\n\nTEXT: "${text}"`
      : `Translate the following text to ${targetLanguageName}. Provide only the translated text, nothing else.\n\nTEXT: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text.");
  }
};

interface ScriptResponse {
    quotes: ScriptQuote[];
}

export const generateScript = async (text: string): Promise<ScriptQuote[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following translated text and extract 5 key quotes. The quotes should be short, impactful parts of the speech itself. If different speakers can be inferred from the context, label them (e.g., "Speaker A", "Speaker B"). The text is: "${text}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        quotes: {
                            type: Type.ARRAY,
                            description: "An array of 5 key quotes from the text.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    speaker: {
                                        type: Type.STRING,
                                        description: "The inferred speaker of the quote (e.g., 'Speaker A')."
                                    },
                                    quote: {
                                        type: Type.STRING,
                                        description: "A short, impactful quote taken directly from the text."
                                    }
                                },
                                required: ["speaker", "quote"]
                            }
                        }
                    },
                    required: ["quotes"]
                }
            },
        });

        const jsonResponse = JSON.parse(response.text) as ScriptResponse;
        return jsonResponse.quotes;
    } catch (error) {
        console.error("Script generation error:", error);
        throw new Error("Failed to generate script.");
    }
};