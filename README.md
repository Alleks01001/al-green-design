# AL Green Design – V0.15 AI MAX

Diese Version integriert deine OpenAI-/Schema-/TransformControls-Erweiterungen und baut die Plattform weiter aus.

## Neu in V0.15

### OpenAI KI-Modell
- OpenAI SDK eingebaut
- serverseitige API-Route `app/api/garden/route.ts`
- strukturierte JSON-Ausgabe per JSON Schema
- GPT-Modell im UI auswählbar
- Standard: `gpt-4o`
- freies Modellfeld möglich
- lokaler Fallback bleibt aktiv, wenn kein API-Key gesetzt ist

### Strukturierte KI-Gartenplanung
Die KI liefert ein Layout in dieser Struktur:

- Terrain:
  - flat
  - hilly
  - sunken
  - intensity

- Objects:
  - modern_house
  - glass_house
  - pool
  - pergola
  - tree
  - shrub

Diese Objekte werden automatisch in das bestehende Planmodell übersetzt.

### 3D / TransformControls vorbereitet
- `@react-three/fiber`
- `@react-three/drei`
- `TransformControls`
- `Canvas`
- `Sky`
- `SoftShadows`
- `OrbitControls`
- Beispielkomponenten:
  - `components/MovableObject.tsx`
  - `components/RenderCanvas.tsx`

### Bestehende 3D-Ansicht
- Gebäude und Objekte bleiben weiterhin in der bestehenden 3D-Ansicht verschiebbar
- Objekte liegen weiterhin auf der Geländehöhe
- 2D-Verschiebung bleibt aktiv

## Vercel Environment Variable

Für echten OpenAI-Betrieb:

```text
OPENAI_API_KEY=dein_key
```

Ohne Key verwendet die App den lokalen Fallback.

## Struktur

```text
.gitignore
app
components
next.config.mjs
next-env.d.ts
package.json
README.md
tsconfig.json
```
