import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

WEATHER_CODE_MAP = {
    0: "Sonnig",
    1: "Leicht bewölkt",
    2: "Bewölkt",
    3: "Stark bewölkt",
    45: "Neblig",
    48: "Neblig",
    51: "Leichter Nieselregen",
    53: "Nieselregen",
    55: "Starker Nieselregen",
    61: "Leichter Regen",
    63: "Regen",
    65: "Starker Regen",
    71: "Leichter Schneefall",
    73: "Schneefall",
    75: "Starker Schneefall",
    80: "Leichte Schauer",
    81: "Schauer",
    82: "Starke Schauer",
    95: "Gewitter",
    96: "Gewitter mit Hagel",
    99: "Gewitter mit Hagel",
}

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT = 10


class WeatherView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        date = request.query_params.get("date")

        missing = [name for name, val in [("lat", lat), ("lon", lon), ("date", date)] if not val]
        if missing:
            return Response(
                {"error": "Missing required parameters: {}".format(", ".join(missing))},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat_float = float(lat)
            lon_float = float(lon)
        except ValueError:
            return Response(
                {"error": "Parameters lat and lon must be valid numbers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (-90 <= lat_float <= 90):
            return Response(
                {"error": "Parameter lat must be between -90 and 90"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (-180 <= lon_float <= 180):
            return Response(
                {"error": "Parameter lon must be between -180 and 180"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import re
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            return Response(
                {"error": "Parameter date must be in YYYY-MM-DD format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        params = {
            "latitude": lat_float,
            "longitude": lon_float,
            "daily": "temperature_2m_max,temperature_2m_min,weathercode",
            "start_date": date,
            "end_date": date,
            "timezone": "Europe/Berlin",
        }

        try:
            response = requests.get(OPEN_METEO_URL, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
        except (requests.Timeout, requests.ConnectionError):
            return Response(
                {"error": "Weather service unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except requests.HTTPError:
            return Response(
                {"error": "Weather service unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            daily = data["daily"]
            weather_code = int(daily["weathercode"][0])
            temperature_max = daily["temperature_2m_max"][0]
            temperature_min = daily["temperature_2m_min"][0]
        except (KeyError, IndexError, TypeError, ValueError):
            return Response(
                {"error": "Unexpected response from weather service"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        description = WEATHER_CODE_MAP.get(weather_code, "Unbekannt")

        return Response(
            {
                "description": description,
                "temperature_max": temperature_max,
                "temperature_min": temperature_min,
                "unit": "°C",
            },
            status=status.HTTP_200_OK,
        )
