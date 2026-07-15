import Foundation
import WebKit

final class WebBridge: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    let sessionManager: LiDARSessionManager

    init(webView: WKWebView, sessionManager: LiDARSessionManager) {
        self.webView = webView
        self.sessionManager = sessionManager
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "ALGreenLiDAR" else { return }

        if let body = message.body as? [String: Any],
           let action = body["action"] as? String,
           action == "start" {
            sessionManager.startScan()
            sendToWeb([
                "type": "scan-started",
                "sessionId": UUID().uuidString
            ])
        }
    }

    func sendToWeb(_ payload: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: data, encoding: .utf8)
        else { return }

        webView?.evaluateJavaScript(
            "window.ALGreenNativeScanResult && window.ALGreenNativeScanResult(\(json));"
        )
    }
}
