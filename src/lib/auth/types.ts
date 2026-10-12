export type UserId = string;

export type UserRecord = {
  id: UserId;
  email: string;
  passwordHash: string;
  createdAt: string;
};

/** Safe to return to the browser. */
export type PublicUser = {
  id: UserId;
  email: string;
};

export type UserSessionRecord = {
  id: string;
  userId: UserId;
  expiresAt: string;
  createdAt: string;
};
