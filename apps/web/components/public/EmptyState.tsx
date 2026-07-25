interface Props {
  title?: string;
  description?: string;
  icon?: string;
}

export default function EmptyState({
  title = 'لا توجد نتائج',
  description = 'لم يتم العثور على أي بيانات حالياً.',
  icon = '🔍',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm">{description}</p>
    </div>
  );
}
