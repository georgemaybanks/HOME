interface ParcelsBoardProps {
  url: string | null;
}

export const ParcelsBoard = ({ url }: ParcelsBoardProps) => {
  if (!url) {
    return (
      <section className="flex min-h-0 flex-1 items-center rounded-md border border-line bg-white px-4 py-6" aria-label="Parcels">
        <p className="text-base text-muted">Set PARCELS_URL in the Home dashboard .env, then restart the dashboard.</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1" aria-label="Parcels">
      <iframe className="min-h-0 w-full flex-1 rounded-md border border-line bg-white" src={url} title="Parcels" />
    </section>
  );
};
