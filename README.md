# ReachOut

Right now, millions of people need mental health support, but actually finding this help can feel overwhelming. You have to search across different websites, compare options, check hours, read reviews… and when you’re already struggling, this can be enough to stop you from taking the first step. 

So we built a platform that puts everything in one place, making it simple to find the right mental health support near you, quickly and easily. 

ReachOut is a web app that makes it easy to find nearby mental health resources. Enter your city, ZIP code, or address, and ReachOut returns a list of real local providers — therapists, psychiatrists, clinics, and counselors — pulled live from Google Places. Each result shows distance, ratings, hours, phone number, and one-tap directions. A persistent 988 crisis banner stays visible throughout the app so anyone in immediate need can call or text for support without searching.


## Features

- **Location-based search** — find providers near any city, ZIP, or address in the US
- **Real provider data** from Google Places, including ratings and reviews
- **Live "open now" status** and weekly hours
- **One-tap call and directions** from every result
- **Filters** for distance, therapy, psychiatry, and telehealth
- **Persistent 988 crisis banner** with tap-to-call and tap-to-text
- **Mobile-friendly** responsive design

## Tech stack

- React 19 + TypeScript
- Vite
- Google Places API (Text Search, Place Details, Geocoding)

## Setup

### Prerequisites

- Node.js 18 or newer
- A Google Maps Platform API key with **Places API** and **Geocoding API** enabled

### Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/kathyzguo/ReachOut.git
cd ReachOut
npm install
```

### Add your API key

Create a file named `.env.local` in the project root (same folder as `package.json`) with this line:

```
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

Replace `your_key_here` with your actual key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis).

### Run the dev server

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) in your browser.

## How to use

1. Type a city, ZIP code, or address into the search bar
2. Adjust the distance and resource filters as needed
3. Click **Search** to see real providers near that location
4. Tap a phone number to call, or **Get directions** to open Google Maps
5. If you or someone you know is in crisis, the **988** banner is always visible at the top — tap to call or text

## Project structure

```
ReachOut/
├── src/
│   ├── api/
│   │   └── places.ts        Google Places API wrapper
│   ├── App.tsx              Main app and search logic
│   ├── App.css              Styles
│   └── main.tsx             Entry point
├── .env.local               Your API key (not committed)
├── package.json
└── vite.config.ts
```

## Crisis resources

If you or someone you know is in crisis, please reach out:

- **988 Suicide and Crisis Lifeline** — call or text 988
- **Crisis Text Line** — text HOME to 741741

## Built by

Team Sleepy:
Kathy Guo, Sophia Lu, Brooke Pang
