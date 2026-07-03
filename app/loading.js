export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-[74vh] md:h-[88vh] rounded-b-[2rem] md:rounded-b-[3rem] bg-white/5" />
      <div className="px-4 md:px-10 lg:px-16 py-12 space-y-14">
        {[1, 2, 3].map((row) => (
          <div key={row}>
            <div className="h-8 w-56 bg-white/10 mb-6 rounded-lg" />

            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="w-[180px] md:w-[240px] h-[280px] md:h-[340px] bg-white/10 rounded-2xl"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}