import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { useGuard } from '../context/GuardContext';
import { useToast } from '../components/common/ToastProvider';
import ExchangeConnectionPanel from '../components/dashboard/ExchangeConnectionPanel';
import { exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';
import PageHead from '../components/dashboard/shell/PageHead';

/**
 * Connect key — the single exchange API key flow for the selected account.
 * The panel itself is the existing, working connect/verify component; this
 * page frames it with the one thing people get wrong: scope.
 */
export default function ConnectKeyPage() {
  const { session } = useAuth();
  const { selectedAccount, refreshTradingAccounts } = useTradingAccounts();
  const { selected, refresh } = useGuard();
  const toast = useToast();

  if (!selectedAccount) {
    return (
      <>
        <PageHead title="Connect key" sub="Choose an account first." />
        <div className="dsh-card" style={{ padding: 22 }}>
          <p className="dsh-body">There is no account to connect a key to yet.</p>
          <Link to="/dashboard/account/trading" className="dsh-btn dsh-btn--primary" style={{ marginTop: 14 }}>Add an account</Link>
        </div>
      </>
    );
  }

  const isExchange = exchangeFromBrokerSlug(selectedAccount.propFirmSlug) !== null;
  const readOnly = selected.connection && selected.connection.enforcementCapable === false;

  return (
    <>
      <PageHead
        title="Connect key"
        sub={`One exchange API key for ${selectedAccount.name}. Trading scope, never withdrawal.`}
      />

      <div className="dsh-card" style={{ padding: 22, marginBottom: 16 }}>
        <h2 className="dsh-h2" style={{ marginBottom: 8 }}>Why scope matters</h2>
        <p className="dsh-body">
          A read-only key connects fine and looks healthy forever while enforcing nothing. We check the
          scope the moment you connect and say so plainly: <strong>Tick Trading. Never tick Withdrawal.</strong>{' '}
          A trading key can cancel orders and close positions; it cannot move funds. Your money stays with Delta.
        </p>
        {readOnly && (
          <p className="dsh-body" style={{ marginTop: 10, color: 'var(--amber)' }}>
            The key on this account is read-only. Replace it with a trading-scope key and the engine starts enforcing on the next fill.
          </p>
        )}
      </div>

      {isExchange ? (
        <div className="dsh-card" style={{ padding: 22 }}>
          <ExchangeConnectionPanel
            account={selectedAccount}
            accessToken={session?.access_token}
            toast={{
              ...toast,
              success: (...a) => { toast.success(...a); refreshTradingAccounts?.(); refresh(); },
            }}
          />
        </div>
      ) : (
        <div className="dsh-card" style={{ padding: 22 }}>
          <p className="dsh-body">This account has no venue yet. Pick Delta Exchange on the Accounts page, then come back to connect the key.</p>
          <Link to="/dashboard/account/trading" className="dsh-btn dsh-btn--primary" style={{ marginTop: 14 }}>Finish setup</Link>
        </div>
      )}
    </>
  );
}
