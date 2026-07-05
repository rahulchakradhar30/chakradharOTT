export default function Head() {
  const title = "Privacy Policy | Chakradhar Stream";
  const description = "Read the privacy policy for Chakradhar Stream.";
  const canonical = "https://chakradharstream.vercel.app/privacy";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
