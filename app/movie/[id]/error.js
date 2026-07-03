"use client";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="glass-card rounded-[2rem] px-8 py-7 text-center max-w-md w-full">
        <h2 className="text-2xl font-semibold">Something went wrong.</h2>
        <p className="text-sm text-gray-300 mt-2">{error?.message || "Please retry this page."}</p>
        <button onClick={() => reset()} className="admin-button admin-button-primary mt-5">
          Try Again
        </button>
      </div>
    </div>
  );
}