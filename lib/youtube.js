export function normalizeYouTubeEmbed(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url.trim());

    if (parsed.hostname.includes("youtube.com") && parsed.pathname.startsWith("/embed/")) {
      return url.trim();
    }

    let videoId = "";

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "").split("?")[0];
    } else if (parsed.searchParams.get("v")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.includes("/shorts/")) {
      videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0];
    }

    if (!videoId) return url.trim();

    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return url.trim();
  }
}
