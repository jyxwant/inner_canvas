# Inner Canvas 后端 API

使用百度 AI Studio API（兼容 OpenAI SDK）提供大模型服务。

## 安装

```bash
# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

## 配置

创建 `.env` 文件：

```
AI_STUDIO_API_KEY=your_access_token_here
```

**获取访问令牌：**
1. 访问 https://aistudio.baidu.com/account/accessToken
2. 创建或复制你的访问令牌（Access Token）
3. 将令牌设置到环境变量 `AI_STUDIO_API_KEY` 中

## 运行

```bash
python main.py
```

或者使用 uvicorn：

```bash
uvicorn main:app --reload --port 8000
```

API 文档会自动生成在：http://localhost:8000/docs

## API 端点

- `POST /api/chat` - 处理对话
- `POST /api/generate-image` - 生成图像
- `POST /api/generate-speech` - 生成语音
- `GET /health` - 健康检查

## 使用的模型

- **对话模型：** ERNIE 4.5 Turbo (ernie-4.5-turbo-128k-preview)
- **图像生成：** Stable-Diffusion-XL
- **语音合成：** 浏览器 Web Speech API（前端直接调用）

## 前端配置

前端已经配置为调用后端 API。确保 `.env.local` 中设置了：

```
VITE_API_BASE_URL=http://localhost:8000
```

如果不设置，默认使用 `http://localhost:8000`。

