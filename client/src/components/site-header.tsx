import { Link } from "wouter";

export function SiteHeader() {
  return (
    <div className="text-center">
      <div className="inline-flex flex-col items-center bg-white/50 backdrop-blur-sm rounded-lg p-6 mb-6">
        <Link href="/">
          <div className="flex flex-col items-center">
            <img src="/taiyaki.png" alt="Taiyaki Logo" className="h-12 mb-4" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AI DFM Agent
            </h1>
          </div>
        </Link>
      </div>
    </div>
  );
}