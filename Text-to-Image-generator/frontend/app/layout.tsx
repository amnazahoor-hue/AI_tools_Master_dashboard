import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "AI Article + Image Generator",
  description: "Generate articles and related images from prompts."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
