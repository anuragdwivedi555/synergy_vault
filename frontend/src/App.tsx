import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AnimatePresence, motion } from 'framer-motion';

import { useWallet } from './hooks/useWallet';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';

type Page = 'landing' | 'dashboard';

function App() {
  const [page, setPage] = useState<Page>('landing');
  const wallet = useWallet();

  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Navbar
        wallet={wallet}
        currentPage={page}
        onNavigate={navigate}
      />

      <AnimatePresence mode="wait">
        {page === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LandingPage
              onLaunch={() => navigate('dashboard')}
              onConnect={wallet.connect}
              isConnected={wallet.isConnected}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard
              address={wallet.address}
              chainId={wallet.chainId}
              isConnected={wallet.isConnected}
              signer={wallet.signer}
              provider={wallet.provider}
              onConnectWallet={wallet.connect}
              isWrongNetwork={wallet.isWrongNetwork}
              switchToMumbai={wallet.switchToMumbai}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: 'var(--clr-bg-secondary)',
          border: '1px solid var(--clr-border)',
          color: 'var(--clr-text-primary)',
          fontFamily: 'var(--font-body)',
          borderRadius: 'var(--radius-md)',
        }}
      />
    </>
  );
}

export default App;
