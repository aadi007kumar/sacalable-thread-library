/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        panel: "#0f1f33",
        mist: "#d7e4f5",
        signal: "#7dd3fc",
        lime: "#c4f16f",
        ember: "#fb923c",
        rose: "#fb7185",
      },
      boxShadow: {
        glow: "0 20px 45px rgba(125, 211, 252, 0.18)",
      },
      animation: {
        pulsebar: "pulsebar 1.8s ease-in-out infinite",
        floatup: "floatup 0.45s ease-out",
      },
      keyframes: {
        pulsebar: {
          "0%, 100%": { opacity: "0.55", transform: "scaleX(1)" },
          "50%": { opacity: "1", transform: "scaleX(1.02)" },
        },
        floatup: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
