import { SubmitStateTransitionStatus } from './SubmitStateTransitionStatus.js';

export interface ISubmitStateTransitionResponseDto {
  readonly status: SubmitStateTransitionStatus;
  readonly requestId: string;
}
