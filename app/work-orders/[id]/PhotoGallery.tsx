type Photo = { id: string; url: string; filename: string };

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed
              Supabase URLs expire and are per-request; not worth Next/Image's
              remote-pattern config for an internal tool's thumbnail grid. */}
          <img
            src={photo.url}
            alt={photo.filename}
            className="aspect-square w-full rounded-lg object-cover"
          />
        </a>
      ))}
    </div>
  );
}
