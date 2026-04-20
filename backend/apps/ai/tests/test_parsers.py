import pytest
from apps.ai.parsers import parse_ai_response
from apps.ai.exceptions import AIParseError

VALID_JSON = """{
  "work_performed": [{"description": "Elektroleitungen verlegt", "duration_hours": 8.0, "location": "EG"}],
  "materials_used": [{"name": "NYM-J 3x1.5mm²", "quantity": "50m", "note": ""}],
  "equipment": [],
  "personnel": [{"role": "Elektriker", "count": 2, "hours": 8}],
  "obstacles": [],
  "safety_notes": [],
  "general_notes": [],
  "summary": "Elektroinstallation EG erfolgreich abgeschlossen."
}"""


class TestParseAIResponse:
    def test_parses_valid_json(self):
        result = parse_ai_response(VALID_JSON)
        assert isinstance(result, dict)
        assert len(result['work_performed']) == 1

    def test_returns_all_required_keys(self):
        result = parse_ai_response(VALID_JSON)
        required = {'work_performed', 'materials_used', 'equipment', 'personnel',
                    'obstacles', 'safety_notes', 'general_notes', 'summary'}
        assert required.issubset(result.keys())

    def test_strips_markdown_fences(self):
        fenced = f'```json\n{VALID_JSON}\n```'
        result = parse_ai_response(fenced)
        assert 'work_performed' in result

    def test_raises_on_invalid_json(self):
        with pytest.raises(AIParseError) as exc_info:
            parse_ai_response('not json at all')
        assert exc_info.value.raw == 'not json at all'

    def test_raises_on_missing_keys(self):
        partial = '{"work_performed": [], "summary": ""}'
        with pytest.raises(AIParseError) as exc_info:
            parse_ai_response(partial)
        assert 'materials_used' in str(exc_info.value)

    def test_normalises_non_list_to_empty_list(self):
        data = VALID_JSON.replace('"equipment": []', '"equipment": null')
        result = parse_ai_response(data)
        assert result['equipment'] == []

    def test_raises_parse_error_has_raw_attribute(self):
        try:
            parse_ai_response('bad')
        except AIParseError as exc:
            assert hasattr(exc, 'raw')
            assert exc.raw == 'bad'

    def test_extra_keys_are_accepted_without_error(self):
        """Extra fields beyond the 8 required keys must not raise."""
        import json
        base = json.loads(VALID_JSON)
        base['unexpected_field'] = 'some value'
        base['another_extra'] = [1, 2, 3]
        result = parse_ai_response(json.dumps(base))
        assert isinstance(result, dict)
        assert 'work_performed' in result
