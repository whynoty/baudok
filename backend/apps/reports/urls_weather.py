from django.urls import path

from .views_weather import WeatherView

urlpatterns = [
    path("", WeatherView.as_view(), name="weather"),
]
