import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import Header from "@/components/header";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";

export const metadata = {
  title: "Spott",
  description: "Discover and create amazing events",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          >
            <ClerkProvider appearance={{theme: dark,}}>
              <ConvexClientProvider>
                {/* header */}
                <Header/>
                <main className="relative min-h-screen container mx-auto pt-40 md:pt-32">
                  {/* glow */}
                  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl"/>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl"/>
                  </div>
                  <div className="relative z-10">{children}</div>
                  {/* footer */}
                  <Toaster richColors/>
                </main>
              </ConvexClientProvider>
            </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
