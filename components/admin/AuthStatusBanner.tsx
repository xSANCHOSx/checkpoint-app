// Серверний компонент — читає process.env на сервері
// Щоб ввімкнути авторизацію оператора:
//   1. Встановіть AUTH_OPERATOR_REQUIRED=true в .env
//   2. Перезапустіть сервер

const authEnabled = process.env.AUTH_OPERATOR_REQUIRED === 'true'

export function AuthStatusBanner() {
  return (
    <div
      className={`mb-6 rounded-xl border px-5 py-4 flex items-start gap-3 ${
        authEnabled
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <span className="text-2xl shrink-0">{authEnabled ? '🔒' : '🔓'}</span>
      <div className="min-w-0">
        <div
          className={`font-semibold text-sm ${
            authEnabled ? 'text-green-800' : 'text-amber-800'
          }`}
        >
          {authEnabled
            ? 'Авторизація оператора увімкнена'
            : 'Тестовий режим — авторизація оператора вимкнена'}
        </div>
        <div
          className={`text-xs mt-1 leading-relaxed ${
            authEnabled ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          {authEnabled ? (
            'Оператор повинен увійти, щоб використовувати КПП. Для вимкнення встановіть AUTH_OPERATOR_REQUIRED=false в .env'
          ) : (
            <>
              Головна сторінка КПП відкрита без логіну. Щоб увімкнути — встановіть{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-800">
                AUTH_OPERATOR_REQUIRED=true
              </code>{' '}
              в{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-800">
                .env
              </code>{' '}
              та перезапустіть сервер.
            </>
          )}
        </div>
      </div>
    </div>
  )
}