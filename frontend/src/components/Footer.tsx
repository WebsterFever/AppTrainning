export default function Footer() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <img
            src="/logoLightMode.png"
            alt="Webster Technology School"
            className="h-12 w-auto dark:hidden"
          />
          <img
            src="/logoDarkMode.png"
            alt="Webster Technology School"
            className="h-12 w-auto hidden dark:block"
          />
          <p className="text-xs text-ink/50">Live training, hosted on Zoom.</p>
        </div>
        <p className="text-xs font-mono text-ink/40">
          © {new Date().getFullYear()} Webster Technology School. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
