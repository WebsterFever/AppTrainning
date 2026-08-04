export type VideoEmbed = { kind: 'youtube' | 'vimeo' | 'file'; src: string };

export function getVideoEmbed(url: string): VideoEmbed | null {
  if (!url) return null;

  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtubeMatch) {
    return { kind: 'youtube', src: `https://www.youtube.com/embed/${youtubeMatch[1]}` };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return { kind: 'file', src: url };
  }

  return null;
}
