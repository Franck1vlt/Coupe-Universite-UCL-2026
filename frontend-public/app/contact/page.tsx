"use client";
export default function ContactPage() {
    const contacts = [
        {
            role: "Président",
            name: "Alice Dupont",
            phone: "06 00 00 00 01",
            email: "president@ucl-coupe.fr",
        },
        {
            role: "Vice-Président Events",
            name: "Benoît Martin",
            phone: "06 00 00 00 02",
            email: "vp.events@ucl-coupe.fr",
        },
        {
            role: "Responsable Communication",
            name: "Claire Leroy",
            phone: "06 00 00 00 03",
            email: "com@ucl-coupe.fr",
        },
        {
            role: "Responsable Sports",
            name: "David Morel",
            phone: "06 00 00 00 04",
            email: "sports@ucl-coupe.fr",
        },
        {
            role: "Trésorier",
            name: "Emma Petit",
            phone: "06 00 00 00 05",
            email: "tresorier@ucl-coupe.fr",
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

            <header className="mb-10 text-center">
                <img
                    src="/img/coupe.png"
                    alt="Logo Coupe de l'Université"
                    className="mx-auto mb-6 h-24 w-24 object-contain"
                />
                <h1 className="text-4xl font-bold text-gray-800 mb-2">Contact</h1>
                <p className="text-gray-600 text-lg">
                    Retrouvez ici les contacts de l'organisation de la Coupe de l'Université selon votre besoin.
                </p>
            </header>

            <section className="w-full px-2 sm:px-4 max-w-6xl">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {contacts.map((contact, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-4 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl transition min-w-0"
                        >
                            <div className="mb-2 text-blue-700 font-semibold text-base sm:text-lg">{contact.role}</div>
                            <div className="mb-1 text-gray-800 text-lg sm:text-xl font-bold break-words">{contact.name}</div>
                            <div className="mb-1 text-gray-600 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2.28a2 2 0 011.7 1.06l1.1 2.2a2 2 0 01-.45 2.45l-.9.9a16.06 16.06 0 006.36 6.36l.9-.9a2 2 0 012.45-.45l2.2 1.1A2 2 0 0121 18.72V21a2 2 0 01-2 2h-1C9.163 23 1 14.837 1 5V4a2 2 0 012-2z" /></svg>
                                <span className="break-all">{contact.phone}</span>
                            </div>
                            <div className="mb-1 text-gray-600 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                                <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m0 0l4-4m-4 4l4 4" /><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} fill="none" /></svg>
                                <a href={`mailto:${contact.email}`} className="text-blue-600 underline hover:text-blue-800 break-all">{contact.email}</a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}