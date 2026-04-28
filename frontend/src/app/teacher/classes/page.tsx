'use client';

const adventurerClasses = [
  { name: 'Little Lamb', ageRange: '6 years', color: 'bg-pink-100 text-pink-700', members: 8, teacher: 'Mrs. Smith' },
  { name: 'Early Bird', ageRange: '6–7 years', color: 'bg-orange-100 text-orange-700', members: 10, teacher: 'Mr. Johnson' },
  { name: 'Busy Bee', ageRange: '7 years', color: 'bg-yellow-100 text-yellow-700', members: 12, teacher: 'Mrs. Adams' },
  { name: 'Sunbeam', ageRange: '7–8 years', color: 'bg-amber-100 text-amber-700', members: 9, teacher: 'Mr. Williams' },
  { name: 'Builder', ageRange: '8–9 years', color: 'bg-blue-100 text-blue-700', members: 11, teacher: 'Mrs. Davis' },
  { name: 'Helping Hand', ageRange: '9 years', color: 'bg-green-100 text-green-700', members: 7, teacher: 'Mr. Brown' },
];

export default function TeacherClassesPage() {
  // Show only teacher's assigned classes
  const myClasses = adventurerClasses.filter((c) => ['Busy Bee', 'Sunbeam'].includes(c.name));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Classes</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {myClasses.map((cls) => (
          <div key={cls.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${cls.color}`}>
              {cls.ageRange}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{cls.name}</h3>
            <p className="text-sm text-gray-500 mb-4">You are the teacher for this class</p>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#1e3a5f]">{cls.members}</p>
                <p className="text-xs text-gray-500">Children</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">85%</p>
                <p className="text-xs text-gray-500">Avg Progress</p>
              </div>
            </div>

            <button className="mt-4 w-full border border-[#1e3a5f] text-[#1e3a5f] py-2 rounded-lg text-sm font-semibold hover:bg-[#1e3a5f] hover:text-white transition-colors">
              View Class Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
