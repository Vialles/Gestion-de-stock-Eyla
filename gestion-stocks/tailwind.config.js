/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        rouille: "#a83b0b",
        terracotta: "#d87150",
        peche: "#e19e88"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};
