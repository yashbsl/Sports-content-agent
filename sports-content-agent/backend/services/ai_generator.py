import json
import os
import re
from typing import Any

import requests
from dotenv import load_dotenv

from services.web_search import search_web
from services.vector_store import search_knowledge


load_dotenv()


# ============================================================
# CONFIG
# ============================================================

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434/api/generate"
)

MODEL = os.getenv(
    "OLLAMA_MODEL",
    "gemma3:latest"
)

OLLAMA_TIMEOUT = int(
    os.getenv("OLLAMA_TIMEOUT", "180")
)


SUPPORTED_CONTENT_TYPES = {
    "mcq",
    "true_false",
    "poll",
    "fill_blank",
    "guess_number",
    "mixed",
}

SUPPORTED_DIFFICULTIES = {
    "easy",
    "medium",
    "hard",
}


# ============================================================
# HELPERS
# ============================================================

def clean_string(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("Expected a string.")

    value = re.sub(
        r"\s+",
        " ",
        value.strip()
    )

    if not value:
        raise ValueError("Value cannot be empty.")

    return value


def unique_strings(values):
    normalized = [
        value.casefold()
        for value in values
    ]

    return len(normalized) == len(set(normalized))


# ============================================================
# WEB SEARCH
# ============================================================

def get_web_context(
    sport,
    content_type,
    difficulty
):
    """
    Retrieve current/relevant sports information
    from web search.
    """

    if content_type == "poll":
        return []

    query = (
        f"{sport} {content_type} "
        f"{difficulty} rules facts statistics records"
    )

    try:
        return search_web(
            query=query,
            max_results=5
        )

    except Exception:
        return []


def format_web_context(sources):
    if not sources:
        return "No web sources were retrieved."

    parts = []

    for index, source in enumerate(
        sources,
        start=1
    ):
        parts.append(
            f"""
WEB SOURCE {index}
Title: {source.get("title", "")}
URL: {source.get("url", "")}
Information: {source.get("snippet", "")}
"""
        )

    return "\n".join(parts)


def build_source_objects(sources):
    return [
        {
            "title": source.get("title", ""),
            "url": source.get("url", "")
        }
        for source in sources
    ]


# ============================================================
# CHROMADB
# ============================================================

def get_knowledge_context(
    sport,
    content_type,
    difficulty
):
    """
    Retrieve stable/historical sports facts
    from ChromaDB.
    """

    query = (
        f"{sport} {content_type} "
        f"{difficulty} rules facts history statistics"
    )

    try:
        return search_knowledge(
            query=query,
            sport=sport,
            top_k=4
        )

    except Exception:
        return []


def format_knowledge_context(results):
    if not results:
        return "No local knowledge-base facts were found."

    parts = []

    for index, item in enumerate(
        results,
        start=1
    ):
        parts.append(
            f"""
KNOWLEDGE BASE FACT {index}
Category: {item.get("category", "")}
Fact: {item.get("text", "")}
"""
        )

    return "\n".join(parts)


def build_knowledge_objects(results):
    return [
        {
            "id": item.get("id", ""),
            "category": item.get("category", ""),
            "text": item.get("text", "")
        }
        for item in results
    ]


# ============================================================
# JSON PARSER
# ============================================================

def extract_json(text):

    text = text.strip()

    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")

    if start == -1:
        raise ValueError(
            "AI did not return JSON."
        )

    depth = 0
    in_string = False
    escaped = False

    for index in range(
        start,
        len(text)
    ):
        char = text[index]

        if escaped:
            escaped = False
            continue

        if char == "\\":
            escaped = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "{":
            depth += 1

        elif char == "}":
            depth -= 1

            if depth == 0:
                candidate = text[
                    start:index + 1
                ]

                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    break

    raise ValueError(
        f"Invalid JSON from AI:\n{text}"
    )


# ============================================================
# OLLAMA
# ============================================================

def call_ollama(prompt):

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.15,
            "top_p": 0.8,
            "num_predict": 2200
        }
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=OLLAMA_TIMEOUT
        )

    except requests.exceptions.ConnectionError as error:
        raise RuntimeError(
            "Cannot connect to Ollama. "
            "Make sure Ollama is running."
        ) from error

    except requests.exceptions.Timeout as error:
        raise RuntimeError(
            "Ollama request timed out."
        ) from error

    except requests.exceptions.RequestException as error:
        raise RuntimeError(
            f"Ollama request failed: {error}"
        ) from error

    if response.status_code != 200:
        raise RuntimeError(
            f"Ollama returned HTTP "
            f"{response.status_code}: "
            f"{response.text}"
        )

    try:
        data = response.json()
    except json.JSONDecodeError as error:
        raise RuntimeError(
            "Ollama returned invalid HTTP JSON."
        ) from error

    raw_response = data.get(
        "response",
        ""
    ).strip()

    if not raw_response:
        raise RuntimeError(
            "Ollama returned an empty response."
        )

    return extract_json(raw_response)


# ============================================================
# COMMON PROMPT
# ============================================================

COMMON_RULES = """
You are an expert sports content generator.

IMPORTANT:

1. Use the supplied retrieved context.
2. Prefer facts directly supported by the retrieved context.
3. Never invent statistics.
4. Never invent records.
5. Never invent players, teams, rules or events.
6. Never create mathematically impossible sports facts.
7. Keep content relevant to the requested sport.
8. Return ONLY valid JSON.
9. Do not return markdown.
10. Do not add text outside the JSON.
"""


# ============================================================
# PROMPTS
# ============================================================

def build_mcq_prompt(
    sport,
    difficulty,
    quantity,
    web_context,
    knowledge_context
):
    return f"""
{COMMON_RULES}

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

WEB SEARCH CONTEXT:
{web_context}

CHROMADB CONTEXT:
{knowledge_context}

Generate exactly {quantity} MCQs.

MCQ RULES:

- Exactly 4 options.
- Options must be unique.
- Exactly one correct answer.
- correct_answer must exactly match one option.
- No "all of the above".
- No "none of the above".
- Explanation must support the answer.

Return:

{{
  "items": [
    {{
      "question": "...",
      "options": [
        "...",
        "...",
        "...",
        "..."
      ],
      "correct_answer": "...",
      "explanation": "..."
    }}
  ]
}}
"""


def build_true_false_prompt(
    sport,
    difficulty,
    quantity,
    web_context,
    knowledge_context
):
    return f"""
{COMMON_RULES}

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

WEB SEARCH CONTEXT:
{web_context}

CHROMADB CONTEXT:
{knowledge_context}

Generate exactly {quantity} True/False questions.

Rules:
- Statement must be objectively true or false.
- No opinions.
- No ambiguity.
- Explanation must justify the answer.

Return:

{{
  "items": [
    {{
      "question": "...",
      "correct_answer": true,
      "explanation": "..."
    }}
  ]
}}
"""


def build_poll_prompt(
    sport,
    difficulty,
    quantity
):
    return f"""
You are an expert sports engagement generator.

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

Generate exactly {quantity} opinion-based polls.

Rules:
- Exactly 2 options.
- Options must be different.
- No correct answer.
- Poll must be opinion based.
- Keep it relevant to {sport}.

Return:

{{
  "items": [
    {{
      "question": "...",
      "options": [
        "...",
        "..."
      ],
      "opinion_based": true
    }}
  ]
}}
"""


def build_fill_blank_prompt(
    sport,
    difficulty,
    quantity,
    web_context,
    knowledge_context
):
    return f"""
{COMMON_RULES}

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

WEB SEARCH CONTEXT:
{web_context}

CHROMADB CONTEXT:
{knowledge_context}

Generate exactly {quantity} fill-in-the-blank questions.

Rules:
- Exactly 4 options.
- Options must be unique.
- Exactly one correct answer.
- correct_answer must exactly match one option.
- Explanation must support the answer.

Return:

{{
  "items": [
    {{
      "question": "... ____ ...",
      "options": [
        "...",
        "...",
        "...",
        "..."
      ],
      "correct_answer": "...",
      "explanation": "..."
    }}
  ]
}}
"""


def build_guess_number_prompt(
    sport,
    difficulty,
    quantity,
    web_context,
    knowledge_context
):
    return f"""
{COMMON_RULES}

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

WEB SEARCH CONTEXT:
{web_context}

CHROMADB CONTEXT:
{knowledge_context}

Generate exactly {quantity} Guess-the-Number questions.

Rules:
- Use a real numerical sports fact.
- target must be numeric.
- tolerance must be numeric.
- tolerance must not be negative.
- Explanation must support the target.

Return:

{{
  "items": [
    {{
      "question": "...",
      "target": 100,
      "tolerance": 5,
      "explanation": "..."
    }}
  ]
}}
"""


# ============================================================
# VALIDATORS
# ============================================================

def validate_mcq(item):

    required = [
        "question",
        "options",
        "correct_answer",
        "explanation"
    ]

    for field in required:
        if field not in item:
            raise ValueError(
                f"MCQ missing field: {field}"
            )

    options = item["options"]

    if not isinstance(options, list):
        raise ValueError(
            "MCQ options must be a list."
        )

    if len(options) != 4:
        raise ValueError(
            "MCQ must have exactly 4 options."
        )

    options = [
        clean_string(option)
        for option in options
    ]

    if not unique_strings(options):
        raise ValueError(
            "MCQ options must be unique."
        )

    correct_answer = clean_string(
        item["correct_answer"]
    )

    correct_option = None

    for option in options:
        if option.casefold() == correct_answer.casefold():
            correct_option = option
            break

    if correct_option is None:
        raise ValueError(
            "correct_answer must match "
            "one of the options."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "options": options,
        "correct_answer": correct_option,
        "explanation": clean_string(
            item["explanation"]
        )
    }


def validate_true_false(item):

    required = [
        "question",
        "correct_answer",
        "explanation"
    ]

    for field in required:
        if field not in item:
            raise ValueError(
                f"True/False missing field: {field}"
            )

    answer = item["correct_answer"]

    if isinstance(answer, bool):
        final_answer = answer
    else:
        value = str(answer).strip().lower()

        if value == "true":
            final_answer = True
        elif value == "false":
            final_answer = False
        else:
            raise ValueError(
                "True/False answer must be true or false."
            )

    return {
        "question": clean_string(
            item["question"]
        ),
        "correct_answer": final_answer,
        "explanation": clean_string(
            item["explanation"]
        )
    }


def validate_poll(item):

    if "question" not in item:
        raise ValueError(
            "Poll missing question."
        )

    if "options" not in item:
        raise ValueError(
            "Poll missing options."
        )

    options = item["options"]

    if not isinstance(options, list):
        raise ValueError(
            "Poll options must be a list."
        )

    if len(options) != 2:
        raise ValueError(
            "Poll must have exactly 2 options."
        )

    options = [
        clean_string(option)
        for option in options
    ]

    if not unique_strings(options):
        raise ValueError(
            "Poll options must be unique."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "options": options,
        "opinion_based": True
    }


def validate_fill_blank(item):

    required = [
        "question",
        "options",
        "correct_answer",
        "explanation"
    ]

    for field in required:
        if field not in item:
            raise ValueError(
                f"Fill Blank missing field: {field}"
            )

    options = item["options"]

    if not isinstance(options, list):
        raise ValueError(
            "Fill Blank options must be a list."
        )

    if len(options) != 4:
        raise ValueError(
            "Fill Blank must have exactly 4 options."
        )

    options = [
        clean_string(option)
        for option in options
    ]

    if not unique_strings(options):
        raise ValueError(
            "Fill Blank options must be unique."
        )

    correct_answer = clean_string(
        item["correct_answer"]
    )

    correct_option = None

    for option in options:
        if option.casefold() == correct_answer.casefold():
            correct_option = option
            break

    if correct_option is None:
        raise ValueError(
            "Fill Blank correct_answer must "
            "match one option."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "options": options,
        "correct_answer": correct_option,
        "explanation": clean_string(
            item["explanation"]
        )
    }


def validate_guess_number(item):

    required = [
        "question",
        "target",
        "tolerance",
        "explanation"
    ]

    for field in required:
        if field not in item:
            raise ValueError(
                f"Guess Number missing field: {field}"
            )

    target = item["target"]
    tolerance = item["tolerance"]

    if isinstance(target, bool) or not isinstance(
        target,
        (int, float)
    ):
        raise ValueError(
            "Target must be numeric."
        )

    if isinstance(tolerance, bool) or not isinstance(
        tolerance,
        (int, float)
    ):
        raise ValueError(
            "Tolerance must be numeric."
        )

    if tolerance < 0:
        raise ValueError(
            "Tolerance cannot be negative."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "target": target,
        "tolerance": tolerance,
        "explanation": clean_string(
            item["explanation"]
        )
    }


# ============================================================
# MAIN GENERATOR
# ============================================================

def generate_question(
    sport: str,
    difficulty: str = "medium",
    quantity: int = 1,
    content_type: str = "mcq"
):

    sport = clean_string(
        sport
    )

    difficulty = difficulty.strip().lower()
    content_type = content_type.strip().lower()

    if difficulty not in SUPPORTED_DIFFICULTIES:
        raise ValueError(
            "Difficulty must be easy, medium or hard."
        )

    if content_type not in SUPPORTED_CONTENT_TYPES:
        raise ValueError(
            "Unsupported content type."
        )

    if quantity < 1 or quantity > 20:
        raise ValueError(
            "Quantity must be between 1 and 20."
        )

    # --------------------------------------------------------
    # RETRIEVE WEB DATA
    # --------------------------------------------------------

    web_sources = get_web_context(
        sport=sport,
        content_type=content_type,
        difficulty=difficulty
    )

    # --------------------------------------------------------
    # RETRIEVE CHROMADB DATA
    # --------------------------------------------------------

    knowledge_results = get_knowledge_context(
        sport=sport,
        content_type=content_type,
        difficulty=difficulty
    )

    # --------------------------------------------------------
    # FORMAT CONTEXT
    # --------------------------------------------------------

    web_context = format_web_context(
        web_sources
    )

    knowledge_context = format_knowledge_context(
        knowledge_results
    )

    # --------------------------------------------------------
    # BUILD PROMPT
    # --------------------------------------------------------

    if content_type == "mcq":

        prompt = build_mcq_prompt(
            sport,
            difficulty,
            quantity,
            web_context,
            knowledge_context
        )

    elif content_type == "true_false":

        prompt = build_true_false_prompt(
            sport,
            difficulty,
            quantity,
            web_context,
            knowledge_context
        )

    elif content_type == "poll":

        prompt = build_poll_prompt(
            sport,
            difficulty,
            quantity
        )

    elif content_type == "fill_blank":

        prompt = build_fill_blank_prompt(
            sport,
            difficulty,
            quantity,
            web_context,
            knowledge_context
        )

    elif content_type == "guess_number":

        prompt = build_guess_number_prompt(
            sport,
            difficulty,
            quantity,
            web_context,
            knowledge_context
        )

    else:

        prompt = f"""
{COMMON_RULES}

SPORT: {sport}
DIFFICULTY: {difficulty}
QUANTITY: {quantity}

WEB SEARCH:
{web_context}

CHROMADB:
{knowledge_context}

Generate exactly {quantity} mixed items.

Return:

{{
  "items": [...]
}}
"""

    # --------------------------------------------------------
    # GENERATE + VALIDATE
    # --------------------------------------------------------

    last_error = None

    for attempt in range(3):

        try:

            data = call_ollama(
                prompt
            )

            items = data.get(
                "items"
            )

            if not isinstance(
                items,
                list
            ):
                raise ValueError(
                    "AI response does not contain "
                    "an items array."
                )

            if len(items) < quantity:
                raise ValueError(
                    f"AI generated {len(items)} items, "
                    f"expected {quantity}."
                )

            validated_items = []

            for raw_item in items[:quantity]:

                if content_type == "mcq":

                    validated = validate_mcq(
                        raw_item
                    )

                elif content_type == "true_false":

                    validated = validate_true_false(
                        raw_item
                    )

                elif content_type == "poll":

                    validated = validate_poll(
                        raw_item
                    )

                elif content_type == "fill_blank":

                    validated = validate_fill_blank(
                        raw_item
                    )

                elif content_type == "guess_number":

                    validated = validate_guess_number(
                        raw_item
                    )

                else:

                    item_type = raw_item.get(
                        "type"
                    )

                    if item_type == "mcq":
                        validated = validate_mcq(
                            raw_item
                        )

                    elif item_type == "true_false":
                        validated = validate_true_false(
                            raw_item
                        )

                    elif item_type == "poll":
                        validated = validate_poll(
                            raw_item
                        )

                    elif item_type == "fill_blank":
                        validated = validate_fill_blank(
                            raw_item
                        )

                    elif item_type == "guess_number":
                        validated = validate_guess_number(
                            raw_item
                        )

                    else:
                        raise ValueError(
                            f"Unknown mixed type: {item_type}"
                        )

                    validated["type"] = item_type

                # ------------------------------------------------
                # Attach grounding information
                # ------------------------------------------------

                if content_type != "poll":

                    validated["sources"] = (
                        build_source_objects(
                            web_sources
                        )
                    )

                    validated["knowledge_sources"] = (
                        build_knowledge_objects(
                            knowledge_results
                        )
                    )

                validated_items.append(
                    validated
                )

            return validated_items

        except Exception as error:

            last_error = error

            prompt += f"""

RETRY {attempt + 1}

Previous generation failed validation.

Follow EXACTLY:

- Generate exactly {quantity} items.
- MCQ = exactly 4 unique options.
- MCQ correct_answer must match an option.
- Poll = exactly 2 unique options.
- Fill Blank = exactly 4 unique options.
- Guess Number = numeric target and tolerance.
- Use the supplied web and ChromaDB context.
- Do not invent facts.
- Return only JSON.
"""

    raise RuntimeError(
        f"Generation failed after 3 attempts: "
        f"{last_error}"
    )