import pytest
from unittest.mock import MagicMock, patch
from apps.ai.client import BauDokAIClient
from apps.ai.exceptions import AIParseError, AIClientError


VALID_RESPONSE_JSON = """{
  "work_performed": [{"description": "Betondecke gegossen", "duration_hours": 6, "location": "OG"}],
  "materials_used": [],
  "equipment": [{"name": "Betonmischer", "duration_hours": 6}],
  "personnel": [],
  "obstacles": [],
  "safety_notes": [],
  "general_notes": [],
  "summary": "Betondecke OG fertiggestellt."
}"""


def _make_mock_response(text: str, input_tokens: int = 100, output_tokens: int = 200):
    content_block = MagicMock()
    content_block.text = text
    usage = MagicMock()
    usage.input_tokens = input_tokens
    usage.output_tokens = output_tokens
    response = MagicMock()
    response.content = [content_block]
    response.usage = usage
    return response


class TestBauDokAIClient:
    @patch('apps.ai.client.anthropic.Anthropic')
    def test_generate_report_returns_structured_data_and_tokens(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_anthropic_cls.return_value = mock_client
        mock_client.messages.create.return_value = _make_mock_response(VALID_RESPONSE_JSON)

        with patch('django.conf.settings') as mock_settings:
            mock_settings.ANTHROPIC_API_KEY = 'test-key'
            client = BauDokAIClient.__new__(BauDokAIClient)
            client._client = mock_client

        data, tokens = client.generate_report(
            raw_input='Heute Beton gegossen',
            report_date='2026-04-20',
            project_name='Testprojekt',
            worker_name='Hans Müller',
            trade='Maurer',
        )

        assert 'work_performed' in data
        assert tokens == 300

    @patch('apps.ai.client.anthropic.Anthropic')
    def test_retries_once_on_parse_error(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_anthropic_cls.return_value = mock_client

        invalid_response = _make_mock_response('not json')
        valid_response = _make_mock_response(VALID_RESPONSE_JSON)
        mock_client.messages.create.side_effect = [invalid_response, valid_response]

        client = BauDokAIClient.__new__(BauDokAIClient)
        client._client = mock_client

        data, tokens = client._call_with_retry('test message')
        assert 'work_performed' in data
        assert mock_client.messages.create.call_count == 2

    @patch('apps.ai.client.anthropic.Anthropic')
    def test_raises_parse_error_after_two_failures(self, mock_anthropic_cls):
        mock_client = MagicMock()
        mock_anthropic_cls.return_value = mock_client
        mock_client.messages.create.return_value = _make_mock_response('bad json always')

        client = BauDokAIClient.__new__(BauDokAIClient)
        client._client = mock_client

        with pytest.raises(AIParseError):
            client._call_with_retry('test message')
