import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis?: Redis;
};

function createRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  return new Redis(url, {
    maxRetriesPerRequest: 2,
  });
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
