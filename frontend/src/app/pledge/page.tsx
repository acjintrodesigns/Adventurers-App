import Link from 'next/link';

export default function PledgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✋</div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Pledge &amp; Law</h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto mt-3 rounded-full" />
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">The Adventurer Pledge</h2>
            <p className="text-gray-700 italic text-center text-lg leading-relaxed">
              &ldquo;Because Jesus loves me, I will always do my best.&rdquo;
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">The Adventurer Law</h2>
            <p className="text-gray-700 italic text-center text-lg leading-relaxed">
              &ldquo;I will be obedient, Pure, True, Loving, Kind.&rdquo;
            </p>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {['Obedient', 'Pure', 'True', 'Loving', 'Kind'].map((value) => (
                <div key={value} className="bg-white rounded-lg p-2 text-center shadow-sm">
                  <p className="text-xs font-semibold text-[#1e3a5f]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/philosophy" className="text-sm text-[#1e3a5f] font-semibold hover:underline">
            Philosophy →
          </Link>
          <Link href="/song" className="text-sm text-gray-400 hover:underline">
            ← Song
          </Link>
        </div>
      </div>
    </div>
  );
}
