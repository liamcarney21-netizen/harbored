// Harbored home-screen widget: today's lead reason as a front-page card.
// Data arrives via the shared app group — the app writes `widget_today`
// (JSON: kicker, headline, name, updatedAt) through Capacitor Preferences.
import WidgetKit
import SwiftUI

struct LeadReason: Codable {
    var kicker: String
    var headline: String
    var name: String
    var updatedAt: Double?
}

struct Entry: TimelineEntry {
    let date: Date
    let reason: LeadReason?
}

let placeholderReason = LeadReason(
    kicker: "VILLANOVA BASKETBALL",
    headline: "Nova lands five-star transfer guard",
    name: "John Sullivan",
    updatedAt: nil
)

func readLeadReason() -> LeadReason? {
    guard let defaults = UserDefaults(suiteName: "group.app.harbored"),
          let raw = defaults.string(forKey: "widget_today"),
          let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(LeadReason.self, from: data)
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), reason: placeholderReason)
    }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), reason: readLeadReason() ?? placeholderReason))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let entry = Entry(date: Date(), reason: readLeadReason())
        // Re-read the shared store every 30 minutes; the app refreshes it on open.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

let navy = Color(red: 10/255, green: 22/255, blue: 40/255)
let cream = Color(red: 245/255, green: 244/255, blue: 239/255)
let muted = Color(red: 140/255, green: 154/255, blue: 173/255)
let gold = Color(red: 211/255, green: 169/255, blue: 92/255)

struct HarboredWidgetView: View {
    var entry: Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let r = entry.reason {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Circle().fill(gold).frame(width: 5, height: 5)
                    Text(r.kicker.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(muted)
                        .lineLimit(1)
                }
                Text(r.headline)
                    .font(.system(size: family == .systemSmall ? 15 : 18, weight: .medium, design: .serif))
                    .foregroundColor(cream)
                    .lineLimit(family == .systemSmall ? 4 : 3)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Text(r.name)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(gold)
                    .lineLimit(1)
            }
        } else {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Circle().fill(gold).frame(width: 5, height: 5)
                    Text("HARBORED")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.8)
                        .foregroundColor(muted)
                }
                Text("The watch has begun")
                    .font(.system(size: 16, weight: .medium, design: .serif))
                    .foregroundColor(cream)
                Spacer(minLength: 0)
                Text("Reasons land here")
                    .font(.system(size: 11))
                    .foregroundColor(muted)
            }
        }
    }
}

struct HarboredWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HarboredToday", provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                HarboredWidgetView(entry: entry)
                    .containerBackground(navy, for: .widget)
            } else {
                HarboredWidgetView(entry: entry)
                    .padding()
                    .background(navy)
            }
        }
        .configurationDisplayName("Today's reason")
        .description("The front page: your best reason to reach out right now.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct HarboredWidgets: WidgetBundle {
    var body: some Widget {
        HarboredWidget()
    }
}
