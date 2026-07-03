"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Initialize from localStorage
  const getInitialTheme = () => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("theme") || "dark";
  };

  const getInitialAccessibility = () => {
    if (typeof window === "undefined") {
      return {
        highContrast: false,
        fontSize: "normal",
        reduceMotion: false,
      };
    }

    const saved = localStorage.getItem("accessibility");
    let accessibility = {
      highContrast: false,
      fontSize: "normal",
      reduceMotion: false,
    };

    if (saved) {
      try {
        accessibility = JSON.parse(saved);
      } catch (err) {
        console.error("Error parsing accessibility settings:", err);
      }
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      accessibility.reduceMotion = true;
    }

    return accessibility;
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [accessibility, setAccessibility] = useState(getInitialAccessibility);

  const applyTheme = (newTheme, newAccessibility) => {
    const html = document.documentElement;

    // Apply theme
    html.setAttribute("data-theme", newTheme);

    // Apply accessibility settings
    if (newAccessibility?.highContrast) {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }

    if (newAccessibility?.reduceMotion) {
      html.classList.add("reduce-motion");
    } else {
      html.classList.remove("reduce-motion");
    }

    html.style.fontSize =
      newAccessibility?.fontSize === "large"
        ? "18px"
        : newAccessibility?.fontSize === "xlarge"
        ? "20px"
        : "16px";
  };

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme, accessibility);
  }, [theme, accessibility]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme, accessibility);
  };

  const updateAccessibility = (newSettings) => {
    const updated = { ...accessibility, ...newSettings };
    setAccessibility(updated);
    localStorage.setItem("accessibility", JSON.stringify(updated));
    applyTheme(theme, updated);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        accessibility,
        updateAccessibility,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
