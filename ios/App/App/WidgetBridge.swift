// Hands Today's lead reason to the home-screen widget. Capacitor Preferences
// can't: it writes UserDefaults.standard (its "group" option is only a key
// prefix), and the widget extension can only read the shared app group.
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "publish", returnType: CAPPluginReturnPromise)
    ]

    static let suite = "group.app.harbored"
    static let key = "widget_today"
    // Where builds before 10 wrote it (Preferences' prefix + key). The widget
    // never read it; cleared so a signed-out reason doesn't linger.
    static let legacyKey = "group.app.harbored.widget_today"

    // { value: "<json>" } stores the widget's payload; no value clears it.
    @objc func publish(_ call: CAPPluginCall) {
        guard let shared = UserDefaults(suiteName: Self.suite) else {
            call.reject("app group unavailable")
            return
        }
        if let value = call.getString("value") {
            shared.set(value, forKey: Self.key)
        } else {
            shared.removeObject(forKey: Self.key)
        }
        UserDefaults.standard.removeObject(forKey: Self.legacyKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
