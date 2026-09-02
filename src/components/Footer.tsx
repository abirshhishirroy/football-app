export function Footer() {
  return (
    <footer className="border-t border-gray-700 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
            Facebook
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
            YouTube
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
            Discord
          </a>
        </div>
        <p className="text-gray-600 text-xs text-center">
          © Noob Squad All Rights Reserved. Developed by Abir Roy
        </p>
      </div>
    </footer>
  );
}
