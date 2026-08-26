import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from services.ai_generator import generate_question


app = FastAPI(
    title="Sports Content AI",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sports-content-agent-eight.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerationRequest(BaseModel):
    sport: str
    difficulty: str = "medium"
    content_type: str = "mcq"
    quantity: int = Field(default=1, ge=1, le=20)


@app.get("/")
def root():
    return {
        "message": "Sports Content AI API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }


@app.post("/generate")
def generate_content(request: GenerationRequest):

    try:
        result = generate_question(
            sport=request.sport,
            difficulty=request.difficulty,
            quantity=request.quantity,
            content_type=request.content_type
        )

        return {
            "sport": request.sport,
            "difficulty": request.difficulty,
            "content_type": request.content_type,
            "quantity": request.quantity,
            "generated_content": result
        }

    except ValueError as error:
        # Bad input, e.g. invalid content_type or difficulty
        raise HTTPException(status_code=400, detail=str(error))

    except RuntimeError as error:
        # Missing API keys or total generation failure
        raise HTTPException(status_code=500, detail=str(error))

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
