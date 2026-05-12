import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Sulu in Wounderland",
  description:
    "Explore open roles and apply to join the Sulu in Wounderland team.",
};

export default function CareerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
