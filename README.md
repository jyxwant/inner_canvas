# Inner Canvas

一个心理分析思维导图应用，使用百度 AI Studio API 提供大模型能力。

## 功能特性

- 🧠 心理分析和思维导图可视化
- 💬 智能对话（使用 ERNIE 4.5）
- 🎨 自动生成节点图像（使用 Stable-Diffusion-XL）
- 🔊 语音合成（使用浏览器 Web Speech API）
- 🎵 程序化背景音乐

## 本地运行

### 前置要求

- Node.js
- Python 3.8+

### 步骤

1. **安装前端依赖：**
   ```bash
   npm install
   ```

2. **配置后端：**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
   
   创建 `backend/.env` 文件：
   ```
   AI_STUDIO_API_KEY=your_access_token_here
   ```
   
   获取访问令牌：https://aistudio.baidu.com/account/accessToken

3. **启动后端：**
   ```bash
   cd backend
   python main.py
   ```

4. **启动前端：**
   ```bash
   npm run dev
   ```

## 技术栈

- **前端：** React + TypeScript + Vite
- **后端：** FastAPI + Python
- **大模型：** 百度 AI Studio API (ERNIE 4.5)
- **图像生成：** Stable-Diffusion-XL
- **语音合成：** 浏览器 Web Speech API
- **背景音乐：** 本地音频文件（从 Pixabay 下载）
- **CDN：** 使用国内友好的 CDN 镜像（cdn.jsdelivr.net, fonts.loli.net）

## 背景音乐设置（可选）

应用支持根据对话 mood 自动切换背景音乐。要启用此功能：

1. 从 [Pixabay](https://pixabay.com/zh/music/search/%e8%bd%bb%e9%9f%b3%e4%b9%90/) 下载轻音乐
2. 将文件重命名为对应的 mood 名称（`neutral.mp3`, `mystery.mp3`, `tension.mp3`, `melancholy.mp3`, `epiphany.mp3`）
3. 放到 `public/audio/` 目录

详细说明请查看 `public/audio/README.md`

## 项目结构

- `backend/` - Python 后端 API
- `components/` - React 组件
- `services/` - 前端服务（API 调用、音频引擎）
- `App.tsx` - 主应用组件
