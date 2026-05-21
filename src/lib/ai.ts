import { GoogleGenAI } from "@google/genai"

// In-memory counter for round-robin API key rotation
let currentKeyIndex = 0

export function getGeminiKey(): string {
  // Grab all keys that might be defined in .env
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5
  ].filter(Boolean) as string[]

  if (keys.length === 0) {
    throw new Error("No GEMINI API keys found in environment variables.")
  }

  const selectedKey = keys[currentKeyIndex % keys.length]
  currentKeyIndex++
  return selectedKey
}

export async function generateNoteInsights(title: string, content: string) {
  const prompt = `
You are a productivity assistant. Analyze the note content and return ONLY a valid JSON object with no markdown, no code fences, and no explanation.

The JSON must have exactly these keys:
- summary (string, 2-3 sentences)
- actionItems (array of strings, each a clear actionable task extracted from the note, empty array if none)
- suggestedTitle (string, a concise descriptive title)
- suggestedTags (array of strings, 2-4 short relevant tags, max 1 word each)

Note Title: ${title}
Note Content:
${content || "(Empty note)"}
  `.trim()

  let retries = 5;
  let delay = 1000;

  while (retries > 0) {
    try {
      // Rotate to the next available key for every attempt
      const apiKey = getGeminiKey()
      const ai = new GoogleGenAI({ apiKey })

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1, // Near-zero temperature ensures consistent, high-quality summaries
        }
      })

      let responseText = response.text || "{}"
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
      
      return JSON.parse(responseText) as {
        summary: string
        actionItems: string[]
        suggestedTitle: string
        suggestedTags: string[]
      }
      
    } catch (error: any) {
      console.warn(`Gemini API Error. Retries left: ${retries - 1}`);
      
      if (retries > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        continue;
      }
      
      throw new Error("All API keys are currently exhausted or blocked. Please add more keys or try again later.")
    }
  }
  
  throw new Error("Failed to generate insights after multiple attempts.")
}
