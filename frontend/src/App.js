import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix the default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Function to recenter map when the user's position updates
const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

const App = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);

  const { transcript, resetTranscript } = useSpeechRecognition();

  // Check if speech recognition is supported
  const browserSupportsSpeech = SpeechRecognition.browserSupportsSpeechRecognition();

  // Watch user's geolocation
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentPosition([latitude, longitude]);
      },
      (error) => console.error("Error fetching location: ", error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch directions whenever coordinates are set
  useEffect(() => {
    const fetchDirections = async () => {
      if (!originCoords || !destinationCoords) return;

      const url = `http://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRouteCoords(coordinates);
          speakDirections(data.routes[0].legs[0]);
        } else {
          alert("No route found.");
        }
      } catch (error) {
        console.error("Error fetching directions:", error);
      }
    };

    fetchDirections();
  }, [originCoords, destinationCoords]);

  // Function to convert address to coordinates using Nominatim API
  const fetchCoordinates = async (address, setCoords) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon } = data[0];
        setCoords([parseFloat(lat), parseFloat(lon)]);
      } else {
        alert(`No results found for: ${address}`);
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    }
  };

  // Text-to-speech function for directions
  const speakDirections = (leg) => {
    if (!leg.steps || leg.steps.length === 0) {
      const utterance = new SpeechSynthesisUtterance("Route calculated. Follow the highlighted path on the map.");
      speechSynthesis.speak(utterance);
      return;
    }

    leg.steps.forEach(step => {
      const instruction = new SpeechSynthesisUtterance(step.maneuver.instruction);
      speechSynthesis.speak(instruction);
    });
  };

  // Handle search for directions
  const handleSearch = async () => {
    await fetchCoordinates(origin, setOriginCoords);
    await fetchCoordinates(destination, setDestinationCoords);
  };

  // Handle speech recognition for origin and destination
  const handleVoiceInput = (type) => {
    resetTranscript();
    SpeechRecognition.startListening();
    setTimeout(() => {
      if (type === "origin") setOrigin(transcript);
      if (type === "destination") setDestination(transcript);
      SpeechRecognition.stopListening();
    }, 3000); // Allowing 3 seconds for speech input
  };

  return (
    <div className="App">
      <h1>Map Directions with Voice Input</h1>

      {!browserSupportsSpeech && <p>Your browser does not support speech recognition.</p>}

      <div className="form-container">
        <div className="input-group">
          <label>Origin:</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter origin"
          />
          <button onClick={() => handleVoiceInput("origin")}>🎤 Speak Origin</button>
        </div>

        <div className="input-group">
          <label>Destination:</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination"
          />
          <button onClick={() => handleVoiceInput("destination")}>🎤 Speak Destination</button>
        </div>

        <button onClick={handleSearch}>Get Directions</button>
      </div>

      <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: "500px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {originCoords && <Marker position={originCoords} />}
        {destinationCoords && <Marker position={destinationCoords} />}
        {currentPosition && (
          <Marker
            position={currentPosition}
            icon={L.icon({
              iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
              iconSize: [25, 41],
            })}
          />
        )}
        {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
        {currentPosition && <RecenterMap center={currentPosition} />}
      </MapContainer>

      <p>Voice Input: {transcript}</p>
    </div>
  );
};

export default App;
