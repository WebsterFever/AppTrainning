# Live Classroom — implementation plan (work in progress)

## Agreed product rules
- Both broadcast-style and interactive classes are hosted **inside Webster Technology School**, not YouTube.
- Free class: existing registration required.
- Paid class: existing registration **and verified payment/entitlement** required.
- Teacher alone can grant/revoke microphone or camera publishing permissions. Students start with both disabled.
- Students can raise a hand and chat; teacher can mute/remove participants.
- iPhone browser support must be tested, especially screen sharing.
- No production deployment or merge without owner approval.

## Existing code findings
- Frontend: React/Vite; class page is `frontend/src/pages/ClassDetail.tsx`.
- Backend: NestJS; class and registration logic in `backend/src/classes` and `backend/src/registrations`.
- Paid classes currently use `allowedEmails` granted by Stripe or an admin.
- **Important security gap:** student registration currently identifies the student by an email supplied in the request; it is not a cryptographically authenticated student session. This is insufficient for issuing private video-room tokens. Before connecting LiveKit, implement verified student authentication (email verification or authenticated student accounts) and server-side entitlement checks. Do not rely on browser localStorage identity alone.
- Existing backend TypeORM configuration has `synchronize: true`. Avoid adding entities/schema changes until migration safety is reviewed.

## Incremental implementation
1. Define pure server-side eligibility and initial permission policy (added in `backend/src/live-classroom/live-classroom-access.ts`).
2. Add secure student authentication and verify access using server-side registration and paid entitlement records.
3. Integrate LiveKit server SDK to issue short-lived, class-scoped tokens only after checks. Keep API secret exclusively on backend.
4. Build teacher session controls, scheduling and student raise-hand/permission workflow. Enforce publishing rights in LiveKit server-side.
5. Embed LiveKit React classroom inside the existing class detail route; support chat, broadcast mode and interactive mode.
6. Test free, paid, unpaid, unregistered, expired/revoked permissions, iPhone Safari, and teacher moderation.
7. Run preview builds and review PR; only merge/deploy with explicit approval.

## Status
Initial access-policy code committed on a feature branch. Live streaming is **not yet operational**. No database or production changes.
