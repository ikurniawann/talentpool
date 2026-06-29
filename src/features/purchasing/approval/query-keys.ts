export const approvalQueryKeys = {
  all: ["purchasing", "approval"] as const,
  pendingPRs: ["purchasing", "approval", "pending-prs"] as const,
};
