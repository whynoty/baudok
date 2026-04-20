"""
Validation and parsing of the Claude AI JSON response into a BauDok structured_data dict.
"""

import json
import logging

from .exceptions import AIParseError

logger = logging.getLogger(__name__)

REQUIRED_KEYS = {
    'work_performed',
    'materials_used',
    'equipment',
    'personnel',
    'obstacles',
    'safety_notes',
    'general_notes',
    'summary',
}


def parse_ai_response(raw_text: str) -> dict:
    """
    Parse and validate the raw text from Claude.

    Args:
        raw_text: The raw string returned by the AI model.

    Returns:
        A validated dict containing all 8 required keys.

    Raises:
        AIParseError: If the text is not valid JSON or missing required keys.
    """
    raw_text = raw_text.strip()

    # Strip markdown code fences if present
    if raw_text.startswith('```'):
        lines = raw_text.splitlines()
        # Remove first and last fence lines
        raw_text = '\n'.join(
            line for line in lines
            if not line.strip().startswith('```')
        )

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        logger.error('AI response is not valid JSON: %s…', raw_text[:200])
        raise AIParseError(
            f'KI-Antwort ist kein valides JSON: {exc}',
            raw=raw_text,
        ) from exc

    if not isinstance(data, dict):
        raise AIParseError('KI-Antwort ist kein JSON-Objekt.', raw=raw_text)

    missing = REQUIRED_KEYS - data.keys()
    if missing:
        logger.error('AI response missing keys: %s', missing)
        raise AIParseError(
            f'KI-Antwort fehlen Pflichtfelder: {", ".join(sorted(missing))}',
            raw=raw_text,
        )

    # Normalise — ensure arrays are lists and summary is a string
    for key in REQUIRED_KEYS - {'summary'}:
        if not isinstance(data[key], list):
            data[key] = []

    if not isinstance(data.get('summary'), str):
        data['summary'] = ''

    return data
