import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let capacitorBridge = CAPBridgeViewController()
    
    // Configure WebView for proper iOS safe area handling
    capacitorBridge.webView?.scrollView.contentInsetAdjustmentBehavior = .never
    
    self.window = UIWindow(frame: UIScreen.main.bounds)
    self.window?.rootViewController = capacitorBridge
    self.window?.makeKeyAndVisible()
    
    return true
  }
  
  func applicationWillResignActive(_ application: UIApplication) {
    // Called when the application is about to move from active to inactive state.
  }

  func applicationDidEnterBackground(_ application: UIApplication) {
    // Called when the application enters the background.
  }

  func applicationWillEnterForeground(_ application: UIApplication) {
    // Called when the application is about to enter the foreground.
  }

  func applicationDidBecomeActive(_ application: UIApplication) {
    // Called when the application becomes active.
  }

  func applicationWillTerminate(_ application: UIApplication) {
    // Called when the application is about to terminate.
  }

  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    // Called when the app was launched with a url.
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    // Called when the app was launched with an activity, including Universal Links.
    return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}