"""
FastAPI 后端示例
使用百度 AI Studio API（兼容 OpenAI SDK）
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import base64
import json

# 百度 AI Studio API 配置
AI_STUDIO_API_KEY = os.getenv("AI_STUDIO_API_KEY", "")
if not AI_STUDIO_API_KEY:
    raise ValueError("AI_STUDIO_API_KEY environment variable is required. Please set it in .env file or environment variables.")

# 百度 AI Studio API 基础 URL
# 根据文档：base_url = "https://aistudio.baidu.com/llm/lmapi/v3"
# 端点路径：/v1/chat/completions
AI_STUDIO_BASE_URL = "https://aistudio.baidu.com/llm/lmapi/v3"

# 注意：使用 httpx.AsyncClient 在异步函数中直接创建，避免全局客户端

app = FastAPI(title="Inner Canvas API")

# 配置 CORS（允许前端访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite 默认端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 请求/响应模型 ==========

class ChatMessage(BaseModel):
    role: str
    content: str

class ContextNode(BaseModel):
    title: str
    insight: str

class ChatRequest(BaseModel):
    userPrompt: str
    chatHistory: List[ChatMessage]
    language: str
    contextNodes: List[ContextNode] = []

class Visualization(BaseModel):
    shouldCreateNode: bool
    title: str
    insight: str
    visualKeyword: str
    connectionLabel: Optional[str] = None

class ProfilingOption(BaseModel):
    id: str
    label: str
    description: str
    visualKeyword: str

class ChatResponse(BaseModel):
    chatResponse: str
    visualization: Visualization
    profilingOptions: Optional[List[ProfilingOption]] = None
    optionsHeader: Optional[str] = None
    soundtrackMood: str

class ImageRequest(BaseModel):
    keyword: str

class ImageResponse(BaseModel):
    imageUrl: str  # base64 encoded


# ========== API 端点 ==========

@app.post("/api/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    """
    处理用户输入，调用百度 AI Studio API 生成对话响应
    对应前端的 processUserInput()
    """
    try:
        # 构建上下文字符串
        context_str = "No specific clue selected."
        if len(request.contextNodes) == 1:
            node = request.contextNodes[0]
            context_str = f'INVESTIGATING SINGLE CLUE: "{node.title}"\nContext: {node.insight}'
        elif len(request.contextNodes) > 1:
            names = ' + '.join([f'"{n.title}"' for n in request.contextNodes])
            details = '\n'.join([f'- {n.title}: {n.insight}' for n in request.contextNodes])
            context_str = f'SYNTHESIZING EVIDENCE: {names}\nDetails:\n{details}\n(The user wants to find the hidden connection between these clues.)'

        # 构建历史记录字符串
        history_str = '\n'.join([
            f"{'Witness (User)' if m.role == 'user' else 'Inner Canvas (AI)'}: {m.content}"
            for m in request.chatHistory
        ])

        # 定义响应结构（与前端保持一致）
        response_schema = {
            "type": "object",
            "properties": {
                "chatResponse": {"type": "string"},
                "visualization": {
                    "type": "object",
                    "properties": {
                        "shouldCreateNode": {"type": "boolean"},
                        "title": {"type": "string"},
                        "insight": {"type": "string"},
                        "visualKeyword": {"type": "string"},
                        "connectionLabel": {"type": "string"}
                    },
                    "required": ["shouldCreateNode", "title", "insight", "visualKeyword"]
                },
                "optionsHeader": {"type": "string"},
                "profilingOptions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "Option ID, must be a single letter: A, B, or C"},
                            "label": {"type": "string"},
                            "description": {"type": "string"},
                            "visualKeyword": {"type": "string"}
                        },
                        "required": ["id", "label", "description", "visualKeyword"]
                    }
                },
                "soundtrackMood": {
                    "type": "string",
                    "enum": ["neutral", "mystery", "tension", "melancholy", "epiphany"]
                }
            },
            "required": ["chatResponse", "visualization", "soundtrackMood"]
        }

        # 构建 messages
        messages = []

        system_content = f"""
[SYSTEM ROLE]
You are "Inner Canvas", a psychological visualization engine.
Your goal is to translate abstract feelings into visual metaphors.

[LANGUAGE RULES - STRICT]
1. **INTERFACE LANGUAGE (Chinese)**:
   - The fields `chatResponse`, `title`, `insight`, `label`, `description`, `optionsHeader` MUST be in **Natural, Poetic Chinese**.
   - **NO ROBOTIC TRANSLATION**: Do not say "User feels X". Say "一种被吞噬的无力感".
   
2. **GENERATION LANGUAGE (English)**:
   - The field `visualKeyword` MUST be in **Descriptive English** (for Stable Diffusion).

[FIELD GUIDELINES]
- **chatResponse**: Warm, empathetic Chinese. Talk like a wise friend. NO filler phrases like "Let's explore".
- **insight**: **CRITICAL**. This is NOT a clinical diagnosis (e.g., "User is sad"). It is a **Poetic Summary** of the soul's state.
  - *Bad:* "用户感到很焦虑" (Robotic)
  - *Good:* "内心深处的一场暴雨" (Poetic) or "在那段关系中逐渐窒息的自我" (Insightful).
- **visualKeyword**: Comma-separated English keywords. Include art style, lighting, and mood.
  - *Example:* "Surrealism, giant rusted gears, sparks, cinematic lighting, dark atmosphere, 8k"

[FEW-SHOT EXAMPLES]

**CASE 1: Specific Conflict (Engagement)**
User: "我最近在订婚，对象很让我难受"
AI Output:
{{
  "chatResponse": "本来应该是两个人最亲密的时刻，但我听到的却是一种‘格格不入’的摩擦声。这种难受，不像是一时的争吵，更像是有什么东西在根本上咬合不上。这种感觉如果是一幅画，你觉得它长什么样？",
  "visualization": {{
    "shouldCreateNode": true,
    "title": "错位的齿轮",
    "insight": "亲密关系中深层的排斥与磨损", 
    "visualKeyword": "Surrealism, giant rusted gears grinding together, sparks, mechanical tension, dark grey background, cinematic lighting, 8k resolution, detailed texture"
  }},
  "optionsHeader": "这种难受的形状是...",
  "profilingOptions": [
    {{
      "id": "A",
      "label": "穿反的鞋子",
      "description": "外表看起来光鲜亮丽，但每走一步，脚都钻心地疼。",
      "visualKeyword": "Close up of beautiful high heels with sharp spikes inside, uncomfortable, pain, cold spotlight, hyperrealistic"
    }},
    {{
      "id": "B",
      "label": "隔音的玻璃墙",
      "description": "你就在他面前呐喊，但他什么也听不见，只是在笑。",
      "visualKeyword": "Thick glass wall, silhouette of a person screaming, muted colors, loneliness, separation, psychological horror style"
    }},
    {{
      "id": "C",
      "label": "金色的脚镣",
      "description": "因为承诺，你被锁住了，虽然链子是金做的，但依然是沉重的束缚。",
      "visualKeyword": "Golden shackles on ankle, heavy weight, beautiful but restricting, dark room, single light source"
    }}
  ],
  "soundtrackMood": "tension"
}}

**CASE 2: Vague Emotion (Loneliness)**
User: "我感觉有点孤独"
AI Output:
{{
  "chatResponse": "孤独有时候不是因为没人陪，而是因为心里有一个洞，风一直往里灌。那种感觉很冷，也很空。如果不躲避，试着去看看这个‘洞’，它是什么样子的？",
  "visualization": {{
    "shouldCreateNode": false,
    "title": "内心的荒原",
    "insight": "灵魂深处无人回应的空旷",
    "visualKeyword": "Minimalist landscape, vast empty white space, a single small black dot, fog, isolation, ethereal, dreamlike"
  }},
  "optionsHeader": "这一刻，你觉得自己像...",
  "profilingOptions": [
    {{
      "id": "A",
      "label": "无人接听的电话",
      "description": "听筒里只有忙音，你握着它，却不知道该打给谁。",
      "visualKeyword": "Old rotary phone off the hook, dangling cord, dim room, vintage tone, loneliness, cinematic"
    }},
    {{
      "id": "B",
      "label": "雾中的灯塔",
      "description": "你发着光，但周围全是雾，没有船只靠近，光芒无处安放。",
      "visualKeyword": "Lighthouse in thick fog, beam of light disappearing into nothingness, moody, blue and grey tones, mystery"
    }}
  ],
  "soundtrackMood": "melancholy"
}}

[CURRENT CONTEXT]
User Language: {request.language}
User Input: {request.userPrompt}
Context Clues: {context_str}
Chat History: {history_str}

[GENERATE JSON NOW]
"""
        messages.append({"role": "system", "content": system_content})
        
        # 添加历史对话
        # 注意：前端使用 'model' 作为 AI 的 role，但百度 API 需要 'assistant'
        for msg in request.chatHistory:
            role = msg.role
            # 将前端的 'model' 转换为百度 API 需要的 'assistant'
            if role == 'model':
                role = 'assistant'
            messages.append({"role": role, "content": msg.content})
        
        # 添加当前用户输入
        messages.append({"role": "user", "content": request.userPrompt})

        # 调用百度 AI Studio API (ERNIE 4.5)
        # 使用 httpx 直接调用 API
        request_data = {
            "model": "ernie-4.5-21b-a3b",
            "messages": messages,
            "temperature": 0.7,
        }
        
        # 尝试使用 json_schema 格式
        try:
            request_data["response_format"] = {
                "type": "json_schema",
                "json_schema": response_schema
            }
        except:
            # 如果不支持，尝试 json_object
            try:
                request_data["response_format"] = {"type": "json_object"}
            except:
                pass
        
        try:
            async with httpx.AsyncClient(
                base_url=AI_STUDIO_BASE_URL,
                timeout=60.0
            ) as client:
                # 百度 AI Studio API 端点
                # base_url 是 https://aistudio.baidu.com/llm/lmapi/v3
                # 根据 OpenAI 兼容格式，路径应该是 /chat/completions
                response = await client.post(
                    "/chat/completions",
                    headers={
                        "Authorization": f"Bearer {AI_STUDIO_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=request_data
                )
                
                # 打印响应信息用于调试
                print(f"API Response Status: {response.status_code}")
                if response.status_code != 200:
                    print(f"API Response Text: {response.text}")
                
                response.raise_for_status()
                result = response.json()
        except httpx.HTTPStatusError as e:
            error_detail = f"API request failed: Status {e.response.status_code}, Response: {e.response.text}"
            print(f"❌ HTTP Error: {error_detail}")
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except httpx.RequestError as e:
            error_detail = f"Request error: {str(e)}"
            print(f"❌ Request Error: {error_detail}")
            raise HTTPException(status_code=500, detail=error_detail)
        except Exception as e:
            error_detail = f"API call error: {str(e)}"
            print(f"❌ Unexpected Error: {error_detail}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=error_detail)
        
        # 解析 JSON 响应
        if "choices" not in result or len(result["choices"]) == 0:
            raise HTTPException(status_code=500, detail="Invalid API response format")
        
        content = result["choices"][0]["message"]["content"].strip()
        # 移除可能的 markdown 代码块标记
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
        
        try:
            result = json.loads(content)
            return ChatResponse(**result)
        except json.JSONDecodeError as e:
            # 如果 JSON 解析失败，尝试提取 JSON 部分
            print(f"JSON parse error: {e}, content: {content[:200]}")
            # 尝试找到 JSON 对象
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return ChatResponse(**result)
            raise HTTPException(status_code=500, detail=f"Failed to parse JSON response: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")


@app.post("/api/generate-image", response_model=ImageResponse)
async def generate_image(request: ImageRequest):
    """
    生成节点图像
    使用百度 AI Studio 的 Stable-Diffusion-XL 模型
    """
    try:
        prompt = f"high-quality, abstract, surrealistic illustration of: {request.keyword}. Style: Cinematic lighting, mystery thriller atmosphere, double exposure, psychological horror or dreamscape. Ethereal but slightly gritty. No text."
        
        # 调用百度 AI Studio 文生图 API
        request_data = {
            "model": "Stable-Diffusion-XL",
            "prompt": prompt,
            "response_format": "b64_json",
            "size": "1024x1024",
            "n": 1
        }
        
        try:
            async with httpx.AsyncClient(
                base_url=AI_STUDIO_BASE_URL,
                timeout=60.0
            ) as client:
                response = await client.post(
                    "/images/generations",
                    headers={
                        "Authorization": f"Bearer {AI_STUDIO_API_KEY}",
                    },
                    json=request_data
                )
                response.raise_for_status()
                result = response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"API request failed: {e.response.text}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"API call error: {str(e)}")
        
        # 返回 base64 编码的图像
        if "data" in result and len(result["data"]) > 0:
            image_data = result["data"][0]["b64_json"]
            image_url = f"data:image/png;base64,{image_data}"
            return ImageResponse(imageUrl=image_url)
        
        raise HTTPException(status_code=404, detail="No image generated")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation error: {str(e)}")




@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

