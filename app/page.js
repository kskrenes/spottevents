import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* left */}
          <div className="text-center sm:text-left">
            <span className="text-gray-500 font-light tracking-wide">
              spott<span className="text-purple-400">*</span>
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold my-6 leading-[0.95] tracking-tight">
              Discover &<br/>
              create amazing<br/>
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
                events.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-lg font-light">
              Whether you&apos;re hosting or attending, Spott makes every event memorable. Join our community today.
            </p>
            <Button size="xl" className={"rounded-full"} asChild>
              <Link href="/explore">
                Get Started
              </Link>
            </Button>
          </div>
          {/* right */}
          <div>
            <Image
              src="/3d-react.png"
              alt="React meetup event displayed on a phone"
              width={700}
              height={700}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>
    </main>
  );
}
