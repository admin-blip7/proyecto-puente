import { HelpVideo } from '@/types/help';

export function VideoPlayer({ video }: { video: HelpVideo }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">Tutorial en video</h3>
        <span className="text-xs text-slate-500">Duración: {video.duration}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black/90">
        <iframe
          className="h-64 w-full md:h-80"
          src={video.url}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {video.transcript ? <p className="text-sm text-slate-600">Transcripción: {video.transcript}</p> : null}
      {video.downloadableUrl && video.downloadableLabel ? (
        <a className="text-sm font-medium text-blue-600 hover:underline" href={video.downloadableUrl}>
          Descargar: {video.downloadableLabel}
        </a>
      ) : null}
    </section>
  );
}
