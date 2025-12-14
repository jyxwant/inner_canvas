
import { Language } from "../types";

// 后端 API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type SoundtrackMood = 'neutral' | 'mystery' | 'tension' | 'melancholy' | 'epiphany';

export interface AIResponse {
  chatResponse: string;
  visualization: {
    shouldCreateNode: boolean;
    title: string;
    insight: string;
    visualKeyword: string;
    connectionLabel?: string;
  };
  profilingOptions?: {
    id: string;
    label: string;
    description: string;
    visualKeyword: string;
  }[];
  optionsHeader?: string;
  soundtrackMood: SoundtrackMood;
}

/**
 * 1. Chat Processing - 调用后端 API
 */
export const processUserInput = async (
  userPrompt: string, 
  chatHistory: { role: string; content: string }[],
  language: Language,
  contextNodes: { title: string; insight: string }[] = []
): Promise<AIResponse> => {
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrompt,
        chatHistory,
        language,
        contextNodes,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as AIResponse;

  } catch (error) {
    console.error("❌ [Backend Chat Error]:", error);
    return {
      chatResponse: "I'm having trouble accessing the case files right now. Let's try that again.",
      visualization: { shouldCreateNode: false, title: "", insight: "", visualKeyword: "" },
      soundtrackMood: 'tension'
    };
  }
};

/**
 * 2. Image Generation - 调用后端 API
 */
export const generateNodeImage = async (keyword: string): Promise<string | null> => {
  console.log("🎨 [Backend Image] Generating for:", keyword);

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.imageUrl || null;

  } catch (error) {
    console.error("❌ [Backend Image Error]:", error);
    return null;
  }
};

/**
 * 3. Speech Generation (TTS) - 使用浏览器自带的 Web Speech API
 * 不再需要后端调用，直接使用浏览器的 speechSynthesis
 */
export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text) return null;
  
  // 浏览器 Web Speech API 不需要返回 ArrayBuffer
  // 这个函数保留是为了兼容现有代码，但实际会在 audioEngine 中直接使用 speechSynthesis
  // 返回 null 表示使用浏览器 TTS
  return null;
};

