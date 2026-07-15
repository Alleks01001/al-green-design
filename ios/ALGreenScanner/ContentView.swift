import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            LiDARScannerView()
                .navigationTitle("AL Green LiDAR")
                .navigationBarTitleDisplayMode(.inline)
        }
    }
}
