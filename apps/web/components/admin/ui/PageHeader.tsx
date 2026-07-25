import { Plus } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  extra?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action, onAction, extra }: Props) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {action && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] text-white text-sm font-medium rounded-xl hover:bg-[#0E7C86] transition"
          >
            <Plus size={16} />
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
