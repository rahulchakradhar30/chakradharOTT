export default function Head() {
  const title = "Accessibility | Chakradhar Stream";
  const description = "Accessibility guidance and platform features for Chakradhar Stream viewers.";
  const canonical = "https://chakradharstream.vercel.app/accessibility";

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
