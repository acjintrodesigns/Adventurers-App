import Link from 'next/link';

export default function PledgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7fd] to-[#e7effa] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <img
            src="/adventurer-logo.png"
            alt="Adventurer badge"
            className="w-16 h-16 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Pledge &amp; Law</h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto mt-3 rounded-full" />
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">Adventurer Pledge</h2>
            <p className="text-gray-700 italic text-center text-lg leading-relaxed">
              &ldquo;Because Jesus loves me, I will always do my best.&rdquo;
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">Adventurer Law</h2>
            <p className="text-gray-700 italic text-center text-lg leading-relaxed">
              &ldquo;Jesus can help me to:&rdquo;
            </p>

            <ol className="mt-4 space-y-2 list-decimal list-inside text-left text-sm text-[#1e3a5f] font-medium bg-white rounded-lg p-4">
              {[
                'Be obedient',
                'Be pure',
                'Be true',
                'Be kind',
                'Be respectful',
                'Be attentive',
                'Be helpful',
                'Be cheerful',
                'Be thoughtful',
                'Be reverent',
              ].map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ol>
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
