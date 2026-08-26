# 🏏 Sports Content AI

An AI-powered sports content generation platform that creates quizzes, polls, and interactive sports content using LLMs, web search, and a vector knowledge base.

The project combines React, FastAPI, Ollama, ChromaDB, and web search to generate structured sports content with validation and source grounding.

## 🚀 Live Demo

**Frontend:**  
https://sports-content-agent-8c2sk9itg-yashbsls-projects.vercel.app/

**Backend:**  
https://sports-content-agent-backend-stzs.onrender.com/

**API Docs:**  
https://sports-content-agent-backend-stzs.onrender.com/docs

**GitHub:**  
https://github.com/yashbsl/Sports-content-agent

---

## ✨ Features

- 🤖 AI-powered sports content generation
- 🏏 Multiple sports support
- 🎯 Easy, Medium, and Hard difficulty levels
- ❓ Multiple Choice Questions (MCQ)
- ✅ True / False questions
- 📊 Opinion-based Polls
- ✍️ Fill in the Blank questions
- 🔢 Guess the Number questions
- 🔀 Mixed content generation
- 🌐 Web-grounded content generation
- 🧠 ChromaDB knowledge-base retrieval
- ✅ AI response validation
- 🔄 Automatic retry for invalid AI responses
- ♻️ Per-question regeneration
- 📋 Copy generated content
- 🕘 Generation history
- 📥 JSON export
- 🔗 Web source references
- ✅ Trusted source badges
- 📚 Knowledge-base references
- 📱 Responsive dashboard UI

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

### AI / LLM

- Ollama
- Gemma
- Qwen

### Search & Retrieval

- DuckDuckGo Search (`ddgs`)
- ChromaDB
- Vector-based semantic retrieval

### Deployment

- Vercel
- Render

---

## 🏗️ Architecture

        ┌─────────────────────┐
        │    React + Vite     │
        │      Frontend       │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │       FastAPI       │
        │      Backend        │
        └──────────┬──────────┘
                   │
           ┌───────┴───────┐
           │               │
           ▼               ▼
    ┌─────────────┐  ┌─────────────┐
    │ Web Search  │  │  ChromaDB   │
    │    DDGS     │  │ Knowledge   │
    └──────┬──────┘  │    Base     │
           │         └──────┬──────┘
           │                │
           └───────┬────────┘
                   ▼
        ┌─────────────────────┐
        │       Ollama        │
        │    Gemma / Qwen     │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Validation + JSON   │
        └──────────┬──────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │    React Frontend   │
        └─────────────────────┘

---

## 📁 Project Structure

    Sports-content-agent/
    └── sports-content-agent/
        ├── backend/
        │   ├── main.py
        │   ├── requirements.txt
        │   ├── services/
        │   │   ├── ai_generator.py
        │   │   ├── web_search.py
        │   │   └── vector_store.py
        │   └── chroma_db/
        │
        └── frontend/
            ├── package.json
            ├── vite.config.js
            ├── index.html
            └── src/
                ├── App.jsx
                ├── index.css
                └── main.jsx

---

## 🔍 How It Works

    User
      │
      ▼
    Select Sport + Difficulty + Content Type + Quantity
      │
      ▼
    FastAPI Backend
      │
      ├───────────────┐
      ▼               ▼
    Web Search     ChromaDB
      │               │
      └───────┬───────┘
              ▼
       Retrieved Context
              │
              ▼
           Ollama
         Gemma / Qwen
              │
              ▼
        Structured JSON
              │
              ▼
          Validation
              │
              ▼
          React UI

---

## 📚 Supported Content Types

### MCQ

- Exactly 4 options
- Unique options
- One correct answer
- Explanation included

### True / False

- Objective statement
- True or False answer
- Explanation included

### Poll

- Exactly 2 options
- Opinion based
- No correct answer

### Fill in the Blank

- Exactly 4 options
- One correct answer
- Explanation included

### Guess the Number

- Numeric target
- Numeric tolerance
- Explanation included

### Mixed

- Combination of supported content types

---

## ✅ AI Validation

Generated content is validated before being returned.

### MCQ Validation

    4 options
    +
    Unique options
    +
    Correct answer matches one option

### Poll Validation

    2 options
    +
    Unique options

### Guess Number Validation

    Numeric target
    +
    Numeric tolerance
    +
    Tolerance >= 0

If generated content fails validation, the system automatically retries generation.

---

## 🌐 Web Grounding

The application retrieves relevant sports information from the web before generating factual content.

Trusted sports domains are prioritized, including:

- ICC
- ESPNcricinfo
- Wisden
- BCCI
- FIFA
- UEFA
- NBA
- ATP Tour
- WTA
- ITF

---

## 🧠 ChromaDB Knowledge Base

ChromaDB is used to store reusable sports knowledge such as:

- Sports rules
- Formats
- Historical facts
- Sports terminology
- Stable numerical facts
- Tournament information

Relevant knowledge is retrieved before content generation.

---

## 🎨 Frontend Features

- Modern responsive dashboard
- Light theme
- Custom dropdowns
- Sport selector
- Difficulty selector
- Content type selector
- Quantity selector
- Loading states
- Error handling
- Generated content cards
- Correct answer highlighting
- Web source cards
- Trusted source badges
- Knowledge-base references
- Copy button
- Regenerate button
- Generation history
- JSON export

---

## ⚙️ Local Setup

### 1. Clone Repository

    git clone https://github.com/yashbsl/Sports-content-agent.git
    cd Sports-content-agent/sports-content-agent

### 2. Backend Setup

    cd backend

Create virtual environment:

#### Windows PowerShell

    python -m venv venv
    .\venv\Scripts\Activate.ps1

Install dependencies:

    pip install -r requirements.txt

### 3. Ollama Setup

Install Ollama and make sure it is running.

Check installed models:

    ollama list

Example models:

    gemma3:latest
    qwen2.5:1.5b

Create:

    backend/.env

Add:

    OLLAMA_URL=http://127.0.0.1:11434/api/generate
    OLLAMA_MODEL=gemma3:latest
    OLLAMA_TIMEOUT=180

Start backend:

    python -m uvicorn main:app --reload

Backend:

    http://127.0.0.1:8000

Swagger:

    http://127.0.0.1:8000/docs

Health:

    http://127.0.0.1:8000/health

### 4. Frontend Setup

Open another terminal:

    cd frontend
    npm install
    npm run dev

Frontend:

    http://localhost:5173

---

## 🔌 API

### GET `/`

Returns backend status.

Example response:

    {
      "message": "Sports Content AI API is running",
      "status": "ok"
    }

### GET `/health`

Example response:

    {
      "status": "ok"
    }

### POST `/generate`

Request:

    {
      "sport": "Cricket",
      "difficulty": "medium",
      "content_type": "mcq",
      "quantity": 1
    }

Example response:

    {
      "sport": "Cricket",
      "difficulty": "medium",
      "content_type": "mcq",
      "quantity": 1,
      "generated_content": [
        {
          "question": "How many legal deliveries normally make up an over in cricket?",
          "options": [
            "Four",
            "Five",
            "Six",
            "Eight"
          ],
          "correct_answer": "Six",
          "explanation": "A standard over normally consists of six legal deliveries.",
          "sources": [],
          "knowledge_sources": []
        }
      ]
    }

---

## 🚀 Deployment

### Frontend — Vercel

**Root Directory**

    frontend

**Framework**

    Vite

**Build Command**

    npm run build

**Output Directory**

    dist

**Environment Variable**

    VITE_API_URL=https://sports-content-agent-backend-stzs.onrender.com

**Live Frontend**

https://sports-content-agent-8c2sk9itg-yashbsls-projects.vercel.app/

### Backend — Render

**Root Directory**

    sports-content-agent/backend

**Build Command**

    pip install -r requirements.txt

**Start Command**

    uvicorn main:app --host 0.0.0.0 --port $PORT

**Live Backend**

https://sports-content-agent-backend-stzs.onrender.com/

**API Docs**

https://sports-content-agent-backend-stzs.onrender.com/docs

---

## 🔐 Environment Variables

### Backend

    OLLAMA_URL=http://127.0.0.1:11434/api/generate
    OLLAMA_MODEL=gemma3:latest
    OLLAMA_TIMEOUT=180

### Frontend

    VITE_API_URL=https://sports-content-agent-backend-stzs.onrender.com

> Never commit `.env` files, API keys, passwords, or other secrets to GitHub.

---

## 🧪 Development Workflow

### Backend

    cd sports-content-agent/backend
    .\venv\Scripts\Activate.ps1
    python -m uvicorn main:app --reload

### Frontend

    cd sports-content-agent/frontend
    npm run dev

Open:

    http://localhost:5173

---

## 🛠️ Troubleshooting

### `No module named uvicorn`

    .\venv\Scripts\Activate.ps1
    python -m uvicorn main:app --reload

### `No module named requests`

    pip install -r requirements.txt

### Ollama Port Already in Use

If you see:

    127.0.0.1:11434
    bind: Only one usage of each socket address

Ollama is probably already running.

You do not need to start another `ollama serve` process.

### Failed to Fetch

Check:

1. `VITE_API_URL`
2. FastAPI CORS configuration
3. Render backend status
4. `/health` endpoint
5. Production AI endpoint availability

---

## 📌 Future Improvements

- User authentication
- Persistent cloud history
- CSV export
- Advanced source verification
- Better factual verification
- More sports and leagues
- Analytics dashboard
- Hosted LLM support
- Scheduled content generation
- Advanced regeneration
- User workspaces

---

## 👨‍💻 Author

**Yash Bansal**

GitHub:  
https://github.com/yashbsl

Repository:  
https://github.com/yashbsl/Sports-content-agent

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.
