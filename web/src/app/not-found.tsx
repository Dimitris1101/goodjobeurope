export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="mt-2 opacity-80">Page not found</p>
      </div>
    </div>
  );
}
