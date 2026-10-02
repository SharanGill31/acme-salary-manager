export interface Clock {
  today(): Date;
}

export const systemClock: Clock = {
  today: () => new Date(),
};
