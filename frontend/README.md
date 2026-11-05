# Drishti frontend (React 19 + TypeScript + Vite + Tailwind 4 + Motion + Lucide)

    npm install
    npm run dev        # http://localhost:5173, proxies /vision-assist /chat /tts /health /languages to :3000
    npm run build      # type-checks, then builds to dist/

Camera, microphone and Bluetooth need HTTPS or localhost. Web Bluetooth works in Chrome on Android/desktop only.

## Structure
- src/App.tsx             screen, modes, live scan, voice commands
- src/components/CameraView.tsx   camera / glasses / photo view and bounding boxes (0-1000 coordinates)
- src/hooks/useGlasses.ts + src/lib/glasses.ts   Bluetooth LE glasses, remembered, auto-reconnect
- src/lib/api.ts          POST /vision-assist and /chat; demo.ts supplies sample answers
- src/lib/speech.ts       Gemini TTS from /tts, browser speech fallback, voice recognition
- src/config.ts           languages, glasses BLE IDs, scan interval

## Backend contract
POST /vision-assist {image(base64 jpeg), mode: safety|read|money, language} -> {path_clear, alert?, text?, hazards:[{label, box:[ymin,xmin,ymax,xmax], severity:low|medium|high, distance?, action?}]}
POST /chat {message, language, history, image} -> {reply}
POST /tts {text, language} -> {audio(base64), mime}
For production set VITE_API_BASE to the server address (copy .env.example to .env) and enable CORS.

## Walking navigation (new)
Say "take me to <place>" (or type it and press Go). Route and turn-by-turn prompts are spoken in the language chosen in setup.
Uses Leaflet + OpenStreetMap tiles, the FOSSGIS walking router and Nominatim for the prototype. Replace with Google Directions/Places or your own OSRM for production (these public servers are rate limited).
Obstacle and vehicle alerts interrupt navigation prompts. Add to the /vision-assist schema: each hazard may include kind (obstacle|vehicle|dropoff|person|other) and direction (left|ahead|right), and `alert` must be written in the requested language.
The page must stay open in the foreground: a browser cannot draw over Google Maps or keep the camera and Bluetooth running behind another app.
