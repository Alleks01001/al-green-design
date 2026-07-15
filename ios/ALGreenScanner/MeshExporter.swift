import Foundation

enum MeshExporter {
    static func exportOBJ(snapshot: MeshSnapshot) throws -> URL {
        let fileName = "ALGreenScan-\(Int(Date().timeIntervalSince1970)).obj"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        var lines: [String] = []
        lines.reserveCapacity(snapshot.vertices.count + snapshot.triangles.count)

        for vertex in snapshot.vertices {
            let p = vertex.position
            lines.append("v \(p.x) \(p.y) \(p.z)")
        }

        for triangle in snapshot.triangles {
            // OBJ-Indizes beginnen bei 1.
            lines.append("f \(triangle.a + 1) \(triangle.b + 1) \(triangle.c + 1)")
        }

        try lines.joined(separator: "\n").write(
            to: url,
            atomically: true,
            encoding: .utf8
        )

        return url
    }
}
