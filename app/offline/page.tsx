export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Немає з'єднання
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Ця сторінка недоступна офлайн. Перевірте підключення до інтернету та спробуйте ще раз.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          На головну
        </a>
      </div>
    </div>
  )
}
