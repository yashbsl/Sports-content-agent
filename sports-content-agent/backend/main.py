from fastapi import FastAPI
from schemas.content import GenerationRequest
from services.ai_generator import generate_question

app = FastAPI(
    title="Sports Engagement AI",
    description="AI-powered sports content generation agent"
)


@app.get("/")
def root():
    return {
        "message": "Sports Engagement AI is running!"
    }


@app.post("/generate")
def generate_content(request: GenerationRequest):

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