import SwiftUI
import ARKit
import RealityKit

struct LiDARScannerView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)
        context.coordinator.attach(arView: arView)
        context.coordinator.start()
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}

    static func dismantleUIView(_ uiView: ARView, coordinator: Coordinator) {
        coordinator.stop()
    }

    final class Coordinator {
        private let sessionManager = LiDARSessionManager()

        func attach(arView: ARView) {
            sessionManager.attach(arView: arView)
        }

        func start() {
            sessionManager.startScan()
        }

        func stop() {
            sessionManager.stopScan()
        }
    }
}
