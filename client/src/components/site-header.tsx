import { Link } from "wouter";

export function SiteHeader() {
  return (
    <div className="text-center">
      <Link href="/">
        <div className="flex flex-col items-center">
          <img src="/dfm-logo.png" alt="DFM Logo" className="h-12 mb-2" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-2">
            AI DFM Agent
          </h1>
        </div>
      </Link>
    </div>
  );
}