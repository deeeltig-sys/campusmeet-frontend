import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CollectionsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import PostGrid from '../components/PostGrid';

export default function CollectionDetail() {
  const { collectionId } = useParams();
  const [title, setTitle] = useState(collectionId === 'none' ? 'All Saved' : 'Collection');

  useEffect(() => {
    if (collectionId === 'none') return;
    CollectionsAPI.list()
      .then((list) => {
        const found = list.find((c) => c.id === collectionId);
        if (found) setTitle(found.title);
      })
      .catch(() => {});
  }, [collectionId]);

  return (
    <div className="screen">
      <BackHeader fallback="/collections" eyebrow="Saved" title={title} />
      <PostGrid mode="saved" collectionId={collectionId === 'none' ? undefined : collectionId} />
    </div>
  );
}
