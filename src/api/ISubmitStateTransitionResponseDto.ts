import { IInclusionProofDto } from './InclusionProof.js';
import { SubmitStateTransitionStatus } from './SubmitStateTransitionStatus.js';

export interface ISubmitStateTransitionResponseDto {
  readonly inclusionProof: IInclusionProofDto;
  readonly status: SubmitStateTransitionStatus;
}
