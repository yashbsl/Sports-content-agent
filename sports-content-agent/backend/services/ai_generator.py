import json
import os
import re
from typing import Any

import requests

from services.web_search import search_web


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


# ============================================================
# SUPPORTED TYPES
# ============================================================

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
# GENERAL HELPERS
# ============================================================

def clean_string(value: Any) -> str:

    if not isinstance(value, str):
        raise ValueError(
            "Expected a string value."
        )

    value = re.sub(
        r"\s+",
        " ",
        value.strip()
    )

    if not value:
        raise ValueError(
            "Value cannot be empty."
        )

    return value


def unique_strings(
    values: list[str]
) -> bool:

    normalized = [
        value.casefold()
        for value in values
    ]

    return len(normalized) == len(
        set(normalized)
    )


# ============================================================
# WEB SEARCH CONTEXT
# ============================================================

def get_web_context(
    sport: str,
    content_type: str,
    difficulty: str
):
    """
    Search the web for relevant sports information.

    For factual formats, retrieved information is passed
    into the LLM so the model can ground its answer.
    """

    if content_type == "poll":

        # Poll is opinion based, so factual retrieval is not necessary.
        return []

    query = (
        f"{sport} {content_type} "
        f"{difficulty} rules facts statistics records"
    )

    try:

        sources = search_web(
            query=query,
            max_results=5
        )

        return sources

    except Exception:
        # We don't silently fabricate context.
        # Generation can continue, but the item will be marked
        # as not web-grounded.
        return []


def format_sources_for_prompt(
    sources: list[dict]
) -> str:

    if not sources:

        return (
            "No web sources were retrieved. "
            "Use only highly established facts and do not "
            "invent uncertain information."
        )

    parts = []

    for index, source in enumerate(
        sources,
        start=1
    ):

        parts.append(
            f"""
SOURCE {index}
Title: {source["title"]}
URL: {source["url"]}
Information: {source["snippet"]}
"""
        )

    return "\n".join(parts)


def build_source_objects(
    sources: list[dict]
):
    """
    Keep only useful fields for the API response.
    """

    result = []

    for source in sources:

        result.append({
            "title": source["title"],
            "url": source["url"],
        })

    return result


# ============================================================
# JSON PARSING
# ============================================================

def extract_json(
    text: str
):

    text = text.strip()

    # Remove markdown fences
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

    # Direct JSON
    try:

        return json.loads(text)

    except json.JSONDecodeError:
        pass

    # Find JSON object
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
                    return json.loads(
                        candidate
                    )

                except json.JSONDecodeError:
                    break

    raise ValueError(
        f"AI returned invalid JSON:\n{text}"
    )


# ============================================================
# OLLAMA
# ============================================================

def call_ollama(
    prompt: str
):

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.15,
            "top_p": 0.8,
            "num_predict": 2200,
        },
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

    return extract_json(
        raw_response
    )


# ============================================================
# PROMPTS
# ============================================================

def build_mcq_prompt(
    sport,
    difficulty,
    quantity,
    source_context
):

    return f"""
You are an expert {sport} sports content generator.

Generate exactly {quantity} MCQs.

Difficulty: {difficulty}

Use the retrieved sources below as factual grounding.

RETRIEVED SOURCES:
{source_context}

STRICT RULES:

1. Questions MUST be about {sport}.
2. Use factual information supported by the sources whenever possible.
3. Do NOT invent facts.
4. Do NOT invent statistics.
5. Do NOT invent records.
6. Exactly 4 options.
7. All 4 options must be different.
8. Exactly ONE option is correct.
9. correct_answer MUST exactly match one option.
10. Do not use A/B/C/D as correct_answer.
11. Do not use "all of the above".
12. Do not use "none of the above".
13. Explanation must support the selected answer.
14. Do not create mathematically or physically impossible sports facts.
15. Keep the question concise.

Return ONLY this JSON:

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
    source_context
):

    return f"""
You are an expert {sport} sports content generator.

Generate exactly {quantity} True/False questions.

Difficulty: {difficulty}

Use these sources for factual grounding:

{source_context}

RULES:

1. Statement must be objectively true or false.
2. No opinions.
3. No ambiguous wording.
4. Do not invent facts.
5. Explanation must justify the answer.
6. Use established facts supported by sources.

Return ONLY:

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
You are an expert sports engagement content creator.

Generate exactly {quantity} opinion-based polls about {sport}.

Difficulty: {difficulty}

IMPORTANT:

1. Polls are opinion based.
2. Do not claim one answer is objectively correct.
3. Every poll must have EXACTLY 2 options.
4. Options must be different.
5. Do not include correct_answer.
6. Keep them relevant to {sport}.

Return ONLY:

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
    source_context
):

    return f"""
You are an expert {sport} sports quiz generator.

Generate exactly {quantity} fill-in-the-blank questions.

Difficulty: {difficulty}

Use these sources:

{source_context}

RULES:

1. The blank must have one objectively correct answer.
2. Exactly 4 answer options.
3. Options must be different.
4. correct_answer must exactly match one option.
5. Do not invent information.
6. Explanation must support the answer.

Return ONLY:

{{
  "items": [
    {{
      "question": "Complete the statement: ____",
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
    source_context
):

    return f"""
You are an expert {sport} sports quiz generator.

Generate exactly {quantity} Guess-the-Number questions.

Difficulty: {difficulty}

Use these sources for the numerical facts:

{source_context}

RULES:

1. Use a real established numerical fact.
2. Do not invent statistics.
3. Target must be numeric.
4. Tolerance must be numeric and non-negative.
5. Question must clearly ask for the number.
6. Explanation must support the number.

Return ONLY:

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
# VALIDATION
# ============================================================

def validate_mcq(
    item
):

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

    question = clean_string(
        item["question"]
    )

    options = item["options"]

    if not isinstance(
        options,
        list
    ):

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

    correct = clean_string(
        item["correct_answer"]
    )

    matching_option = None

    for option in options:

        if option.casefold() == correct.casefold():

            matching_option = option
            break

    if matching_option is None:

        raise ValueError(
            "correct_answer must match one of the options."
        )

    return {
        "question": question,
        "options": options,
        "correct_answer": matching_option,
        "explanation": clean_string(
            item["explanation"]
        ),
    }


def validate_true_false(
    item
):

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

    if isinstance(
        answer,
        bool
    ):

        final_answer = answer

    else:

        value = str(
            answer
        ).lower().strip()

        if value == "true":

            final_answer = True

        elif value == "false":

            final_answer = False

        else:

            raise ValueError(
                "True/False answer must be "
                "true or false."
            )

    return {
        "question": clean_string(
            item["question"]
        ),
        "correct_answer": final_answer,
        "explanation": clean_string(
            item["explanation"]
        ),
    }


def validate_poll(
    item
):

    if "question" not in item:

        raise ValueError(
            "Poll missing question."
        )

    if "options" not in item:

        raise ValueError(
            "Poll missing options."
        )

    options = item["options"]

    if not isinstance(
        options,
        list
    ):

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
        "opinion_based": True,
    }


def validate_fill_blank(
    item
):

    required = [
        "question",
        "options",
        "correct_answer",
        "explanation"
    ]

    for field in required:

        if field not in item:

            raise ValueError(
                f"Fill blank missing field: {field}"
            )

    options = item["options"]

    if not isinstance(
        options,
        list
    ):

        raise ValueError(
            "Fill blank options must be a list."
        )

    if len(options) != 4:

        raise ValueError(
            "Fill blank must have exactly 4 options."
        )

    options = [
        clean_string(option)
        for option in options
    ]

    if not unique_strings(options):

        raise ValueError(
            "Fill blank options must be unique."
        )

    correct = clean_string(
        item["correct_answer"]
    )

    matching = None

    for option in options:

        if option.casefold() == correct.casefold():

            matching = option
            break

    if matching is None:

        raise ValueError(
            "Fill blank correct_answer must "
            "match one of the options."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "options": options,
        "correct_answer": matching,
        "explanation": clean_string(
            item["explanation"]
        ),
    }


def validate_guess_number(
    item
):

    required = [
        "question",
        "target",
        "tolerance",
        "explanation"
    ]

    for field in required:

        if field not in item:

            raise ValueError(
                f"Guess number missing field: {field}"
            )

    if isinstance(
        item["target"],
        bool
    ):

        raise ValueError(
            "Target must be numeric."
        )

    if isinstance(
        item["tolerance"],
        bool
    ):

        raise ValueError(
            "Tolerance must be numeric."
        )

    if not isinstance(
        item["target"],
        (int, float)
    ):

        raise ValueError(
            "Target must be numeric."
        )

    if not isinstance(
        item["tolerance"],
        (int, float)
    ):

        raise ValueError(
            "Tolerance must be numeric."
        )

    if item["tolerance"] < 0:

        raise ValueError(
            "Tolerance cannot be negative."
        )

    return {
        "question": clean_string(
            item["question"]
        ),
        "target": item["target"],
        "tolerance": item["tolerance"],
        "explanation": clean_string(
            item["explanation"]
        ),
    }


def validate_mixed(
    item
):

    content_type = item.get(
        "type"
    )

    if content_type == "mcq":

        result = validate_mcq(
            item
        )

    elif content_type == "true_false":

        result = validate_true_false(
            item
        )

    elif content_type == "poll":

        result = validate_poll(
            item
        )

    elif content_type == "fill_blank":

        result = validate_fill_blank(
            item
        )

    elif content_type == "guess_number":

        result = validate_guess_number(
            item
        )

    else:

        raise ValueError(
            f"Unsupported mixed type: {content_type}"
        )

    result["type"] = content_type

    return result


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
    # Get web context
    # --------------------------------------------------------

    sources = get_web_context(
        sport=sport,
        content_type=content_type,
        difficulty=difficulty
    )

    source_context = format_sources_for_prompt(
        sources
    )

    # --------------------------------------------------------
    # Build correct prompt
    # --------------------------------------------------------

    if content_type == "mcq":

        prompt = build_mcq_prompt(
            sport,
            difficulty,
            quantity,
            source_context
        )

    elif content_type == "true_false":

        prompt = build_true_false_prompt(
            sport,
            difficulty,
            quantity,
            source_context
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
            source_context
        )

    elif content_type == "guess_number":

        prompt = build_guess_number_prompt(
            sport,
            difficulty,
            quantity,
            source_context
        )

    else:

        prompt = f"""
{COMMON_RULES}

Generate exactly {quantity} mixed content items about {sport}.

Use these types:
- mcq
- true_false
- poll
- fill_blank
- guess_number

Use the retrieved information below:

{source_context}

Every item MUST contain:

"type"

Return ONLY:

{{
  "items": [...]
}}
"""

    # --------------------------------------------------------
    # Retry generation
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
                    f"AI generated {len(items)} "
                    f"items, expected {quantity}."
                )

            validated_items = []

            for item in items[:quantity]:

                if content_type == "mcq":

                    validated = validate_mcq(
                        item
                    )

                elif content_type == "true_false":

                    validated = validate_true_false(
                        item
                    )

                elif content_type == "poll":

                    validated = validate_poll(
                        item
                    )

                elif content_type == "fill_blank":

                    validated = validate_fill_blank(
                        item
                    )

                elif content_type == "guess_number":

                    validated = validate_guess_number(
                        item
                    )

                else:

                    validated = validate_mixed(
                        item
                    )

                # Add sources for factual content.
                if content_type != "poll":

                    validated["sources"] = (
                        build_source_objects(
                            sources
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

The previous response failed validation.

Make sure:
- JSON is valid.
- Quantity is exactly {quantity}.
- All required fields exist.
- MCQ has exactly 4 unique options.
- MCQ correct_answer exactly matches an option.
- Poll has exactly 2 unique options.
- Fill blank has exactly 4 unique options.
- Guess number target and tolerance are numeric.
- Do not invent facts.
"""

    raise RuntimeError(
        f"Generation failed after 3 attempts: "
        f"{last_error}"
    )