from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests

from django.http import HttpResponse

def home(request):
    return HttpResponse("Django Backend is Running!")


@api_view(['GET'])
def get_directions(request):
    origin = request.GET.get('origin')
    destination = request.GET.get('destination')
    print(f"Received Origin: {origin}, Destination: {destination}")

    if not origin or not destination:
        return Response({"error": "Origin and destination are required."}, status=400)
    
        # Split the coordinates and reverse the order for OSRM (longitude,latitude)
    origin_lat, origin_lon = origin.split(',')
    destination_lat, destination_lon = destination.split(',')
    
    # Swap coordinates to longitude,latitude format for OSRM
    osrm_origin = f"{origin_lon},{origin_lat}"
    osrm_destination = f"{destination_lon},{destination_lat}"
    url = f"http://router.project-osrm.org/route/v1/driving/{osrm_origin};{osrm_destination}?overview=full&geometries=geojson"
    print(f"Requesting URL: {url}")
    response = requests.get(url)
    print(f"OSM API Status Code: {response.status_code}")
    print(f"OSM API Response: {response.text}")  # Print full API response

    if response.status_code != 200:
        return Response({"error": "Could not fetch directions."}, status=500)

    data = response.json()
    return Response(data)