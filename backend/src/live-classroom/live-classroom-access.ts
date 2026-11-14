/**
 * Server-side live classroom access policy.
 *
 * This function is intentionally pure: the controller/service must fetch the
 * class and registration from the database and authenticate the requesting
 * student before evaluating it. Never trust client-supplied payment flags.
 */
export interface LiveClassroomAccessInput {
  isRegistered: boolean;
  isPaidClass: boolean;
  hasConfirmedPaidAccess: boolean;
  isSessionOpen: boolean;
}

export type LiveClassroomAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'NOT_REGISTERED' | 'PAYMENT_REQUIRED' | 'NOT_LIVE' };

export function evaluateLiveClassroomAccess(
  input: LiveClassroomAccessInput,
): LiveClassroomAccessDecision {
  if (!input.isRegistered) return { allowed: false, reason: 'NOT_REGISTERED' };
  if (input.isPaidClass && !input.hasConfirmedPaidAccess) {
    return { allowed: false, reason: 'PAYMENT_REQUIRED' };
  }
  if (!input.isSessionOpen) return { allowed: false, reason: 'NOT_LIVE' };
  return { allowed: true };
}

/** All students start as viewers; the teacher must explicitly grant publishing. */
export const STUDENT_INITIAL_PERMISSIONS = Object.freeze({
  canPublish: false,
  canPublishData: true,
  canSubscribe: true,
  canUpdateOwnMetadata: false,
});

export const TEACHER_INITIAL_PERMISSIONS = Object.freeze({
  canPublish: true,
  canPublishData: true,
  canSubscribe: true,
  canUpdateOwnMetadata: false,
});
