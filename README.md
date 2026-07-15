# AL Green Design – V0.18.1 NATIVE LIDAR

Diese Version korrigiert den bisherigen Scan-Workflow:

- Die normale Browser-Kamera wird klar als Kamera-Fallback bezeichnet.
- Ein echter LiDAR-Scan startet nur, wenn eine native iOS-/iPadOS-Bridge vorhanden ist.
- Eine native ARKit-Scanner-Struktur ist im Ordner `ios/ALGreenScanner` enthalten.
- Mesh-, Punktwolken- und Tiefendaten-Export sind als echte native Pipeline vorbereitet.

## Web-Studio

Weiter enthalten:

- 2D-Planung
- 3D-Planung
- Split View
- detailliertere Architektur-Bauteile
- Gelände
- Pflanzen
- KI
- Scan-Import

## Scan-Modi

### 1. Echter LiDAR-Scan
Nur aktiv, wenn die native iOS-App bzw. App-Hülle die Bridge bereitstellt.

### 2. Kamera-Fallback
Öffnet nur die Kamera. Das ist kein LiDAR-Scan.

### 3. Scan-Dateiimport
Unterstützte Grundlage:

- PLY
- OBJ
- GLB
- GLTF
- USDZ
- JSON
- ZIP
- Bilder

## Native iOS-/iPadOS-Struktur

```text
ios/
  ALGreenScanner/
    ALGreenScannerApp.swift
    ContentView.swift
    LiDARScannerView.swift
    LiDARSessionManager.swift
    MeshCollector.swift
    MeshExporter.swift
    ScanQualityManager.swift
    WebBridge.swift
    Info.plist.example
```

## ARKit-Scanner

Die native App prüft:

```swift
ARWorldTrackingConfiguration.supportsSceneReconstruction(.meshWithClassification)
```

und aktiviert danach:

```swift
configuration.sceneReconstruction = .meshWithClassification
```

Der Scanner sammelt:

- ARMeshAnchor
- Mesh-Geometrie
- Weltkoordinaten
- grobe Scanqualität
- Export-Metadaten

## Wichtiger Hinweis

Die Swift-Dateien sind eine native Xcode-Grundlage. Zum echten Ausführen auf iPhone/iPad muss daraus in Xcode ein iOS-Projekt erstellt bzw. die Dateien in ein bestehendes Xcode-Projekt übernommen werden.

## Vercel

Für die Web-App bleibt der Upload gleich:

```text
.gitignore
app
components
lib
types
next.config.mjs
next-env.d.ts
package.json
README.md
tsconfig.json
ios
```
