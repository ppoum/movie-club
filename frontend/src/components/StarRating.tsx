/**
 * Generate an SVG representing the provided rating in star notation. `rating` must be a value between 0 and 10.
 * If `rating` is null, then a default rating of 0 is used.
 */
export default function StarRating({
  rating,
  size,
  color = "var(--star-gold-color)",
}: {
  rating: number | null;
  size: number;
  color?: string;
}) {
  if (rating === null) rating = 0;
  if (rating < 0 || rating > 10) {
    return <span>Invalid rating</span>;
  }

  const fullStarCnt = Math.floor(rating / 2);
  const hasHalfStar = Math.round(rating) % 2 >= 1;
  const emptyStarCnt = 5 - fullStarCnt - (hasHalfStar ? 1 : 0);

  const stars = [];
  const fullStars = Array(fullStarCnt).fill(
    <svg id="U2605" width={size} height={size} viewBox="0 0 960 1000">
      <path
        transform="translate(0, 900) scale(1,-1)"
        d="M480 186L202-17L309 301L51 474L367 474L480 815L595 474L909 474L651 301L760-17L480 186Z"
        fill={color}
      ></path>
    </svg>,
  );
  stars.push(...fullStars);

  if (hasHalfStar) {
    stars.push(
      <svg id="U2BEA" width={size} height={size} viewBox="0 0 947 1000">
        <path
          transform="translate(0, 900) scale(1,-1)"
          d="M479 186L202-17L309 301L51 474L367 474L479 813L593 472L896 472L644 301L758-15L479 186ZM806 443L574 443L479 738L479 222L701 58L612 312L806 443Z"
          fill={color}
        ></path>
      </svg>,
    );
  }

  const emptyStars = Array(emptyStarCnt).fill(
    <svg id="U2606" width={size} height={size} viewBox="0 0 1034 1000">
      <path
        transform="translate(0, 900) scale(1,-1)"
        d="M517 174L214-48L331 298L51 484L392 484L517 856L642 484L983 484L703 298L818-48L517 174ZM403 321L324 103L517 249L710 103L631 321L807 435L596 435L517 676L437 435L225 435L403 321Z"
        fill={color}
      ></path>
    </svg>,
  );
  stars.push(...emptyStars);

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {stars}
    </span>
  );
}
