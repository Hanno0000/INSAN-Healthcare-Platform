import NewsEditorClient from '../../NewsEditorClient';

export default function EditNewsPage({ params }: { params: { id: string } }) {
  return <NewsEditorClient editingId={params.id} />;
}
