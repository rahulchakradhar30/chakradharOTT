export default function Head() {
  const title = "Pricing | Chakradhar Stream";
  const description = "View pricing plans and premium access options on Chakradhar Stream.";
  const canonical = "https://chakradharstream.vercel.app/pricing";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content="https://chakradharstream.vercel.app/homepage-banner.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://chakradharstream.vercel.app/homepage-banner.jpg" />
    </>
  );
}
