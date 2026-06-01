const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readLease = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

export const shouldRunSharedPoll = (name, leaseMs) => {
  if (document.visibilityState !== 'visible') return false;

  const key = `zenzio_poll_lease_${name}`;
  const now = Date.now();
  const current = readLease(key);

  if (current?.owner && current.owner !== TAB_ID && Number(current.expiresAt) > now) {
    return false;
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        owner: TAB_ID,
        expiresAt: now + leaseMs,
      }),
    );
  } catch {
    return true;
  }

  return true;
};
