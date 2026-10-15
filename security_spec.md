# ForexPulse Security Specification

## 1. Data Invariants
- Every `forex_analyses` document must have an authentic `userId` matching `request.auth.uid`.
- Users may only read, list, create, and delete their own trading analyses (`resource.data.userId == request.auth.uid`).
- Signals must strictly be one of `['BUY', 'SELL', 'HOLD']`.
- Confidences must strictly be one of `['High', 'Medium', 'Low']`.
- Documents must not exceed maximum string lengths for text fields.
- Non-authenticated requests are strictly rejected across all operations.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Read**: Attempting to read `/forex_analyses/123` with `request.auth == null` -> DENIED.
2. **Unauthenticated Write**: Attempting to create analysis with `request.auth == null` -> DENIED.
3. **Cross-Tenant Read**: User B reading analysis owned by User A -> DENIED.
4. **Cross-Tenant Write**: User B creating analysis with `userId: "userA"` -> DENIED.
5. **Cross-Tenant Delete**: User B deleting analysis belonging to User A -> DENIED.
6. **Invalid Signal Enum**: Creation payload with `signal: "MAYBE"` -> DENIED.
7. **Invalid Confidence Enum**: Creation payload with `confidence: "ExtremelyHigh"` -> DENIED.
8. **Missing Required Pair**: Creation payload missing `pair` -> DENIED.
9. **Missing Required Signal**: Creation payload missing `signal` -> DENIED.
10. **Ghost Field Injection**: Adding unapproved shadow fields like `isAdmin: true` -> DENIED.
11. **Malicious Long String**: Injecting 500KB into `pair` or `signal` -> DENIED.
12. **Id Poisoning**: Invalid document ID containing forbidden characters -> DENIED.

## 3. Test Runner
Automated tests verify that all payloads in the Dirty Dozen return PERMISSION_DENIED when tested against firestore.rules.
