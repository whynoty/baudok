import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status


WEATHER_URL = "/api/v1/weather/"


def _make_open_meteo_response(weather_code, temp_max=22.5, temp_min=10.1):
    """Return a mock requests.Response with a typical Open-Meteo daily payload."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "daily": {
            "time": ["2026-04-21"],
            "weathercode": [weather_code],
            "temperature_2m_max": [temp_max],
            "temperature_2m_min": [temp_min],
        }
    }
    mock_resp.raise_for_status.return_value = None
    return mock_resp


@pytest.mark.django_db
class TestWeatherView:

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def test_unauthenticated_request_returns_401(self, api_client):
        response = api_client.get(WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ------------------------------------------------------------------
    # Happy path
    # ------------------------------------------------------------------

    def test_valid_params_sunny_returns_200_with_sonnig(self, worker_client):
        with patch("apps.reports.views_weather.requests.get") as mock_get:
            mock_get.return_value = _make_open_meteo_response(weather_code=0, temp_max=18.2, temp_min=9.4)
            response = worker_client.get(
                WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == "Sonnig"
        assert data["temperature_max"] == 18.2
        assert data["temperature_min"] == 9.4
        assert data["unit"] == "°C"

    def test_weather_code_1_returns_leicht_bewoelkt(self, worker_client):
        with patch("apps.reports.views_weather.requests.get") as mock_get:
            mock_get.return_value = _make_open_meteo_response(weather_code=1)
            response = worker_client.get(
                WEATHER_URL, {"lat": "52.52", "lon": "13.405", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["description"] == "Leicht bewölkt"

    def test_weather_code_63_returns_regen(self, worker_client):
        with patch("apps.reports.views_weather.requests.get") as mock_get:
            mock_get.return_value = _make_open_meteo_response(weather_code=63)
            response = worker_client.get(
                WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["description"] == "Regen"

    def test_unknown_weather_code_returns_unbekannt(self, worker_client):
        with patch("apps.reports.views_weather.requests.get") as mock_get:
            mock_get.return_value = _make_open_meteo_response(weather_code=999)
            response = worker_client.get(
                WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["description"] == "Unbekannt"

    # ------------------------------------------------------------------
    # Validation errors — 400
    # ------------------------------------------------------------------

    def test_missing_lat_returns_400(self, worker_client):
        response = worker_client.get(WEATHER_URL, {"lon": "11.576", "date": "2026-04-21"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "lat" in response.json()["error"]

    def test_missing_lon_returns_400(self, worker_client):
        response = worker_client.get(WEATHER_URL, {"lat": "48.137", "date": "2026-04-21"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "lon" in response.json()["error"]

    def test_missing_date_returns_400(self, worker_client):
        response = worker_client.get(WEATHER_URL, {"lat": "48.137", "lon": "11.576"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "date" in response.json()["error"]

    def test_missing_all_params_returns_400_listing_all(self, worker_client):
        response = worker_client.get(WEATHER_URL)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error_msg = response.json()["error"]
        assert "lat" in error_msg
        assert "lon" in error_msg
        assert "date" in error_msg

    def test_invalid_lat_string_returns_400(self, worker_client):
        response = worker_client.get(
            WEATHER_URL, {"lat": "not-a-number", "lon": "11.576", "date": "2026-04-21"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_date_format_returns_400(self, worker_client):
        response = worker_client.get(
            WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "21-04-2026"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_lat_out_of_range_returns_400(self, worker_client):
        response = worker_client.get(
            WEATHER_URL, {"lat": "999", "lon": "11.576", "date": "2026-04-21"}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------
    # Upstream failures — 502
    # ------------------------------------------------------------------

    def test_open_meteo_timeout_returns_502(self, worker_client):
        import requests as req_lib
        with patch("apps.reports.views_weather.requests.get", side_effect=req_lib.Timeout):
            response = worker_client.get(
                WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["error"] == "Weather service unavailable"

    def test_open_meteo_connection_error_returns_502(self, worker_client):
        import requests as req_lib
        with patch("apps.reports.views_weather.requests.get", side_effect=req_lib.ConnectionError):
            response = worker_client.get(
                WEATHER_URL, {"lat": "48.137", "lon": "11.576", "date": "2026-04-21"}
            )

        assert response.status_code == status.HTTP_502_BAD_GATEWAY
        assert response.json()["error"] == "Weather service unavailable"
