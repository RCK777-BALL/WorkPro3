export type MemberOnboardingStepStatus = 'pending' | 'in_progress' | 'completed';

export interface MemberOnboardingResource {
  label: string;
  type: 'doc' | 'video' | 'form' | 'checklist';
  url: string;
}

export interface MemberOnboardingStep {
  id: string;
  title: string;
  description: string;
  ownerRole: string;
  expectedDays: number;
  status: MemberOnboardingStepStatus;
  resources: MemberOnboardingResource[];
}

export interface MemberOnboardingPlan {
  steps: MemberOnboardingStep[];
  defaultStatus: MemberOnboardingStepStatus;
  lastUpdated: string;
}
