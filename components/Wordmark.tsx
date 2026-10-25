type WordmarkProps = {
  variant?: "ink" | "light";
  className?: string;
};

const sources = {
  ink: "/brand/wordmark.png",
  light: "/brand/wordmark-light.png",
} as const;

export function Wordmark({ variant = "ink", className }: WordmarkProps) {
  return (
    <img
      className={className}
      src={sources[variant]}
      alt=""
      width={907}
      height={380}
    />
  );
}
