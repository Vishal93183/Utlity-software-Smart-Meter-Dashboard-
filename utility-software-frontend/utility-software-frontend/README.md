# Utility Software - React Frontend

Frontend seedha backend se connect hota hai (default `http://localhost:8081`).
Sample/hard-coded data nahi hai: History, Meters aur Response sab backend database se aate hain.

```bash
npm install
npm run dev     # http://localhost:5173
```

- Backend ka URL `.env` me `VITE_API_URL` se badal sakte ho.
- Meters "Add Meter" button se add / edit / delete hote hain.
- Production build: `npm run build`

## Simulation page (Sidebar -> Simulation)
Do modes:

- **Device (MQTT)** (default): har tick par chune hue meters ko ek ek karke READ request bhejta hai
  (`POST /api/request/send`). Backend use MQTT par publish karta hai, device ka jawab database me save
  hota hai aur yahan chart, table aur log me dikhta hai. Message ID = woh topic jis par device jawab deta hai.
  Meter me IP address saved hona chahiye.
- **Browser simulation**: browser random values banata hai aur `PUT /api/meters/{id}` se save karta hai (MQTT use nahi).

Request Builder me response ke upar ek status line aati hai (reply mila / no reply / broker error).

## Meter Details
Request Builder se Send Request dabane par neeche **Meter Details** card khulta hai
(`GET /api/meters/{id}/details`): meter ki information, latest values, aur us meter ki
request activity (total / successful / failed, aakhri 5 requests). Card me Edit, Delete aur Close buttons hain.

## Tariff & Charges, Reports, Settings
- **Tariff & Charges**: slab rates, fixed charge aur tax edit karke save hote hain (backend DB me). Bill Calculator aur
  "Charges by Meter" table usi tariff se bill banate hain.
- **Reports**: summary tiles, Meters / Requests / Billing reports, filters, CSV download aur Print.
- **Settings**: display name, currency, live refresh seconds, default Message ID (backend DB me save), MQTT connection ki
  read-only details, aur request history clear karne ka button.
