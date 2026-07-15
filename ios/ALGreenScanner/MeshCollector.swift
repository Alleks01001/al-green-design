import Foundation
import ARKit
import simd

struct MeshVertex {
    let position: SIMD3<Float>
}

struct MeshTriangle {
    let a: Int
    let b: Int
    let c: Int
}

struct MeshSnapshot {
    let vertices: [MeshVertex]
    let triangles: [MeshTriangle]
}

final class MeshCollector {
    private var anchors: [UUID: ARMeshAnchor] = [:]

    var meshCount: Int {
        anchors.count
    }

    var totalVertexCount: Int {
        anchors.values.reduce(0) { partial, anchor in
            partial + anchor.geometry.vertices.count
        }
    }

    func update(anchor: ARMeshAnchor) {
        anchors[anchor.identifier] = anchor
    }

    func snapshot() -> MeshSnapshot {
        var vertices: [MeshVertex] = []
        var triangles: [MeshTriangle] = []
        var vertexOffset = 0

        for anchor in anchors.values {
            let geometry = anchor.geometry
            let transform = anchor.transform

            for index in 0..<geometry.vertices.count {
                let local = geometry.vertex(at: UInt32(index))
                let world4 = transform * SIMD4<Float>(local.x, local.y, local.z, 1)
                vertices.append(
                    MeshVertex(position: SIMD3<Float>(world4.x, world4.y, world4.z))
                )
            }

            for faceIndex in 0..<geometry.faces.count {
                let indices = geometry.faceVertexIndices(at: UInt32(faceIndex))
                if indices.count >= 3 {
                    triangles.append(
                        MeshTriangle(
                            a: vertexOffset + Int(indices[0]),
                            b: vertexOffset + Int(indices[1]),
                            c: vertexOffset + Int(indices[2])
                        )
                    )
                }
            }

            vertexOffset += geometry.vertices.count
        }

        return MeshSnapshot(vertices: vertices, triangles: triangles)
    }
}

private extension ARMeshGeometry {
    func vertex(at index: UInt32) -> SIMD3<Float> {
        let pointer = vertices.buffer.contents()
            .advanced(by: vertices.offset + vertices.stride * Int(index))
            .assumingMemoryBound(to: SIMD3<Float>.self)

        return pointer.pointee
    }

    func faceVertexIndices(at faceIndex: UInt32) -> [UInt32] {
        let face = faces
        let indexCount = face.indexCountPerPrimitive
        let bytesPerIndex = face.bytesPerIndex
        let offset = Int(faceIndex) * indexCount * bytesPerIndex
        let pointer = face.buffer.contents().advanced(by: offset)

        return (0..<indexCount).map { index in
            let indexPointer = pointer.advanced(by: index * bytesPerIndex)

            if bytesPerIndex == 2 {
                return UInt32(indexPointer.assumingMemoryBound(to: UInt16.self).pointee)
            }

            return indexPointer.assumingMemoryBound(to: UInt32.self).pointee
        }
    }
}
