import { useAppContext } from '../../context/AppContext';
import { useDisconnectConnectedAccount } from '../useQueries';
import { resolveLocalizedApiError } from '../../services/api';

export function useConfirmDisconnect(onDone?: () => void) {
  const { t, showToast, setConfirmDeleteConfig, setIsConfirmDeleteModalOpen } = useAppContext();
  const disconnect = useDisconnectConnectedAccount();
  return (account: { id: number; name: string }) => {
    setConfirmDeleteConfig({
      title: t('disconnect'),
      message: t('confirmDisconnectAccount'),
      itemName: account.name,
      onConfirm: async () => {
        try {
          await disconnect.mutateAsync(account.id);
          onDone?.();
          showToast(t('disconnected'), { variant: 'success' });
        } catch (error: unknown) {
          showToast(resolveLocalizedApiError(error as { message?: string }, t, t('errorDeletingAccount')), {
            variant: 'error',
          });
        }
      },
    });
    setIsConfirmDeleteModalOpen(true);
  };
}
