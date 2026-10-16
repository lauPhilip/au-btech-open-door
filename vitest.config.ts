import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["shared/src/**/*.test.ts", "room/src/**/*.test.ts", "app/src/**/*.test.ts"],
  },
});
