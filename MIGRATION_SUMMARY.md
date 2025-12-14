# API 迁移总结

## ✅ 已完成的迁移

### 1. 后端 API 迁移
- **从：** Google Gemini API
- **到：** 百度 AI Studio API（兼容 OpenAI SDK）

**修改文件：**
- `backend/main.py` - 使用百度 AI Studio API
  - 对话模型：`ernie-4.5-turbo-128k-preview`
  - 图像生成：`Stable-Diffusion-XL`
  - 支持结构化输出（json_schema）

### 2. 前端服务迁移
- **从：** 直接调用 Google Gemini API
- **到：** 调用后端 API

**修改文件：**
- `services/geminiService.ts` - 改为调用后端 API
  - `processUserInput()` → `/api/chat`
  - `generateNodeImage()` → `/api/generate-image`
  - `generateSpeech()` → 改为使用浏览器 Web Speech API

### 3. TTS 迁移
- **从：** Gemini TTS API
- **到：** 浏览器 Web Speech API

**修改文件：**
- `services/audioEngine.ts` - 使用 `window.speechSynthesis`
- `App.tsx` - 直接传递文本给 audioEngine

### 4. 依赖清理
- 移除了 `@google/genai` 依赖
- 更新了 `package.json` 和 `index.html`

## 📋 配置要求

### 后端配置
创建 `backend/.env` 文件：
```
AI_STUDIO_API_KEY=your_access_token_here
```

获取访问令牌：https://aistudio.baidu.com/account/accessToken

### 前端配置
创建 `.env.local` 文件（可选）：
```
VITE_API_BASE_URL=http://localhost:8000
```

如果不设置，默认使用 `http://localhost:8000`

## 🚀 运行步骤

1. **启动后端：**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

2. **启动前端：**
   ```bash
   npm install
   npm run dev
   ```

## 📝 使用的模型

- **对话模型：** ERNIE 4.5 Turbo (ernie-4.5-turbo-128k-preview)
- **图像生成：** Stable-Diffusion-XL
- **语音合成：** 浏览器 Web Speech API（前端直接调用）

## ⚠️ 注意事项

1. **浏览器兼容性：** Web Speech API 需要现代浏览器支持
2. **API 密钥安全：** 确保后端 API 密钥不会暴露在前端
3. **结构化输出：** 百度 API 支持 json_schema，如果不支持会自动降级到 json_object

## 🔧 故障排除

如果遇到问题：
1. 检查后端是否正常运行（访问 http://localhost:8000/health）
2. 检查 API 密钥是否正确设置
3. 查看浏览器控制台和后端日志

