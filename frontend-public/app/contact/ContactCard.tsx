interface ContactCardProps {
  name: string;
  role: string;
}

export default function ContactCard({ name, role }: ContactCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-4 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl transition min-w-0">
      <div className="mb-1 text-gray-800 text-lg sm:text-xl font-bold break-words">
        {name}
      </div>
      <div className="text-blue-700 font-semibold text-base sm:text-lg">
        {role}
      </div>
    </div>
  );
}
