from pydantic import BaseModel, Field
from typing import Literal


class MCQ(BaseModel):
    type: Literal["mcq"]
    sport: str
    difficulty: Literal["easy", "medium", "hard"]
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str
    explanation: str


class TrueFalse(BaseModel):
    type: Literal["true_false"]
    sport: str
    difficulty: Literal["easy", "medium", "hard"]
    statement: str
    correct_answer: Literal["True", "False"]
    explanation: str


class Poll(BaseModel):
    type: Literal["poll"]
    sport: str
    prompt: str
    options: list[str] = Field(..., min_length=2, max_length=2)
    opinion_based: bool = True


class FillBlank(BaseModel):
    type: Literal["fill_blank"]
    sport: str
    difficulty: Literal["easy", "medium", "hard"]
    sentence: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str
    explanation: str


class GuessNumber(BaseModel):
    type: Literal["guess_number"]
    sport: str
    difficulty: Literal["easy", "medium", "hard"]
    question: str
    target_number: int
    tolerance: int = Field(..., ge=0)
    explanation: str

class GenerationRequest(BaseModel):
    sport: str
    difficulty: Literal["easy", "medium", "hard"]
    content_type: Literal[
        "mcq",
        "true_false",
        "poll",
        "fill_blank",
        "guess_number",
        "mixed"
    ]
    quantity: int = Field(..., ge=1, le=5)