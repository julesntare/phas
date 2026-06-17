import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-brand font-bold text-sm no-underline">
            <Image src="/phas-icon.png" alt="PHAS" width={24} height={24} className="rounded-md" />
            PHAS
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          {/* Icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Badge */}
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold tracking-wide uppercase">
            404
          </span>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Page not found</h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/status"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold no-underline hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View status
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold no-underline hover:bg-gray-50 transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto w-full px-4 pb-8">
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} PHAS — Rwanda
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors no-underline">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors no-underline">Terms of Use</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
