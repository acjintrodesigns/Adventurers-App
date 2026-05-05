'use client';

const adventurerClasses = [
  { name: 'Little Lamb', ageRange: '6 years', color: 'bg-pink-100 text-pink-700', members: 8, teacher: 'Mrs. Smith', logo: '/class-logos/little-lamb.png' },
  { name: 'Early Bird', ageRange: '6–7 years', color: 'bg-orange-100 text-orange-700', members: 10, teacher: 'Mr. Johnson', logo: '/class-logos/early-bird.png' },
  { name: 'Busy Bee', ageRange: '7 years', color: 'bg-yellow-100 text-yellow-700', members: 12, teacher: 'Mrs. Adams', logo: '/class-logos/busy-bee.png' },
  { name: 'Sunbeam', ageRange: '7–8 years', color: 'bg-amber-100 text-amber-700', members: 9, teacher: 'Mr. Williams', logo: '/class-logos/sunbeam.png' },
  { name: 'Builder', ageRange: '8–9 years', color: 'bg-blue-100 text-blue-700', members: 11, teacher: 'Mrs. Davis', logo: '/class-logos/builder.png' },
  { name: 'Helping Hand', ageRange: '9 years', color: 'bg-green-100 text-green-700', members: 7, teacher: 'Mr. Brown', logo: '/class-logos/helping-hand.png' },
];

export default function DirectorClassesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Adventurer Classes</h1>
        <button className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
          + Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {adventurerClasses.map((cls) => (
          <div key={cls.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-3">{cls.name}</h3>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cls.color}`}>
                {cls.ageRange}
              </div>
              {cls.logo ? (
                <img src={cls.logo} alt={`${cls.name} logo`} className="w-16 h-16 object-contain flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 text-[11px] font-semibold text-center leading-tight px-2 flex-shrink-0">
                  No logo
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">Teacher: {cls.teacher}</p>

            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(cls.members, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-[#1e3a5f] border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                {cls.members > 4 && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold">
                    +{cls.members - 4}
                  </div>
                )}
              </div>
              <span className="text-2xl font-bold text-[#1e3a5f]">{cls.members}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">members</p>
          </div>
        ))}
      </div>
    </div>
  );
}
