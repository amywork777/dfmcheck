import { Link } from "wouter";

export function SiteHeader() {
  return (
    <div className="mb-6">
      <Link href="/">
        <div className="flex flex-col items-center">
          <img src="/dfm-logo.png" alt="DFM Logo" className="h-12 mb-2" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight">
            AI DFM Agent
          </h1>
        </div>
      </Link>
      <p className="text-center text-muted-foreground mt-2">
        Upload your 3D model for instant manufacturability feedback
      </p>
    </div>
  );
}