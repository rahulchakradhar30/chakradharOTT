export default function MovieLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="h-[70vh] md:h-[84vh] rounded-b-[2.5rem] bg-white/8" />

      <div className="px-4 md:px-10 lg:px-16 py-12 space-y-10">
        <div className="aspect-video bg-white/10 rounded-3xl" />
        <div className="h-28 bg-white/10 rounded-3xl" />
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2 h-64 bg-white/10 rounded-3xl" />
          <div className="h-64 bg-white/10 rounded-3xl" />
        </div>
        <div className="h-40 bg-white/10 rounded-3xl" />
      </div>
    </div>
  );
}