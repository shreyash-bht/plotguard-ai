/** Mirror of `POST /api/v1/auth/guest-register` (sanitized user + bearer token). */
export interface Role {
  role_id: number;
  roleName: string | null;
  description: string | null;
}

export interface GuestUser {
  userId: string;
  username: string;
  emailId: string | null;
  /** Serializes as "tempUser" (Lombok getter strips the leading "is"). */
  tempUser: boolean | null;
  createdAt: string;
  lastLogin: string | null;
  status: string | null;
  roles: Role[] | null;
}

/** Response of `POST /api/v1/auth/guest-register`. */
export interface GuestSession {
  token_type: string;
  access_token: string;
  /** Token lifetime in seconds. */
  expires_in: number;
  user: GuestUser;
}
