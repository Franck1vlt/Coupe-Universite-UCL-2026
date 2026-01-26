"use client";
export default function FAQPage() {
    const faqs = [
        {
            question: "Qu'est-ce que la Coupe de l'Université ?",
            answer:
                "La Coupe de l'Université est un tournoi sportif inter-universitaire rassemblant différentes équipes autour de plusieurs sports pour promouvoir l'esprit d'équipe, la compétition et la convivialité.",
        },
        {
            question: "Comment inscrire une équipe ?",
            answer:
                "Pour inscrire une équipe, rendez-vous sur la page d'inscription du site officiel, remplissez le formulaire et suivez les instructions. L'inscription est ouverte à tous les étudiants de l'université.",
        },
        {
            question: "Quels sports sont proposés ?",
            answer:
                "Les sports proposés varient chaque année, mais incluent généralement le football, le basket, le volley, le handball, et d'autres disciplines populaires.",
        },
        {
            question: "Comment consulter les résultats et classements ?",
            answer:
                "Les résultats et classements sont disponibles en temps réel sur la page 'Tableau de Classement' du site.",
        },
        {
            question: "Qui contacter en cas de problème ?",
            answer: (
                <>
                    Vous pouvez contacter l'organisation via le <a href="/contact" className="text-blue-600 underline hover:text-blue-800">formulaire de contact</a> du site ou par email à l'adresse indiquée dans la section <a href="/contact" className="text-blue-600 underline hover:text-blue-800">Contact</a>.
                </>
            ),
        },
        {
            question: "Où ont lieu les matchs ?",
            answer:
                "Les matchs se déroulent sur les différents terrains sportifs du campus universitaire. Les lieux précis sont indiqués dans le planning des matchs.",
        },
    ];

    return (
        <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-8">
            <button
                onClick={() => window.history.back()}
                className="absolute left-4 top-4 flex items-center gap-2 bg-white rounded-full shadow px-4 py-2 hover:bg-blue-50 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Retour"
            >
                <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 20 20"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4l-6 6m0 0l6 6m-6-6h14"
                    />
                </svg>
                <span className="text-blue-700 font-medium">Retour</span>
            </button>

            <header className="mb-12 text-center">
                <img
                    src="/img/coupe.png"
                    alt="Logo Coupe de l'Université"
                    className="mx-auto mb-6 h-24 w-24 object-contain"
                />
                <h1 className="text-4xl font-bold text-gray-800 mb-2">❓ Foire Aux Questions</h1>
                <p className="text-gray-600 text-lg">
                    Retrouvez ici les réponses aux questions les plus fréquentes concernant la Coupe de l'Université.
                </p>
            </header>

            <section className="w-full px-2 sm:px-4 max-w-2xl">
                <div className="bg-white rounded-2xl shadow-lg border-2 border-transparent p-4 sm:p-8">
                    <ul className="space-y-4 sm:space-y-6">
                        {faqs.map((faq, idx) => (
                            <li key={idx} className="">
                                <details className="group border-b pb-3 sm:pb-4">
                                    <summary className="cursor-pointer text-base sm:text-lg font-semibold text-blue-700 flex items-center justify-between group-open:text-blue-900 transition">
                                        {faq.question}
                                        <span className="ml-2 text-blue-400 group-open:rotate-90 transition-transform">▶</span>
                                    </summary>
                                    <div className="mt-2 text-gray-700 text-sm sm:text-base pl-2">
                                        {faq.answer}
                                    </div>
                                </details>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </main>
    );
}