# OneX Club — Auth Testing Playbook

Refer to the Emergent Google Auth integration playbook.

## Set up a test user/session manually

```bash
mongosh --eval "
use('test_database');
var userId = 'user_test_' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'qa.surya.' + Date.now() + '@onex.club',
  name: 'Surya Test',
  picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&q=85',
  tier: 'Cadet',
  aed_balance: 285,
  referral_code: 'qa-' + Math.floor(Math.random()*1e6),
  created_at: new Date()
});
db.user_milestones.insertOne({
  user_id: userId,
  milestones: [
    { id: 'join_waitlist', title: 'Join Waitlist', subtitle: '', status: 'completed', icon: 'user-plus' },
    { id: 'verify_mobile', title: 'Verify Mobile', subtitle: '', status: 'pending', icon: 'smartphone' },
    { id: 'complete_kyc', title: 'Complete KYC', subtitle: '', status: 'pending', icon: 'id-card' },
    { id: 'attend_webinar', title: 'Attend Webinar', subtitle: '', status: 'upcoming', icon: 'calendar' },
    { id: 'reserve_allocation', title: 'Reserve Allocation', subtitle: '', status: 'upcoming', icon: 'pie-chart' }
  ]
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('USER_ID=' + userId);
print('SESSION_TOKEN=' + sessionToken);
"
```

## Backend smoke tests

```bash
API="$REACT_APP_BACKEND_URL/api"
TOKEN="<paste session token>"
curl -s "$API/auth/me" -H "Authorization: Bearer $TOKEN"
curl -s "$API/dashboard" -H "Authorization: Bearer $TOKEN"
curl -s "$API/progress" -H "Authorization: Bearer $TOKEN"
curl -s "$API/benefits-ladder" -H "Authorization: Bearer $TOKEN"
curl -s "$API/properties" -H "Authorization: Bearer $TOKEN"
curl -s "$API/allocation-interests" -H "Authorization: Bearer $TOKEN"
curl -s "$API/webinars?tab=upcoming" -H "Authorization: Bearer $TOKEN"
curl -s "$API/referrals" -H "Authorization: Bearer $TOKEN"
curl -s "$API/leaderboard?period=weekly" -H "Authorization: Bearer $TOKEN"
curl -s "$API/community-updates" -H "Authorization: Bearer $TOKEN"
curl -s "$API/co-owner-benefits" -H "Authorization: Bearer $TOKEN"
curl -s "$API/support" -H "Authorization: Bearer $TOKEN"
curl -s "$API/settings" -H "Authorization: Bearer $TOKEN"
```

## Browser session (Playwright)

```python
await page.context.add_cookies([{
  "name": "session_token",
  "value": SESSION_TOKEN,
  "domain": HOST_WITHOUT_SCHEME,
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None"
}])
await page.goto(f"{APP_URL}/dashboard")
```

## Checks
- /api/auth/me returns user with `user_id`, `aed_balance`, `tier`.
- Dashboard responds with `milestones`, `next_tier`, `spotlight_property`.
- All POST mutations (waitlist, save preferences, register webinar, like/save updates, complete milestone, settings PUT) return 200 with `ok: true` and update the database.
