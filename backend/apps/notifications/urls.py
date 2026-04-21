from django.urls import path

from .views import NotificationPreferencesView, SubscribeView, VapidPublicKeyView

urlpatterns = [
    path('vapid-public-key/', VapidPublicKeyView.as_view(), name='vapid-public-key'),
    path('subscribe/', SubscribeView.as_view(), name='push-subscribe'),
    path('preferences/', NotificationPreferencesView.as_view(), name='notification-prefs'),
]
