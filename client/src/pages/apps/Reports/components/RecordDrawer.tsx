import React, { useEffect } from 'react';
import { IRecordDrawerState } from '@/interface';
import {
  formatCurrencyInr,
  formatDateDisplay,
  formatDateTimeDisplay,
} from '../reportHelpers';

interface RecordDrawerProps {
  drawerState: IRecordDrawerState;
  onClose: () => void;
  onOpenRecord?: (type: 'lead' | 'activity' | 'quote', id: number) => void;
}

export const RecordDrawer: React.FC<RecordDrawerProps> = ({
  drawerState,
  onClose,
  onOpenRecord,
}) => {
  const { isOpen, recordType, recordId, data } = drawerState;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return (
    <>
      {/* Backdrop Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl p-5 overflow-y-auto flex flex-col justify-between text-xs"
        role="dialog"
        aria-label="Record Details"
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold tracking-wider text-[#0e90d9]">
                  {recordType === 'lead'
                    ? 'Lead'
                    : recordType === 'activity'
                    ? 'Activity'
                    : 'Quote'}
                </span>
                <span className="text-xs text-gray-400">
                  {recordType === 'quote' ? `Q-${recordId}` : `#${recordId}`}
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white leading-snug">
                {drawerState.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Close drawer"
            >
              <i className="mgc_close_line text-lg" />
            </button>
          </div>

          {/* Body: Record Specific Details */}
          {recordType === 'lead' && (
            <div className="py-4 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                    data.outcome === 'won'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : data.outcome === 'lost'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}
                >
                  {data.stage_name || 'Stage'}
                </span>
                {data.is_overdue && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                    Overdue
                  </span>
                )}
              </div>

              {/* Attributes Key-Values */}
              <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Lead ID:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">#{data.id}</span>

                <span className="text-gray-500 dark:text-gray-400">Person:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.person_name || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Organization:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {data.organization_name || '—'}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Lead Owner:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.owner_name}</span>

                <span className="text-gray-500 dark:text-gray-400">Source:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {data.source_name || 'Not specified'}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.type_name || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Pipeline:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {data.pipeline_name || 'Default Pipeline'}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Lead Value:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrencyInr(data.lead_value)}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Expected Close:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateDisplay(data.expected_close_date)}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateDisplay(data.created_at)}
                </span>

                {data.closed_at && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Closed:</span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {formatDateDisplay(data.closed_at)}
                    </span>
                  </>
                )}

                {data.lost_reason && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Lost Reason:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                      {data.lost_reason}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {recordType === 'activity' && (
            <div className="py-4 space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                    data.computed_status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : data.computed_status === 'Overdue'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}
                >
                  {data.computed_status}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  {data.type}
                </span>
              </div>

              {/* Attributes Key-Values */}
              <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Activity ID:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">#{data.id}</span>

                {data.lead_id && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Lead:</span>
                    <button
                      type="button"
                      onClick={() => onOpenRecord && onOpenRecord('lead', data.lead_id)}
                      className="text-left text-[#0e90d9] hover:underline font-medium truncate"
                    >
                      #{data.lead_id} {data.lead_title || ''}
                    </button>
                  </>
                )}

                <span className="text-gray-500 dark:text-gray-400">Person:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.person_name || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Assigned To:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.user_name}</span>

                <span className="text-gray-500 dark:text-gray-400">Starts:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateTimeDisplay(data.schedule_from)}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Ends:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateTimeDisplay(data.schedule_to)}
                </span>

                {data.completed_at && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Completed At:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {formatDateTimeDisplay(data.completed_at)}
                    </span>
                  </>
                )}

                <span className="text-gray-500 dark:text-gray-400">Location:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.location || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Comments:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.comment || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateDisplay(data.created_at)}
                </span>
              </div>
            </div>
          )}

          {recordType === 'quote' && (
            <div className="py-4 space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                    data.quote_status === 'Accepted'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : data.quote_status === 'Rejected'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                  }`}
                >
                  {data.quote_status}
                </span>
                {data.is_expired && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                    Expired
                  </span>
                )}
                {data.is_expiring_soon && !data.is_expired && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                    Expiring Soon
                  </span>
                )}
              </div>

              {/* Attributes Key-Values */}
              <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Quote ID:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">Q-{data.id}</span>

                {data.lead_id && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">Lead:</span>
                    <button
                      type="button"
                      onClick={() => onOpenRecord && onOpenRecord('lead', data.lead_id)}
                      className="text-left text-[#0e90d9] hover:underline font-medium truncate"
                    >
                      #{data.lead_id} {data.lead_title || ''}
                    </button>
                  </>
                )}

                <span className="text-gray-500 dark:text-gray-400">Person:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.person_name || '—'}</span>

                <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                <span className="text-gray-800 dark:text-gray-200">{data.owner_name}</span>

                <span className="text-gray-500 dark:text-gray-400">Created:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateDisplay(data.created_at)}
                </span>

                <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDateDisplay(data.expired_at)}
                </span>
              </div>

              {/* Totals Summary */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrencyInr(data.sub_total)}
                  </span>
                </div>
                {Number(data.discount_amount) > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Discount:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                      -{formatCurrencyInr(data.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Tax:</span>
                  <span className="tabular-nums font-semibold">
                    {formatCurrencyInr(data.tax_amount)}
                  </span>
                </div>
                {Number(data.adjustment_amount) !== 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Adjustment:</span>
                    <span className="tabular-nums font-semibold">
                      {formatCurrencyInr(data.adjustment_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span>Grand Total:</span>
                  <span className="text-[#0e90d9] tabular-nums">
                    {formatCurrencyInr(data.grand_total)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
};
