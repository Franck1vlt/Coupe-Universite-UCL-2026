export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-700 to-indigo-400">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl bg-gray-900/90 backdrop-blur-lg">
        <div className="flex flex-col items-center">
          <img
            alt="Logo"
            src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
            className="h-14 w-14 mb-4 drop-shadow-lg animate-fade-in"
          />
          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Connexion à votre compte</h2>
          <p className="text-indigo-200 text-sm mb-6">Bienvenue ! Veuillez entrer vos identifiants.</p>
        </div>
        <form action="#" method="POST" className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-indigo-200 mb-1">
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="exemple@uclouvain.be"
              className="block w-full rounded-lg bg-white/10 px-4 py-2 text-base text-white placeholder:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-indigo-200">
                Mot de passe
              </label>
              <a href="#" className="text-xs text-indigo-300 hover:text-indigo-100 transition-colors">Mot de passe oublié ?</a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="block w-full rounded-lg bg-white/10 px-4 py-2 text-base text-white placeholder:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 shadow-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-base shadow-md transition-all duration-200 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
          >
            Se connecter
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-indigo-200">
          Pas encore membre ?{' '}
          <a href="#" className="font-semibold text-indigo-300 hover:text-white transition-colors">
            Commencez votre essai gratuit
          </a>
        </p>
      </div>
    </div>
  )
}
