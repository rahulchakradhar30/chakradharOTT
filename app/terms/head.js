export default function Head() {
  const title = "Terms of Service | Chakradhar Stream";
  const description = "Read the terms of service for Chakradhar Stream.";
  const canonical = "https://chakradharstream.vercel.app/terms";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
