import json
import urllib.request


OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3"


def generate_question(
    sport: str,
    difficulty: str,
    quantity: int,
    content_type: str
):

    # Decide the required output format
    if content_type == "mcq":

        format_instruction = """
Each item must contain:
- question
- options: exactly 4 options
- correct_answer
- explanation
"""

    elif content_type == "true_false":

        format_instruction = """
Each item must contain:
- statement
- answer: exactly "True" or "False"
- explanation

Do NOT include options.
"""

    elif content_type == "fill_blank":

        format_instruction = """
Each item must contain:
- sentence_with_blank
- answer
- explanation

Use ___ to represent the blank.
"""

    elif content_type == "poll":

        format_instruction = """
Each item must contain:
- question
- options: exactly 4 options
- explanation

A poll does NOT have a correct_answer.
"""

    elif content_type == "guess_number":

        format_instruction = """
Each item must contain:
- question
- answer: a number
- explanation

The answer must be a numerical value.
"""

    elif content_type == "mixed":

        format_instruction = """
Generate a mixture of MCQ, True/False,
Fill in the Blank, Poll, and Guess Number content.

Each item must contain:
- type
- content appropriate to that type
- explanation
"""

    else:
        raise ValueError(
            f"Unsupported content type: {content_type}"
        )

    prompt = f"""
You are an expert sports content creator specializing in {sport}.

Generate exactly {quantity} different
{difficulty}-difficulty pieces of {content_type} content.

CONTENT TYPE:
{content_type}

FORMAT REQUIREMENTS:
{format_instruction}

IMPORTANT ACCURACY RULES:

1. Every question or statement MUST be factually correct.
2. Never invent rules, terminology, statistics, players,
   records, or facts.
3. The answer MUST actually be correct.
4. Avoid ambiguous questions.
5. Do not use outdated rules when current rules are known.
6. If a rule depends on the format, clearly mention
   Test, ODI, T20, etc.
7. Make every item different.
8. Keep explanations short and factually accurate.
9. Prefer well-established sports facts.

RETURN FORMAT:

Return ONLY a valid JSON array.

Do NOT use:
- Markdown
- ```json
- introductory text
- text after the JSON

Example structure:

[
    {{
        "question": "example question",
        "options": [
            "option 1",
            "option 2",
            "option 3",
            "option 4"
        ],
        "correct_answer": "option 1",
        "explanation": "short explanation"
    }}
]

Adapt the structure according to the requested
content type.

Before returning the final JSON, internally verify:
- factual accuracy
- answer correctness
- required fields
- no duplicate options
- no duplicate questions
- correct content type
"""

    data = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=data,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    with urllib.request.urlopen(
        request,
        timeout=180
    ) as response:

        result = json.loads(
            response.read().decode("utf-8")
        )

    ai_text = result["response"].strip()

    # Remove markdown code fences if Gemma adds them
    if ai_text.startswith("```"):
        ai_text = ai_text.replace("```json", "")
        ai_text = ai_text.replace("```", "")
        ai_text = ai_text.strip()

    # Convert AI output into Python object
    try:
        content = json.loads(ai_text)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"AI returned invalid JSON: {error}"
        )

    # Basic validation
    if not isinstance(content, list):
        raise ValueError(
            "AI response must be a JSON array."
        )

    if len(content) != quantity:
        raise ValueError(
            f"Expected {quantity} items, "
            f"but AI returned {len(content)}."
        )

    # Validate according to content type
    for item in content:

        if content_type == "mcq":

            required_fields = [
                "question",
                "options",
                "correct_answer",
                "explanation"
            ]

            for field in required_fields:
                if field not in item:
                    raise ValueError(
                        f"MCQ missing field: {field}"
                    )

            if len(item["options"]) != 4:
                raise ValueError(
                    "MCQ must have exactly 4 options."
                )

            if len(set(item["options"])) != 4:
                raise ValueError(
                    "MCQ contains duplicate options."
                )

            if item["correct_answer"] not in item["options"]:
                raise ValueError(
                    "Correct answer is not one of the options."
                )

        elif content_type == "true_false":

            required_fields = [
                "statement",
                "answer",
                "explanation"
            ]

            for field in required_fields:
                if field not in item:
                    raise ValueError(
                        f"True/False missing field: {field}"
                    )

            if item["answer"] not in ["True", "False"]:
                raise ValueError(
                    "True/False answer must be True or False."
                )

        elif content_type == "fill_blank":

            required_fields = [
                "sentence_with_blank",
                "answer",
                "explanation"
            ]

            for field in required_fields:
                if field not in item:
                    raise ValueError(
                        f"Fill blank missing field: {field}"
                    )

            if "___" not in item["sentence_with_blank"]:
                raise ValueError(
                    "Fill blank must contain ___."
                )

        elif content_type == "poll":

            required_fields = [
                "question",
                "options",
                "explanation"
            ]

            for field in required_fields:
                if field not in item:
                    raise ValueError(
                        f"Poll missing field: {field}"
                    )

            if len(item["options"]) != 4:
                raise ValueError(
                    "Poll must have exactly 4 options."
                )

        elif content_type == "guess_number":

            required_fields = [
                "question",
                "answer",
                "explanation"
            ]

            for field in required_fields:
                if field not in item:
                    raise ValueError(
                        f"Guess number missing field: {field}"
                    )

            if not isinstance(item["answer"], (int, float)):
                raise ValueError(
                    "Guess number answer must be numeric."
                )

    return content