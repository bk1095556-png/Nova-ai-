import type { Config } from "next";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nova: {
          bg: "#070910",
          surface: "#0d111d",
          elevated: "#13192b",
          border: "rgba(148, 163, 184, 0.14)",
          blue: "#3b82f6",
          violet: "#8b5cf6",
          cyan: "#06b6d4",
        },
      },
      animation: {
        "pulse-slow": "pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
