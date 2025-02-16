from django.urls import path
from . import views

urlpatterns = [
    path('directions/', views.get_directions, name='get_directions'),
]