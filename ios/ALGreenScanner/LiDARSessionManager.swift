import Foundation
import ARKit
import RealityKit

final class LiDARSessionManager: NSObject, ARSessionDelegate {
    private weak var arView: ARView?
    private let meshCollector = MeshCollector()
    private let qualityManager = ScanQualityManager()

    func attach(arView: ARView) {
        self.arView = arView
        arView.session.delegate = self
    }

    func startScan() {
        guard ARWorldTrackingConfiguration.isSupported else {
            print("ARWorldTrackingConfiguration wird nicht unterstützt.")
            return
        }

        let configuration = ARWorldTrackingConfiguration()

        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.meshWithClassification) {
            configuration.sceneReconstruction = .meshWithClassification
        } else if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            configuration.sceneReconstruction = .mesh
        } else {
            print("Scene Reconstruction / LiDAR wird auf diesem Gerät nicht unterstützt.")
            return
        }

        configuration.environmentTexturing = .automatic
        configuration.planeDetection = [.horizontal, .vertical]

        arView?.session.run(
            configuration,
            options: [.resetTracking, .removeExistingAnchors]
        )
    }

    func stopScan() {
        arView?.session.pause()
    }

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            guard let meshAnchor = anchor as? ARMeshAnchor else { continue }
            meshCollector.update(anchor: meshAnchor)
        }

        qualityManager.update(
            meshCount: meshCollector.meshCount,
            vertexCount: meshCollector.totalVertexCount
        )
    }

    func exportCurrentScan() throws -> URL {
        let snapshot = meshCollector.snapshot()
        return try MeshExporter.exportOBJ(snapshot: snapshot)
    }
}
