import Foundation

struct ScanQuality {
    let score: Int
    let label: String
}

final class ScanQualityManager {
    private(set) var current = ScanQuality(score: 0, label: "Noch kein Scan")

    func update(meshCount: Int, vertexCount: Int) {
        let meshScore = min(meshCount * 2, 40)
        let vertexScore = min(vertexCount / 5000, 60)
        let score = min(meshScore + vertexScore, 100)

        let label: String
        switch score {
        case 0..<25:
            label = "Niedrig"
        case 25..<55:
            label = "Mittel"
        case 55..<80:
            label = "Gut"
        default:
            label = "Sehr gut"
        }

        current = ScanQuality(score: score, label: label)
    }
}
