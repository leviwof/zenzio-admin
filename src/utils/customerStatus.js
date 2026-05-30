/** Customer is blocked only when admin explicitly deactivated the account. */
export const isCustomerBlocked = (user) =>
  user?.isActive === false ||
  user?.isActive === 0 ||
  user?.status === false ||
  user?.status === 0;

export const getCustomerStatus = (user) => (isCustomerBlocked(user) ? "blocked" : "active");

export const isCustomerActive = (user) => !isCustomerBlocked(user);
