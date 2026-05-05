# CTAP People Platform — Security Gate Matrix

## Access Levels

| Level | Middleware | Who | How Authenticated |
|-------|-----------|-----|-------------------|
| **Public** | `publicProcedure` | Anyone (unauthenticated) | No auth required |
| **Staff Session** | `staffSessionProcedure` | Logged-in staff member | Staff JWT cookie (`ctap_staff_session`) |
| **Protected** | `protectedProcedure` | Manus OAuth user (owner/manager) | Manus OAuth session cookie |
| **Admin** | `adminProcedure` | Owner only (role=admin) | Manus OAuth + role check |

## Public Endpoints (No Auth Required)

These are intentionally public — they are either login flows or read-only data that doesn't expose sensitive info.

| Router | Procedure | Justification | Rate Limited |
|--------|-----------|---------------|--------------|
| staff | loginByPin | Login entry point | YES (5/15min per IP+PIN) |
| emailAuth | register | New user registration | YES (5/15min per IP) |
| emailAuth | login | Email/password login | YES (5/15min per IP+email) |
| emailAuth | facebookLogin | Facebook OAuth login | YES (5/15min per IP) |
| briefing | latest | Today's briefing (no sensitive data) | No |
| knowledge | search | Knowledge base search (operational SOPs) | No |
| achievements | definitions | Achievement definitions (public catalog) | No |
| rewards | list | Reward catalog (public menu) | No |
| missions | active | Active photo missions (public) | No |
| training | modules | Training module catalog | No |
| schedule | getByStaff | Staff schedule lookup (by staffId) | No |
| stationBroadcasts | active | Active station broadcasts | No |
| issues | open | Open issues list (operational) | No |

## Staff Session Endpoints (Requires PIN/Email/Facebook Login)

Self-only access — the staffId comes from the server-side JWT, never from client input.

| Router | Procedure | What It Does |
|--------|-----------|--------------|
| staff | list | View staff roster (names/departments only) |
| staff | active | View active staff |
| staff | byId | View a staff profile |
| staff | byDepartment | View staff by department |
| staff | leaderboard | View gamified leaderboard |
| knowledge | ask | AI assistant (input sanitized, 500 char max) |
| photos | mySubmissions | View own photo submissions |
| achievements | myProgress | View own achievement progress |
| achievements | myUnlocks | View own new unlocks |
| achievements | acknowledge | Acknowledge own unlock |
| rewards | myRedemptions | View own reward redemptions |
| training | completions | View own training completions |
| availability | getByStaff | View own availability |
| availability | set | Set own availability |
| timeOff | request | Request own time off |
| timeOff | myRequests | View own time off requests |
| shiftSwaps | request | Request own shift swap |
| shiftSwaps | mySwaps | View own swap requests |
| timeClock | clockIn | Clock self in |
| timeClock | clockOut | Clock self out |
| timeClock | startBreak | Start own break |
| timeClock | endBreak | End own break |
| timeClock | active | View own active time entry |
| timeClock | history | View own time history |
| timeClock | weeklyHours | View own weekly hours |
| security | changePin | Change own PIN (requires current PIN) |
| emailAuth | linkFacebook | Link Facebook to own account |
| emailAuth | setPassword | Set/change own password |
| voids | myVoids | View own voids only |
| payouts | myPayouts | View own payouts only |

## Protected Endpoints (Requires Manus OAuth — Manager/Owner)

These require full Manus OAuth authentication. Managers and owners access operational intelligence.

| Router | Procedure | What It Does |
|--------|-----------|--------------|
| staff | create | Create new staff member |
| staff | update | Update staff details |
| checklists | list, create, complete, items | Manage checklists |
| voids | create, list, weeklyByEmployee | Void tracking |
| payouts | create, list, flagged | Payout management |
| invoices | create, list, recent | Invoice management |
| feedback | create, list | Feedback management |
| driverReports | create, list | Driver EOD reports |
| issues | create | Create issues |
| upload | receiptPhoto | Upload photos |
| admin | payoutTotals, invoiceTotals, etc. | Financial intelligence |
| knowledge | list, create | Manage knowledge base |
| photos | byMission, verify | Verify photo submissions |
| rewards | redeem, pendingApprovals, approve | Reward management |
| vendorProducts | list, create, updatePrice | Vendor management |
| orderGuides | list, create | Order guide management |
| schedule | getWeek, getByDepartment, create, update, delete | Schedule management |
| stationBroadcasts | create, acknowledge, resolve, history | Broadcast management |
| notifications | all notification management | Push notifications |
| security | events, stats, recentLockouts, resolve | Security audit log |
| timeClock | allActive, allWeeklyHours | View all staff clocks |
| priceAlerts | pending, reviewed, review, scan | Price monitoring |
| foodCost | summary, recalculateMargin | Food cost analysis |
| dailySales | list, create, summary | Sales data |
| training | complete, completions (for others) | Training management |

## Admin Endpoints (Owner Only — role=admin)

| Router | Procedure | What It Does |
|--------|-----------|--------------|
| admin | archiveInactive | Archive inactive staff (30 day) |
| admin | syncStaffFromDrive | Sync staff from Google Drive |
| admin | dailyPayoutDigest | Daily payout summary |
| achievements | seed | Seed achievement definitions |
| rewards | seed | Seed reward catalog |
| missions | create | Create photo missions |
| training | createModule | Create training modules |
| security | adminResetPin | Force-reset any staff PIN |

## Security Controls

### Rate Limiting
- PIN login: 5 attempts per IP per 15 minutes
- Email login: 5 attempts per IP+email per 15 minutes
- Facebook login: 5 attempts per IP per 15 minutes
- Registration: 5 attempts per IP per 15 minutes
- PIN change: Requires current PIN verification

### Session Management
- Staff session: JWT cookie, 12-hour expiry
- OAuth session: Managed by Manus platform
- Session timeout: 30-min inactivity auto-logout (sliding window)

### Input Validation
- All text inputs: Max length enforced via z.string().max()
- AI agent input: 500 char max, ChatML/system injection blocked
- Email: z.string().email() validation
- Phone: E.164 format normalization
- PIN: 4-8 digits only
- Password: 8+ characters minimum

### Audit Logging
- All login attempts (success/fail) logged with IP + user agent
- All lockout events logged + owner notified
- PIN changes logged
- Clock in/out logged
- Security events queryable by managers

### Data Protection
- Passwords: bcrypt 12 rounds
- PINs: Never returned in API responses
- Sensitive fields stripped: pin, passwordHash, facebookAccessToken, facebookId
- Staff can only access their own data (server-side staffId from JWT)
