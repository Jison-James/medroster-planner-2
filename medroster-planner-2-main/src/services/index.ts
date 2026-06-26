// Simulated async services — placeholder for a real backend later.
const wait = (ms = 450) => new Promise<void>((res) => setTimeout(res, ms));

export async function simulate<T>(value: T, delay = 450, failRate = 0): Promise<T> {
  await wait(delay);
  if (failRate > 0 && Math.random() < failRate) {
    throw new Error("Something went wrong — please try again.");
  }
  return value;
}

export const staffService = {
  list: () => simulate(null),
  save: (data: unknown) => simulate(data, 500),
  remove: (id: string) => simulate(id, 400),
};

export const leaveService = {
  approve: (id: string) => simulate(id, 400),
  reject: (id: string) => simulate(id, 400),
  submit: (data: unknown) => simulate(data, 500),
};

export const rosterService = {
  generate: () => simulate(null, 1200),
  publish: () => simulate(null, 700),
  assign: (data: unknown) => simulate(data, 400),
};

export const swapService = {
  approve: (id: string) => simulate(id, 400),
  reject: (id: string) => simulate(id, 400),
  submit: (data: unknown) => simulate(data, 500),
};

export const settingsService = {
  save: (data: unknown) => simulate(data, 500),
};

export const conflictService = {
  act: (id: string, action: "Resolve" | "Reassign" | "Ignore") => simulate({ id, action }, 400),
};

export const notificationService = {
  markRead: (id: string) => simulate(id, 200),
  markAllRead: () => simulate(null, 300),
};

export const availabilityService = {
  save: (data: unknown) => simulate(data, 500),
};

export const supportService = {
  submit: (data: unknown) => simulate(data, 500),
};

export const authService = {
  changePassword: (data: unknown) => simulate(data, 500),
};

export const userService = {
  invite: (data: unknown) => simulate(data, 500),
  update: (data: unknown) => simulate(data, 400),
};
