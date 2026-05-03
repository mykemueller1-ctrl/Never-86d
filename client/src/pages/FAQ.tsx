import { Link } from "wouter";

const faqs = [
  {
    q: "What is Never 86'd?",
    a: "Never 86'd is a people-first restaurant workforce platform built by operators, for operators. Unlike traditional POS add-ons, it focuses on the humans running the restaurant — gamified accountability, real-time checklists, role-based intelligence, and zero-friction shift management. The name comes from the industry term '86'd' (out of stock or removed) — our mission is to make sure your team is never left behind.",
  },
  {
    q: "How does Never 86'd compare to 7shifts, Toast, or Restaurant365?",
    a: "Most restaurant tech platforms treat workers as schedule slots or labor line items. 7shifts is scheduling-first with limited operational tools. Toast bundles everything into POS but charges per terminal. Restaurant365 is accounting-focused and overwhelming for floor staff. Never 86'd is different: it starts with the people. Staff log in with a PIN, see their personalized briefing, complete gamified checklists, and earn points. Managers get a command center with real intelligence — not just reports. We believe the best restaurant tech should feel like a team tool, not a corporate dashboard.",
  },
  {
    q: "What does the gamification system do?",
    a: "Every action earns points: completing checklists, submitting feedback, maintaining streaks, getting zero voids for a week. Staff see their rank on a live leaderboard with gold, silver, and bronze badges. Schedule priority is tied to leaderboard position — top performers get first pick of shifts. This creates a positive feedback loop: do great work, get recognized, get better shifts. No more favoritism or seniority-only scheduling.",
  },
  {
    q: "How does role-based access work?",
    a: "Never 86'd shows each person exactly what they need — nothing more, nothing less. A bartender sees their closing checklist and leaderboard rank. A kitchen manager sees the command center with sales data, void alerts, and vendor spend. A driver sees their EOD report form. An owner sees everything. Financial data like sales numbers and P&L metrics are restricted to managers and above — staff sees gamified 'vibe' ratings instead of raw dollar amounts. This protects sensitive business data while keeping everyone informed.",
  },
  {
    q: "What is the Command Center?",
    a: "The Command Center is the manager's real-time operations dashboard. It shows yesterday's sales, payout totals, void counts, active staff count, vendor spend, and open issues — all at a glance. It also includes Wi-Fi proximity tracking (who's on the floor right now) and quick action buttons for payouts, voids, and invoices. Think of it as the cockpit for running a restaurant shift.",
  },
  {
    q: "How does payout authorization work?",
    a: "Only key employees (owners, key managers, and designated staff) can authorize payouts. When a store run or cash payout is needed, the system verifies that the authorizer is actually a key employee before allowing the transaction. If someone without authorization tries to approve a payout, it's rejected. If there's a discrepancy between the POS payout amount and the receipt, it's flagged for manager review. This prevents unauthorized cash handling and catches discrepancies early.",
  },
  {
    q: "What happens when an employee has too many voids?",
    a: "Never 86'd tracks voids per employee per week. When someone hits 3 voids in a week, the system automatically creates an issue alert for managers with medium priority. At 5 voids, it escalates to high priority with an URGENT label. Alerts are deduplicated — you won't get spammed with notifications for every additional void. This catches patterns early without micromanaging, giving managers the intelligence to have the right conversation at the right time.",
  },
  {
    q: "What are the daily briefings?",
    a: "Every shift starts with a personalized briefing. Staff see yesterday's performance (as a gamified 'vibe' rating, not raw sales), today's 86'd items (what's out of stock), daily specials, open issues, and team shoutouts. Managers see the same briefing but with actual sales numbers and operational metrics. This ensures everyone walks onto the floor informed and aligned — no more 'I didn't know we were out of brisket' moments.",
  },
  {
    q: "How much does restaurant labor cost as a percentage of revenue?",
    a: "According to the National Restaurant Association, labor costs averaged 31.4% of revenue in 2024 — the highest level since at least 2019 and well above the pre-pandemic benchmark of around 30%. For full-service restaurants, it can reach 33-35%. The industry added 200,000 jobs in 2024, but 7 in 10 operators still report being understaffed. Never 86'd helps by making every shift more efficient: gamified checklists reduce closing time, accountability tracking reduces waste, and merit-based scheduling retains top performers.",
  },
  {
    q: "What is the restaurant industry turnover rate?",
    a: "The restaurant industry has a turnover rate of approximately 75% annually — meaning three out of four positions turn over every year. For hourly workers, it can exceed 100%. The primary drivers are low wages, lack of recognition, unpredictable scheduling, and feeling like 'just a number.' Never 86'd addresses the recognition and scheduling gaps directly: gamification makes good work visible, leaderboard-based scheduling rewards consistency, and personalized briefings make every team member feel like they matter.",
  },
  {
    q: "Can Never 86'd work with my existing POS system?",
    a: "Never 86'd is designed to complement your existing POS, not replace it. It handles the people side — checklists, accountability, gamification, briefings, and operational intelligence — while your POS handles transactions. The platform tracks payouts, voids, and invoices independently, with fields for POS cross-referencing to catch discrepancies. Future integrations will enable automatic POS data sync for real-time labor percentage and sales pattern analysis.",
  },
  {
    q: "Is my staff's personal information secure?",
    a: "Absolutely. Never 86'd strips all sensitive data (PINs, phone numbers, email addresses) from every API response. Staff log in with a simple PIN — no passwords, no email accounts needed. The backend enforces role-based access at the API level, not just the UI. Financial data is restricted to manager-level procedures. All endpoints serving sensitive operational data require authenticated sessions. We built security into the architecture, not as an afterthought.",
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/">
            <span className="text-amber-500 font-bold text-lg tracking-wider cursor-pointer hover:text-amber-400 transition-colors">
              NEVER 86'd
            </span>
          </Link>
          <nav className="flex gap-6 text-sm text-zinc-400">
            <Link href="/">
              <span className="hover:text-white cursor-pointer transition-colors">App</span>
            </Link>
            <span className="text-amber-500">FAQ</span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Frequently Asked <span className="text-amber-500">Questions</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Everything you need to know about Never 86'd — the people-first restaurant workforce platform.
        </p>
      </section>

      {/* FAQ Items */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          {faqs.map((faq, i) => (
            <article
              key={i}
              className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/30 transition-colors"
              itemScope
              itemType="https://schema.org/Question"
            >
              <h2
                className="text-lg font-bold text-white mb-3"
                itemProp="name"
              >
                {faq.q}
              </h2>
              <div
                itemScope
                itemType="https://schema.org/Answer"
                itemProp="acceptedAnswer"
              >
                <p className="text-zinc-300 leading-relaxed" itemProp="text">
                  {faq.a}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-16 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-3">Ready to transform your restaurant operations?</h2>
          <p className="text-zinc-400 mb-6">
            Never 86'd is built by operators who've lived the chaos. We know what it takes because we've done it.
          </p>
          <Link href="/">
            <button className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-colors">
              Try the Platform
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-500 text-sm">
        <p>Never 86'd — People-First Restaurant Intelligence</p>
        <p className="mt-1">Built in Fort Dodge, Iowa</p>
      </footer>
    </div>
  );
}
