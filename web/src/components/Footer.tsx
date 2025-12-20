export default function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600 flex items-center justify-between">
        <p>© {new Date().getFullYear()} GOODJOBEUROPE</p>
        <nav className="flex gap-4">
          <a href="/terms" className="hover:underline">Terms</a>
          <a href="/privacy" className="hover:underline">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
