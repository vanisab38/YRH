// §2 categories.colour / §3: "category (dropdown, special ones showing
// their colour badge)". A plain <select> can't paint its own options, so
// this badge is what actually carries the colour — used next to the picker
// and on work order cards/detail.
export function CategoryBadge({
  name,
  colour,
  isSpecial,
}: {
  name: string;
  colour: string | null;
  isSpecial: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={
        isSpecial && colour
          ? { borderColor: colour, color: colour, backgroundColor: `${colour}1a` }
          : { borderColor: '#d4d4d8', color: '#52525b' }
      }
    >
      {isSpecial && colour && (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colour }} />
      )}
      {name}
    </span>
  );
}
