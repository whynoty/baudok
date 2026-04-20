"""
BauDok AI client — wraps the Anthropic SDK for report generation.
"""

import logging
from typing import Tuple

import anthropic
from django.conf import settings

from .exceptions import AIClientError, AIParseError
from .parsers import parse_ai_response
from .prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

MODEL = 'claude-sonnet-4-6'
MAX_TOKENS = 2048


class BauDokAIClient:
    """Thin wrapper around the Anthropic Messages API."""

    def __init__(self):
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key:
            raise AIClientError('ANTHROPIC_API_KEY ist nicht konfiguriert.')
        self._client = anthropic.Anthropic(api_key=api_key)

    def generate_report(
        self,
        raw_input: str,
        report_date: str,
        project_name: str,
        worker_name: str,
        trade: str,
    ) -> Tuple[dict, int]:
        """
        Call Claude to transform free-text worker input into structured report data.

        Returns:
            (structured_data dict, tokens_used int)

        Raises:
            AIParseError: If the response cannot be parsed after one retry.
            AIClientError: If the API call itself fails.
        """
        user_message = USER_PROMPT_TEMPLATE.format(
            report_date=report_date,
            project_name=project_name,
            worker_name=worker_name,
            trade=trade or 'Allgemein',
            raw_input=raw_input,
        )

        return self._call_with_retry(user_message)

    def _call_with_retry(self, user_message: str) -> Tuple[dict, int]:
        """Make the API call; on AIParseError retry once, then re-raise."""
        raw_text, tokens = self._call_api(user_message)

        try:
            structured_data = parse_ai_response(raw_text)
            return structured_data, tokens
        except AIParseError as first_error:
            logger.warning(
                'First AI parse attempt failed (%s). Retrying…',
                first_error,
            )

        # Retry
        raw_text, tokens = self._call_api(user_message)
        try:
            structured_data = parse_ai_response(raw_text)
            return structured_data, tokens
        except AIParseError:
            logger.error('Second AI parse attempt failed. Giving up.')
            raise

    def _call_api(self, user_message: str) -> Tuple[str, int]:
        """
        Perform a single API call.

        Returns:
            (raw response text, total tokens used)
        """
        try:
            response = self._client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[
                    {'role': 'user', 'content': user_message},
                ],
            )
        except anthropic.APIError as exc:
            logger.error('Anthropic API error: %s', exc)
            raise AIClientError(f'Anthropic API-Fehler: {exc}') from exc

        raw_text = response.content[0].text if response.content else ''
        tokens = response.usage.input_tokens + response.usage.output_tokens
        return raw_text, tokens
