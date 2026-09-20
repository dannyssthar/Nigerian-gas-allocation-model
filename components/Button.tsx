"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

/**
 * The button, as a component.
 *
 * Hover and press live in Framer Motion springs rather than CSS transitions.
 * The difference is not taste: a CSS hover transform re-triggers at the hover
 * boundary (leave by one pixel and re-enter, and the transition restarts from
 * wherever it was, which reads as a shake), while a spring retargets \u2014 an
 * interrupted lift simply turns around mid-flight. One definition here means
 * every button in the product shares one physics.
 */
export default function Btn({
  variant = "default",
  className = "",
  children,
  ...rest
}: HTMLMotionProps<"button"> & {
  variant?: "default" | "accent" | "ghost" | "primary";
}) {
  const v =
    variant === "accent"
      ? "djn-btn--accent"
      : variant === "ghost"
        ? "djn-btn--ghost"
        : variant === "primary"
          ? "djn-btn--primary"
          : "";

  return (
    <motion.button
      className={`djn-btn ${v} r-pill ${className}`}
      initial={false}
      whileHover={{ y: -1 }}
      whileTap={{ y: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}