import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ClassItem } from '../lib/api';
import RegisterModal from '../components/RegisterModal';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ClassDetailSkeleton } from '../components/Skeletons';
import { getVideoEmbed } from '../lib/video';

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ClassItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (id)
      api
        .getClass(id)
        .then(setItem)
        .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-chalk flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="font-display text-2xl text-ink">Class not found.</p>
            <Link to="/" className="text-amber font-semibold mt-3 inline-block">
              ← Back to all classes
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-chalk flex flex-col">
        <Header />
        <ClassDetailSkeleton />
        <Footer />
      </div>
    );
  }

  const date = new Date(item.classDate);
  const videoEmbed = item.videoUrl ? getVideoEmbed(item.videoUrl) : null;

  return (
    <div className="min-h-screen bg-chalk flex flex-col">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1 animate-fade-in">
        <Link to="/" className="text-xs font-mono text-ink/50 hover:text-ink">
          ← All classes
        </Link>

        {videoEmbed ? (
          videoEmbed.kind === 'file' ? (
            <video
              src={videoEmbed.src}
              controls
              className="w-full h-56 sm:h-72 object-cover rounded-sm border border-line mt-4 bg-black"
            />
          ) : (
            <div className="w-full aspect-video rounded-sm border border-line mt-4 overflow-hidden bg-black">
              <iframe
                src={videoEmbed.src}
                title={`${item.title} — marketing video`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-56 sm:h-72 object-cover rounded-sm border border-line mt-4"
          />
        )}

        <div className="flex items-center gap-3 mt-6 flex-wrap">
          <span className="badge bg-ink text-chalk">
            {date.toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </span>
          <span className="font-mono text-xs text-ink/60">
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
          {item.isPast && <span className="badge bg-sage text-chalk">PAST</span>}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-ink mt-4">
          {item.title}
        </h1>
        <p className="text-ink/70 mt-4 leading-relaxed whitespace-pre-line">{item.description}</p>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-line pt-6">
          <span className="font-mono text-sm text-ink/60 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
            {item.registrationCount} people registered
          </span>
          {!item.isPast && (
            <button onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto">
              Register — get the Zoom link
            </button>
          )}
        </div>

        {item.registeredNames && item.registeredNames.length > 0 && (
          <div className="mt-6">
            <p className="font-mono text-xs tracking-widest text-ink/40 uppercase mb-2">
              Who's registered
            </p>
            <div className="flex flex-wrap gap-2">
              {item.registeredNames.map((name, i) => (
                <span
                  key={i}
                  className="badge bg-surface border border-line text-ink/70 normal-case tracking-normal"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />

      {showModal && (
        <RegisterModal
          classId={item.id}
          className={item.title}
          onClose={() => setShowModal(false)}
          onRegistered={(count, name) =>
            setItem({
              ...item,
              registrationCount: count,
              registeredNames: [...(item.registeredNames ?? []), name],
            })
          }
        />
      )}
    </div>
  );
}
