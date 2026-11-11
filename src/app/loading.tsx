export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-2/3 rounded-xl" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[4/5] rounded-2xl" />
            <div className="skeleton mt-3 h-4 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
