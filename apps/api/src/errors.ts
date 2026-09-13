export type ErrorCode =
  | 'bad_request'
  | 'unauthenticated'
  | 'not_found'
  | 'not_your_desk'
  | 'checklist_open'
  | 'comment_required'
  | 'already_at_first_stage'
  | 'primary_document_frozen'
  | 'document_not_owned'
  | 'document_already_attached'
  | 'document_not_uploaded'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'invalid_credentials'
  | 'admin_only'
  // Admin-surface rejections. These used to share `bad_request` with a dozen
  // other causes, which left the super admin staring at one opaque code for
  // five entirely different mistakes — each with a different fix.
  | 'email_taken'
  | 'secretary_category_required'
  | 'monitor_cluster_required'
  | 'submitter_cluster_required'
  | 'sla_out_of_range'
  | 'route_target_invalid'
  | 'internal'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ApiError'
  }
}

export const BadRequest = (code: ErrorCode = 'bad_request', message?: string) => new ApiError(400, code, message)
export const Unauthenticated = () => new ApiError(401, 'unauthenticated')
export const Forbidden = (code: ErrorCode) => new ApiError(403, code)
export const NotFound = () => new ApiError(404, 'not_found')
export const Conflict = (code: ErrorCode) => new ApiError(409, code)
