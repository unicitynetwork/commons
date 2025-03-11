import { SubmitStateTransitionStatus } from './SubmitStateTransitionStatus';


export interface ISubmitStateTransitionResponseDto {
  readonly status: SubmitStateTransitionStatus;
  readonly requestId: string;
}
