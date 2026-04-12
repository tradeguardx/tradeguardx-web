import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { fetchTradingAccounts } from '../api/tradingAccountsApi';

export const LS_TRADING_ACCOUNT = 'tgx_trading_account_id';

const TradingAccountContext = createContext(null);

export function TradingAccountProvider({ children }) {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedTradingAccountId, setSelectedTradingAccountIdState] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');

  const refreshTradingAccounts = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setAccounts([]);
      setSelectedTradingAccountIdState('');
      setAccountsLoading(false);
      setAccountsError('');
      return;
    }
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const list = await fetchTradingAccounts({ accessToken: token });
      const arr = Array.isArray(list) ? list : [];
      setAccounts(arr);
      setSelectedTradingAccountIdState((prev) => {
        if (prev && arr.some((a) => a.id === prev)) return prev;
        const stored =
          typeof localStorage !== 'undefined' ? localStorage.getItem(LS_TRADING_ACCOUNT) : '';
        const first = arr[0]?.id;
        const pick =
          (stored && arr.some((a) => a.id === stored) ? stored : null) || first || '';
        if (pick && typeof localStorage !== 'undefined') {
          localStorage.setItem(LS_TRADING_ACCOUNT, pick);
        }
        return pick;
      });
    } catch (e) {
      setAccountsError(e?.message || 'Could not load trading accounts');
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    refreshTradingAccounts();
  }, [refreshTradingAccounts]);

  const setSelectedTradingAccountId = useCallback((id) => {
    setSelectedTradingAccountIdState(id);
    if (typeof localStorage !== 'undefined') {
      if (id) localStorage.setItem(LS_TRADING_ACCOUNT, id);
      else localStorage.removeItem(LS_TRADING_ACCOUNT);
    }
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedTradingAccountId) ?? null,
    [accounts, selectedTradingAccountId],
  );

  const value = useMemo(
    () => ({
      accounts,
      accountsLoading,
      accountsError,
      selectedTradingAccountId,
      setSelectedTradingAccountId,
      selectedAccount,
      refreshTradingAccounts,
    }),
    [
      accounts,
      accountsLoading,
      accountsError,
      selectedTradingAccountId,
      setSelectedTradingAccountId,
      selectedAccount,
      refreshTradingAccounts,
    ],
  );

  return (
    <TradingAccountContext.Provider value={value}>{children}</TradingAccountContext.Provider>
  );
}

export function useTradingAccounts() {
  const ctx = useContext(TradingAccountContext);
  if (!ctx) {
    throw new Error('useTradingAccounts must be used within TradingAccountProvider');
  }
  return ctx;
}
