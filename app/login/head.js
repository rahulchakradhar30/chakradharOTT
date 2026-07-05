export default function Head() {
  const title = "Login | Chakradhar Stream";
  const canonical = "https://chakradharstream.vercel.app/login";

  return (
    <>
      <title>{title}</title>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow, noarchive" />
      <link rel="canonical" href={canonical} />
    </>
  );
}
