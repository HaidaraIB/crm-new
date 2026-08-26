import { useCallback, useRef, useState } from 'react';

type ReasonAwareStatus = {
    id: number;
    name?: string;
    requires_change_reason?: boolean;
    requiresChangeReason?: boolean;
};

/** True when settings flag this status as needing a written reason to move into it. */
export const statusRequiresChangeReason = (
    status: ReasonAwareStatus | null | undefined
): boolean =>
    Boolean(
        (status as any)?.requires_change_reason ?? (status as any)?.requiresChangeReason
    );

type PendingChange = {
    statusName?: string;
    apply: (reason?: string) => void | Promise<void>;
};

/**
 * Gates a lead status change behind the reason prompt when the target status
 * requires one, and runs it straight through when it does not.
 *
 * Callers own the actual mutation — pass it as `apply`, which receives the
 * entered reason (or `undefined` when no reason was needed):
 *
 *     const { requestStatusChange, reasonModalProps } = useStatusChangeReason(statuses);
 *     requestStatusChange(newStatusId, (reason) =>
 *         patchLead({ id, data: { status: newStatusId, status_change_reason: reason } })
 *     );
 *
 * Render `<StatusChangeReasonModal {...reasonModalProps} />` once in the host page.
 */
export const useStatusChangeReason = (statuses: ReasonAwareStatus[] | undefined) => {
    const [pending, setPending] = useState<PendingChange | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Guards against a second confirm while the first is still in flight.
    const submittingRef = useRef(false);

    const requestStatusChange = useCallback(
        (statusId: number, apply: (reason?: string) => void | Promise<void>) => {
            const target = (statuses || []).find((s) => s.id === statusId);
            if (!statusRequiresChangeReason(target)) {
                void apply(undefined);
                return;
            }
            setPending({ statusName: target?.name, apply });
        },
        [statuses]
    );

    const handleCancel = useCallback(() => {
        if (submittingRef.current) return;
        setPending(null);
    }, []);

    const handleConfirm = useCallback(
        async (reason: string) => {
            if (!pending || submittingRef.current) return;
            submittingRef.current = true;
            setIsSubmitting(true);
            try {
                await pending.apply(reason);
                setPending(null);
            } finally {
                submittingRef.current = false;
                setIsSubmitting(false);
            }
        },
        [pending]
    );

    return {
        requestStatusChange,
        reasonModalProps: {
            isOpen: pending !== null,
            statusName: pending?.statusName,
            isSubmitting,
            onCancel: handleCancel,
            onConfirm: handleConfirm,
        },
    };
};
