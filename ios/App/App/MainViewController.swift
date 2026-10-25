import Capacitor

// The root view controller (Main.storyboard). Plugins that live in this target
// rather than in a package are registered here.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
    }
}
