export function Footer() {
  return (
    <footer className="border-t border-border-card bg-card">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-dim hover:text-secondary transition-colors text-sm">
            Facebook
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-dim hover:text-secondary transition-colors text-sm">
            YouTube
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-dim hover:text-secondary transition-colors text-sm">
            Discord
          </a>
        </div>
        <p className="text-faint text-xs text-center">
          © Noob Squad All Rights Reserved. Developed by Abir Roy
        </p>
      </div>
    </footer>
  );
}
